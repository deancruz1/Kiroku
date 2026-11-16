import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import notFoundBody from "@/lib/fixtures/tenrai/not-found-99999999.json";
import malNotFoundBody from "@/lib/fixtures/mal/error-not-found.json";
import { applyJikanPolicy } from "@/lib/jikan-client";
import { createRateScheduler, type RateLimit } from "@/lib/rate-scheduler";
import { createBreaker, createPathCounter } from "@/lib/source-breaker";
import {
  BREAKER_COOLDOWN_MS,
  MAL_CONFIG_PAUSE_MS,
  PROBE_TIMEOUT_MS,
  UpstreamShapeError,
  WEAK_FAILURE_PATHS,
  WEAK_FAILURE_WINDOW_MS,
  applySourceBreaker,
  isTenraiOutage,
} from "@/lib/show-source";

const CLIENT_ID = "test-client-id-0000";

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function response(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return { data, status, statusText: "", headers: {}, config };
}

function refused(): Handler {
  return (config) =>
    Promise.reject(new AxiosError("connect ECONNREFUSED", "ECONNREFUSED", config));
}

function failWith(status: number, data: unknown = { message: "error" }): Handler {
  return (config) =>
    Promise.reject(
      new AxiosError(
        "failed",
        status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST",
        config,
        null,
        response(config, status, data),
      ),
    );
}

const ok: Handler = (config) => Promise.resolve(response(config, 200, { data: [] }));

