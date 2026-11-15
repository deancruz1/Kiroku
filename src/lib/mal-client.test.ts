import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import notFoundBody from "@/lib/fixtures/mal/error-not-found.json";
import invalidClientBody from "@/lib/fixtures/mal/error-invalid-client-id.json";
import forbiddenBody from "@/lib/fixtures/mal/error-no-client-id.json";
import invalidQBody from "@/lib/fixtures/mal/error-invalid-q.json";
import { MalConfigError, applyMalPolicy, classifyMalError } from "@/lib/mal-client";
import { MalShapeError } from "@/lib/mal-shape";
import { createRateScheduler } from "@/lib/rate-scheduler";
import { MAL_BLOCK_COOLDOWN_MS, MAL_LIMITS } from "@/lib/upstream";

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

const CLIENT_ID = "test-client-id-0000";

function makeClient(handler: Handler, clientId: string | null = CLIENT_ID) {
  const calls: { at: number; header: unknown }[] = [];
  const instance = axios.create({
    baseURL: "https://mal.test",
    adapter: (config) => {
      calls.push({ at: Date.now(), header: config.headers.get("X-MAL-CLIENT-ID") });
      return handler(config);
    },
  });
  applyMalPolicy(instance, {
    getClientId: () => clientId ?? undefined,
    scheduler: createRateScheduler({ limits: MAL_LIMITS, now: () => Date.now() }),
    now: () => Date.now(),
  });
  return { instance, calls };
}

function response(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = { data: [] },
): AxiosResponse {
  return { data, status, statusText: "", headers: {}, config };
}

function failWith(status: number, data?: unknown): Handler {
  return (config) =>
    Promise.reject(
      new AxiosError(
        "failed",
        status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST",
        config,
        { _header: `GET / HTTP/1.1\r\nX-MAL-CLIENT-ID: ${CLIENT_ID}` },
        response(config, status, data),
      ),
    );
}

const ok: Handler = (config) => Promise.resolve(response(config, 200));

async function settle(request: Promise<unknown>, ms = 20_000) {
  const result = request.then(
    (value) => value,
    (error) => error,
  );
  await vi.advanceTimersByTimeAsync(ms);
  return result;
}

describe("applyMalPolicy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.spyOn(Math, "random").mockReturnValue(1);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sends the Client ID as a header", async () => {
    const { instance, calls } = makeClient(ok);
    await settle(instance.get("/anime/1"));
    expect(calls).toEqual([{ at: 0, header: CLIENT_ID }]);
  });

  it("sends nothing without a Client ID", async () => {
    const { instance, calls } = makeClient(ok, null);
    const error = await settle(instance.get("/anime/1"));
    expect(error).toBeInstanceOf(MalConfigError);
    expect(calls).toEqual([]);
    expect(classifyMalError(error)).toBe("config");
  });

  it("spaces requests to one per 1.1 seconds", async () => {
    const { instance, calls } = makeClient(ok);
    await settle(Promise.all([1, 2, 3].map((id) => instance.get(`/anime/${id}`))));
    expect(calls.map((c) => c.at)).toEqual([0, 1100, 2200]);
  });

  it("fails fast when the queue is longer than the time budget", async () => {
    const { instance, calls } = makeClient(ok);
    const results = await settle(
      Promise.allSettled(Array.from({ length: 12 }, (_, i) => instance.get(`/anime/${i}`))),
    );
    const failed = (results as PromiseSettledResult<unknown>[]).filter((r) => r.status === "rejected");
    expect(calls).toHaveLength(9);
    expect(failed).toHaveLength(3);
    const reason = (failed[0] as PromiseRejectedResult).reason;
    expect(reason.code).toBe("ERR_JIKAN_BUDGET");
    expect(classifyMalError(reason)).toBe("unavailable");
  });

  it("retries a 503 and a 429 with the Tenrai policy", async () => {
    let attempt = 0;
    const { instance, calls } = makeClient((config) =>
      ++attempt === 1 ? failWith(503)(config) : attempt === 2 ? failWith(429)(config) : ok(config),
    );
    const result = (await settle(instance.get("/anime/1"))) as AxiosResponse;
    expect(result.status).toBe(200);
    expect(calls).toHaveLength(3);
    expect(calls.every((c) => c.header === CLIENT_ID)).toBe(true);
  });

  it("does not retry a 404, a 400 or a 403", async () => {
    for (const status of [404, 400, 403]) {
      const { instance, calls } = makeClient(failWith(status));
      await settle(instance.get("/anime/1"));
      expect(calls).toHaveLength(1);
    }
  });

  it("stops every request for a while after a 403 that follows a success", async () => {
    let fail = false;
    const { instance, calls } = makeClient((config) =>
      fail ? failWith(403, forbiddenBody)(config) : ok(config),
    );
    await settle(instance.get("/anime/1"));
    fail = true;
    const forbidden = await settle(instance.get("/anime/2"));
    expect(classifyMalError(forbidden)).toBe("forbidden");

    fail = false;
    const blocked = await settle(instance.get("/anime/3"));
    expect(classifyMalError(blocked)).toBe("blocked");
    expect(calls).toHaveLength(2);

    vi.setSystemTime(Date.now() + MAL_BLOCK_COOLDOWN_MS);
    const after = (await settle(instance.get("/anime/4"))) as AxiosResponse;
    expect(after.status).toBe(200);
    expect(calls).toHaveLength(3);
  });

  it("does not stop on a 403 before any success", async () => {
    let attempt = 0;
    const { instance, calls } = makeClient((config) =>
      ++attempt === 1 ? failWith(403, forbiddenBody)(config) : ok(config),
    );
    await settle(instance.get("/anime/1"));
    const next = (await settle(instance.get("/anime/2"))) as AxiosResponse;
    expect(next.status).toBe(200);
    expect(calls).toHaveLength(2);
  });

  it("keeps the Client ID out of errors", async () => {
    const { instance } = makeClient(failWith(404, notFoundBody));
    const error = (await settle(instance.get("/anime/99999999"))) as AxiosError;
    expect(axios.isAxiosError(error)).toBe(true);
    expect(error.response?.status).toBe(404);
    expect(error.config?.headers.get("X-MAL-CLIENT-ID")).toBeUndefined();
    expect(error.request).toBeUndefined();
    expect(JSON.stringify(error.toJSON())).not.toContain(CLIENT_ID);
    expect(String(error)).not.toContain(CLIENT_ID);
    expect(JSON.stringify(error.response?.data)).not.toContain(CLIENT_ID);
  });

  it("keeps the Client ID out of timeout errors", async () => {
    const { instance } = makeClient(
      (config) =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new AxiosError("timeout", "ECONNABORTED", config)), config.timeout),
        ),
    );
    const error = (await settle(instance.get("/anime/1"))) as AxiosError;
    expect(classifyMalError(error)).toBe("unavailable");
    expect(JSON.stringify(error.toJSON())).not.toContain(CLIENT_ID);
  });
});

describe("classifyMalError", () => {
  function httpError(status: number, data?: unknown) {
    const config = { headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig;
    return new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response(config, status, data));
  }

  it("names each failure", () => {
    expect(classifyMalError(httpError(404, notFoundBody))).toBe("not_found");
    expect(classifyMalError(httpError(403, forbiddenBody))).toBe("forbidden");
    expect(classifyMalError(httpError(429))).toBe("rate_limited");
    expect(classifyMalError(httpError(400, invalidClientBody))).toBe("config");
    expect(classifyMalError(httpError(400, invalidQBody))).toBe("bad_request");
    expect(classifyMalError(httpError(500))).toBe("unavailable");
    expect(classifyMalError(httpError(504))).toBe("unavailable");
    expect(classifyMalError(new AxiosError("refused", "ECONNREFUSED"))).toBe("unavailable");
    expect(classifyMalError(new MalShapeError())).toBe("invalid_response");
    expect(classifyMalError(new Error("other"))).toBe("unknown");
  });
});