function makeTenrai(
  first: Handler,
  { active = true, limits = [{ max: 1000, windowMs: 1000 }] }: { active?: boolean; limits?: RateLimit[] } = {},
) {
  let clock = 1_000_000;
  const now = () => clock;
  const scheduler = createRateScheduler({ limits, now });
  let handler = first;
  const calls: InternalAxiosRequestConfig[] = [];
  const onOpen = vi.fn();
  const onClose = vi.fn();
  const breaker = createBreaker({
    cooldownMs: BREAKER_COOLDOWN_MS,
    probeLeaseMs: 30_000,
    now,
    onOpen,
    onClose,
  });
  const instance = axios.create({
    baseURL: "https://tenrai.test/v1",
    adapter: (config) => {
      calls.push(config);
      return handler(config);
    },
  });
  applyJikanPolicy(instance, {
    scheduler,
    now,
    sleep: async () => {},
  });
  const weak = createPathCounter({ windowMs: WEAK_FAILURE_WINDOW_MS, paths: WEAK_FAILURE_PATHS, now });
  applySourceBreaker(instance, { breaker, weak, now, isActive: () => active });
  return {
    instance,
    breaker,
    scheduler,
    calls,
    onOpen,
    onClose,
    use: (next: Handler) => {
      handler = next;
    },
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

function caught(request: Promise<unknown>) {
  return request.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (error) => error,
  );
}

describe("applySourceBreaker", () => {
  it("opens on a refused connection and names the request without its query", async () => {
    const t = makeTenrai(refused());
    const error = await caught(t.instance.get("/anime", { params: { q: "secret search", page: 1 } }));

    expect(error.code).toBe("ECONNREFUSED");
    expect(t.breaker.isOpen).toBe(true);
    expect(t.onOpen).toHaveBeenCalledTimes(1);
    expect(t.onOpen).toHaveBeenCalledWith("ECONNREFUSED on GET /v1/anime");
  });

  it("does not open when our own queue runs out of time before Tenrai is asked", async () => {
    const t = makeTenrai(ok, { limits: [{ max: 1, windowMs: 60_000 }] });
    await t.instance.get("/anime/1/full");

    const error = await caught(t.instance.get("/anime/2/full"));
    expect(error.code).toBe("ERR_JIKAN_BUDGET");
    expect(t.calls).toHaveLength(1);
    expect(t.breaker.isOpen).toBe(false);
    expect(t.onOpen).not.toHaveBeenCalled();
    expect(isTenraiOutage(error)).toBe(false);
  });

  it("opens when the budget runs out after real timeouts", async () => {
    const t = makeTenrai(
      (config) => Promise.reject(new AxiosError("timeout of 4000ms exceeded", "ECONNABORTED", config)),
      { limits: [{ max: 1, windowMs: 60_000 }] },
    );

    const error = await caught(t.instance.get("/anime/1/full"));
    expect(error.code).toBe("ERR_JIKAN_BUDGET");
    expect(t.calls).toHaveLength(1);
    expect(t.breaker.isOpen).toBe(true);
    expect(t.onOpen).toHaveBeenCalledWith("ERR_JIKAN_BUDGET on GET /v1/anime/1/full");
    expect(isTenraiOutage(error)).toBe(true);
  });

  it("does not count a probe stuck in our own queue as a failed probe", async () => {
    const t = makeTenrai(refused());
    await caught(t.instance.get("/anime/1/full"));
    t.advance(BREAKER_COOLDOWN_MS);
    t.use(ok);
    t.scheduler.pause(20_000);

    const error = await caught(t.instance.get("/anime/1/full"));
    expect(error.code).toBe("ERR_JIKAN_BUDGET");
    expect(t.calls).toHaveLength(1);
    expect(t.breaker.isOpen).toBe(true);
    // The cooldown was not restarted and the probe slot is free again.
    expect(t.breaker.admit()).toBe("probe");
  });

  it("does not open on one 500", async () => {
    const t = makeTenrai(failWith(500));
    await caught(t.instance.get("/anime/1/reviews"));
    expect(t.breaker.isOpen).toBe(false);
  });

  it("does not open on a 503 on one path, even after retries", async () => {
    const t = makeTenrai(failWith(503));
    await caught(t.instance.get("/anime/1/full"));
    expect(t.calls).toHaveLength(3);
    expect(t.breaker.isOpen).toBe(false);
  });

  it("does not open when the same path fails five times", async () => {
    const t = makeTenrai(failWith(500));
    for (let i = 0; i < 5; i++) {
      await caught(t.instance.get("/anime/1/reviews", { params: { page: i + 1 } }));
      t.advance(1_000);
    }
    expect(t.breaker.isOpen).toBe(false);
    expect(t.onOpen).not.toHaveBeenCalled();
  });

  it("opens when three different paths fail within a minute", async () => {
    const t = makeTenrai(failWith(500));
    await caught(t.instance.get("/anime/1/reviews"));
    t.advance(20_000);
    await caught(t.instance.get("/anime/2/videos"));
    expect(t.breaker.isOpen).toBe(false);
    t.advance(20_000);
    await caught(t.instance.get("/seasons"));
    expect(t.breaker.isOpen).toBe(true);
    expect(t.onOpen).toHaveBeenCalledWith("HTTP 500 on GET /v1/seasons");
  });

  it("does not open when three paths fail over more than a minute", async () => {
    const t = makeTenrai(failWith(500));
    await caught(t.instance.get("/anime/1/reviews"));
    t.advance(30_000);
    await caught(t.instance.get("/anime/2/videos"));
    t.advance(30_001);
    await caught(t.instance.get("/seasons"));
    expect(t.breaker.isOpen).toBe(false);
  });

  it("clears a path when it answers", async () => {
    const t = makeTenrai(failWith(500));
    await caught(t.instance.get("/anime/1/reviews"));
    await caught(t.instance.get("/anime/2/videos"));
    t.use(ok);
    await t.instance.get("/anime/1/reviews");
    t.use(failWith(500));
    await caught(t.instance.get("/seasons"));
    expect(t.breaker.isOpen).toBe(false);
  });

  it("treats a budget that ran out after 5xx replies as weak", async () => {
    const t = makeTenrai(failWith(503), { limits: [{ max: 1, windowMs: 60_000 }] });
    const error = await caught(t.instance.get("/anime/1/full"));
    expect(error.code).toBe("ERR_JIKAN_BUDGET");
    expect(t.calls).toHaveLength(1);
    expect(t.breaker.isOpen).toBe(false);
  });

  it("restarts the cooldown when a probe gets a weak failure", async () => {
    const t = makeTenrai(refused());
    await caught(t.instance.get("/anime/1/full"));
    t.advance(BREAKER_COOLDOWN_MS);
    t.use(failWith(500));
    await caught(t.instance.get("/anime/1/full"));
    expect(t.breaker.isOpen).toBe(true);
    t.use(ok);
    expect((await caught(t.instance.get("/anime/2/full"))).code).toBe("ERR_TENRAI_SKIPPED");
    t.advance(BREAKER_COOLDOWN_MS);
    await t.instance.get("/anime/2/full");
    expect(t.breaker.isOpen).toBe(false);
  });

  it("opens on a timeout", async () => {
    const t = makeTenrai((config) =>
      Promise.reject(new AxiosError("timeout of 4000ms exceeded", "ECONNABORTED", config)),
    );
    await caught(t.instance.get("/anime/1/full"));
    expect(t.calls).toHaveLength(3);
    expect(t.breaker.isOpen).toBe(true);
  });

  it("does not open on a 404, which is an answer", async () => {
    const t = makeTenrai(failWith(404, notFoundBody));
    const error = await caught(t.instance.get("/anime/99999999/full"));
    expect(error.response.status).toBe(404);
    expect(t.breaker.isOpen).toBe(false);
    expect(t.onOpen).not.toHaveBeenCalled();
  });

  it("opens on a 200 that is not the expected shape", async () => {
    const t = makeTenrai((config) =>
      Promise.resolve(response(config, 200, "<html>parked domain</html>")),
    );
    const error = await caught(t.instance.get("/anime/1/full"));
    expect(error.code).toBe("ERR_TENRAI_SHAPE");
    expect(t.breaker.isOpen).toBe(true);
  });

  it("skips Tenrai without a request while open", async () => {
    const t = makeTenrai(refused());
    await caught(t.instance.get("/anime/1/full"));
    t.use(ok);

    const error = await caught(t.instance.get("/anime/2/full"));
    expect(error.code).toBe("ERR_TENRAI_SKIPPED");
    expect(t.calls).toHaveLength(1);
  });

  it("probes once after the cooldown, with one short attempt", async () => {
    const t = makeTenrai(refused());
    await caught(t.instance.get("/anime/1/full"));
    t.advance(BREAKER_COOLDOWN_MS);
    t.use(failWith(503));

    await caught(t.instance.get("/anime/1/full"));
    expect(t.calls).toHaveLength(2);
    expect(t.calls[1].timeout).toBe(PROBE_TIMEOUT_MS);
    expect(t.breaker.isOpen).toBe(true);

    t.use(ok);
    expect((await caught(t.instance.get("/anime/1/full"))).code).toBe("ERR_TENRAI_SKIPPED");
    t.advance(BREAKER_COOLDOWN_MS);
    await t.instance.get("/anime/1/full");
    expect(t.calls).toHaveLength(3);
    expect(t.breaker.isOpen).toBe(false);
    expect(t.onClose).toHaveBeenCalledTimes(1);
    expect(t.onOpen).toHaveBeenCalledTimes(1);
  });

  it("closes when the probe gets a 404", async () => {
    const t = makeTenrai(refused());
    await caught(t.instance.get("/anime/1/full"));
    t.advance(BREAKER_COOLDOWN_MS);
    t.use(failWith(404, notFoundBody));
    await caught(t.instance.get("/anime/99999999/full"));
    expect(t.breaker.isOpen).toBe(false);
  });

  it("lets only one of many concurrent requests probe", async () => {
    const t = makeTenrai(refused());
    await caught(t.instance.get("/anime/1/full"));
    t.advance(BREAKER_COOLDOWN_MS);
    let finish = () => {};
    t.use(
      (config) =>
        new Promise((resolve) => {
          finish = () => resolve(response(config, 200, { data: [] }));
        }),
    );

    const probe = t.instance.get("/anime/1/full");
    const others = await Promise.all(
      Array.from({ length: 5 }, (_, i) => caught(t.instance.get(`/anime/${i + 2}/full`))),
    );
    expect(others.every((e) => e.code === "ERR_TENRAI_SKIPPED")).toBe(true);
    await vi.waitFor(() => expect(t.calls).toHaveLength(2));
    finish();
    await probe;
    expect(t.breaker.isOpen).toBe(false);
  });

  it("does nothing when MyAnimeList is not the fallback", async () => {
    const t = makeTenrai(refused(), { active: false });
    await caught(t.instance.get("/anime/1/full"));
    t.use(ok);
    await t.instance.get("/anime/1/full");
    expect(t.calls).toHaveLength(2);
    expect(t.onOpen).not.toHaveBeenCalled();
  });
});

describe("isTenraiOutage", () => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

  it("counts failures and not answers", () => {
    expect(isTenraiOutage(new UpstreamShapeError())).toBe(true);
    expect(isTenraiOutage(new AxiosError("x", "ECONNREFUSED", config))).toBe(true);
    expect(isTenraiOutage(new AxiosError("x", "ERR_JIKAN_BUDGET", config))).toBe(false);
    const afterAttempt = { ...config, jikanMeta: { startedAt: 0, attempts: 1 } } as InternalAxiosRequestConfig;
    expect(isTenraiOutage(new AxiosError("x", "ERR_JIKAN_BUDGET", afterAttempt))).toBe(true);
    expect(isTenraiOutage(new AxiosError("x", "ERR_TENRAI_SKIPPED", config))).toBe(true);
    for (const status of [429, 500, 502, 503, 504]) {
      expect(
        isTenraiOutage(
          new AxiosError("x", "ERR_BAD_RESPONSE", config, null, response(config, status, {})),
        ),
      ).toBe(true);
    }
    expect(
      isTenraiOutage(
        new AxiosError("x", "ERR_BAD_REQUEST", config, null, response(config, 404, notFoundBody)),
      ),
    ).toBe(false);
    expect(
      isTenraiOutage(
        new AxiosError("x", "ERR_BAD_REQUEST", config, null, response(config, 400, { status: 400 })),
      ),
    ).toBe(false);
    expect(isTenraiOutage(new Error("At most 25 ids per batch"))).toBe(false);
  });
});

function malError(status: number, data: unknown = malNotFoundBody) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response(config, status, data));
}

const TENRAI_CONFIG = { baseURL: "https://tenrai.test/v1", method: "get" };

function tenraiDown(url = "/anime") {
  const config = { ...TENRAI_CONFIG, url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError("connect ECONNREFUSED", "ECONNREFUSED", config);
}

function tenrai500(url: string) {
  const config = { ...TENRAI_CONFIG, url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError("failed", "ERR_BAD_RESPONSE", config, null, response(config, 500, { status: 500 }));
}

describe("fromSource", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let info: ReturnType<typeof vi.spyOn>;

  async function load(env: { clientId?: string; source?: string }) {
    vi.unstubAllEnvs();
    vi.stubEnv("MAL_CLIENT_ID", env.clientId ?? "");
    vi.stubEnv("SHOW_DATA_SOURCE", env.source ?? "");
    vi.resetModules();
    return import("@/lib/show-source");
  }

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    info = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses only Tenrai, as before, without a Client ID", async () => {
    const { fromSource, sourceMode } = await load({ source: "mal" });
    const mal = vi.fn();
    const error = tenraiDown();

    expect(sourceMode()).toBe("tenrai");
    await expect(fromSource(() => Promise.reject(error), mal)).rejects.toBe(error);
    expect(await fromSource(() => Promise.resolve("tenrai"), mal)).toBe("tenrai");
    expect(mal).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it("reads the mode from SHOW_DATA_SOURCE", async () => {
    expect((await load({ clientId: CLIENT_ID })).sourceMode()).toBe("auto");
    expect((await load({ clientId: CLIENT_ID, source: " MAL " })).sourceMode()).toBe("mal");
    expect((await load({ clientId: CLIENT_ID, source: "tenrai" })).sourceMode()).toBe("tenrai");
    expect((await load({ clientId: CLIENT_ID, source: "other" })).sourceMode()).toBe("auto");
  });

  it("uses only Tenrai while it answers", async () => {
    const { fromSource } = await load({ clientId: CLIENT_ID });
    const mal = vi.fn();
    expect(await fromSource(() => Promise.resolve("tenrai"), mal)).toBe("tenrai");
    expect(mal).not.toHaveBeenCalled();
  });

  it("answers from v2 when Tenrai is down and logs the switch once", async () => {
    const { fromSource, tenraiBreaker } = await load({ clientId: CLIENT_ID });
    const mal = vi.fn().mockResolvedValue("mal");

    expect(await fromSource(() => Promise.reject(tenraiDown()), mal)).toBe("mal");
    expect(await fromSource(() => Promise.reject(tenraiDown()), mal)).toBe("mal");
    expect(tenraiBreaker.isOpen).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe(
      "[show data] Tenrai failed (ECONNREFUSED on GET /v1/anime); using MyAnimeList until Tenrai answers again",
    );
  });

  it("answers one weak failure from v2 without switching or logging", async () => {
    const { fromSource, tenraiBreaker } = await load({ clientId: CLIENT_ID });
    const mal = vi.fn().mockResolvedValue("mal");
    expect(await fromSource(() => Promise.reject(tenrai500("/anime/1/reviews")), mal)).toBe("mal");
    expect(mal).toHaveBeenCalledTimes(1);
    expect(tenraiBreaker.isOpen).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("switches once weak failures reach three paths", async () => {
    const { fromSource, tenraiBreaker } = await load({ clientId: CLIENT_ID });
    const mal = vi.fn().mockResolvedValue("mal");
    for (const url of ["/anime/1/reviews", "/anime/1/reviews", "/anime/2/videos"]) {
      await fromSource(() => Promise.reject(tenrai500(url)), mal);
    }
    expect(tenraiBreaker.isOpen).toBe(false);
    await fromSource(() => Promise.reject(tenrai500("/seasons")), mal);
    expect(tenraiBreaker.isOpen).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("falls back on a Tenrai reply that is not the expected shape", async () => {
    const source = await load({ clientId: CLIENT_ID });
    const mal = vi.fn().mockResolvedValue("mal");
    expect(
      await source.fromSource(() => Promise.reject(new source.UpstreamShapeError()), mal),
    ).toBe("mal");
  });

  it("passes a Tenrai 404 on without asking v2", async () => {
    const { fromSource, tenraiBreaker } = await load({ clientId: CLIENT_ID });
    const mal = vi.fn();
    const notFound = malError(404, notFoundBody);
    await expect(fromSource(() => Promise.reject(notFound), mal)).rejects.toBe(notFound);
    expect(mal).not.toHaveBeenCalled();
    expect(tenraiBreaker.isOpen).toBe(false);
  });

  it("does not fall back or open the breaker when our own queue ran out of time", async () => {
    const { fromSource, tenraiBreaker } = await load({ clientId: CLIENT_ID });
    const mal = vi.fn();
    const queued = new AxiosError("Upstream request queue is longer than the time budget", "ERR_JIKAN_BUDGET", {
      headers: new AxiosHeaders(),
      jikanMeta: { startedAt: 0, attempts: 0 },
    } as InternalAxiosRequestConfig);
    await expect(fromSource(() => Promise.reject(queued), mal)).rejects.toBe(queued);
    expect(mal).not.toHaveBeenCalled();
    expect(tenraiBreaker.isOpen).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("rethrows the Tenrai error when v2 fails too", async () => {
    const { fromSource } = await load({ clientId: CLIENT_ID });
    const error = tenraiDown();
    await expect(
      fromSource(() => Promise.reject(error), () => Promise.reject(malError(503, {}))),
    ).rejects.toBe(error);
  });

  it("passes a v2 404 on, because it is an answer", async () => {
    const { fromSource } = await load({ clientId: CLIENT_ID });
    const notFound = malError(404);
    await expect(
      fromSource(() => Promise.reject(tenraiDown()), () => Promise.reject(notFound)),
    ).rejects.toBe(notFound);
  });

  it("never calls Tenrai when forced to v2", async () => {
    const { fromSource } = await load({ clientId: CLIENT_ID, source: "mal" });
    const tenrai = vi.fn();
    expect(await fromSource(tenrai, () => Promise.resolve("mal"))).toBe("mal");
    expect(tenrai).not.toHaveBeenCalled();
  });

  it("never calls v2 when forced to Tenrai", async () => {
    const { fromSource } = await load({ clientId: CLIENT_ID, source: "tenrai" });
    const mal = vi.fn();
    const error = tenraiDown();
    await expect(fromSource(() => Promise.reject(error), mal)).rejects.toBe(error);
    expect(mal).not.toHaveBeenCalled();
  });

  it("stops asking v2 for a while after it rejects the Client ID", async () => {
    vi.useFakeTimers();
    const { fromSource } = await load({ clientId: CLIENT_ID, source: "mal" });
    const mal = vi
      .fn()
      .mockRejectedValueOnce(malError(400, { message: "Invalid client id", error: "invalid_request" }))
      .mockResolvedValue("mal");

    await expect(fromSource(vi.fn(), mal)).rejects.toThrow();
    const { MalConfigError: ConfigError } = await import("@/lib/mal-client");
    await expect(fromSource(vi.fn(), mal)).rejects.toBeInstanceOf(ConfigError);
    expect(mal).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).not.toContain(CLIENT_ID);

    vi.advanceTimersByTime(MAL_CONFIG_PAUSE_MS);
    expect(await fromSource(vi.fn(), mal)).toBe("mal");
  });

  it("asks for fewer shows per refresh while v2 is in use", async () => {
    let source = await load({ clientId: CLIENT_ID });
    expect(source.showBatchBudget(25)).toBe(25);
    await source.fromSource(() => Promise.reject(tenraiDown()), () => Promise.resolve(null));
    expect(source.showBatchBudget(25)).toBe(6);

    source = await load({ clientId: CLIENT_ID, source: "mal" });
    expect(source.showBatchBudget(25)).toBe(6);
    expect(source.showBatchBudget(3)).toBe(3);

    source = await load({});
    expect(source.showBatchBudget(25)).toBe(25);
  });
});
