import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { applyJikanPolicy } from "@/lib/jikan-client";
import { createRateScheduler, type RateLimit } from "@/lib/rate-scheduler";

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function makeClient(handler: Handler, limits?: RateLimit[]) {
  const calls: number[] = [];
  const instance = axios.create({
    baseURL: "https://jikan.test",
    adapter: (config) => {
      calls.push(Date.now());
      return handler(config);
    },
  });
  applyJikanPolicy(instance, {
    scheduler: createRateScheduler({ limits, now: () => Date.now() }),
    now: () => Date.now(),
  });
  return { instance, calls };
}

function response(
  config: InternalAxiosRequestConfig,
  status: number,
  headers: Record<string, string> = {},
): AxiosResponse {
  return { data: { data: [] }, status, statusText: "", headers, config };
}

const hang: Handler = (config) =>
  new Promise((_, reject) =>
    setTimeout(
      () => reject(new AxiosError("timeout", "ECONNABORTED", config)),
      config.timeout,
    ),
  );

function failWith(status: number, headers?: Record<string, string>): Handler {
  return (config) =>
    Promise.reject(
      new AxiosError(
        "failed",
        "ERR_BAD_RESPONSE",
        config,
        null,
        response(config, status, headers),
      ),
    );
}

const ok: Handler = (config) => Promise.resolve(response(config, 200));

async function settle(request: Promise<unknown>) {
  let finishedAt = -1;
  const result = request.then(
    (value) => {
      finishedAt = Date.now();
      return value;
    },
    (error) => {
      finishedAt = Date.now();
      return error;
    },
  );
  await vi.advanceTimersByTimeAsync(20_000);
  return { result: await result, finishedAt };
}

describe("applyJikanPolicy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    // Worst case: jitter always picks the longest delay.
    vi.spyOn(Math, "random").mockReturnValue(1);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("gives up on a hanging upstream after 8.5 seconds", async () => {
    const { instance, calls } = makeClient(hang);
    const { result, finishedAt } = await settle(instance.get("/anime/1"));

    expect((result as AxiosError).code).toBe("ECONNABORTED");
    expect(calls).toEqual([0, 4500]);
    expect(finishedAt).toBe(8500);
  });

  it("retries a 429 twice with growing delays", async () => {
    const { instance, calls } = makeClient(failWith(429));
    const { result, finishedAt } = await settle(instance.get("/anime/1"));

    expect((result as AxiosError).response?.status).toBe(429);
    expect(calls).toEqual([0, 500, 1500]);
    expect(finishedAt).toBe(1500);
  });

  it("honours Retry-After", async () => {
    const { instance, calls } = makeClient(failWith(429, { "retry-after": "2" }));
    const { finishedAt } = await settle(instance.get("/anime/1"));

    expect(calls).toEqual([0, 2000, 4000]);
    expect(finishedAt).toBe(4000);
  });

  it("fails at once when Retry-After is longer than the budget allows", async () => {
    const { instance, calls } = makeClient(failWith(429, { "retry-after": "30" }));
    const { finishedAt } = await settle(instance.get("/anime/1"));

    expect(calls).toEqual([0]);
    expect(finishedAt).toBe(0);
  });

  it("does not retry a refused connection or a 404", async () => {
    const refused = makeClient((config) =>
      Promise.reject(new AxiosError("refused", "ECONNREFUSED", config)),
    );
    expect((await settle(refused.instance.get("/x"))).finishedAt).toBe(0);
    expect(refused.calls).toEqual([0]);

    const missing = makeClient(failWith(404));
    const notFound = await settle(missing.instance.get("/x"));
    expect(notFound.finishedAt).toBe(20_000);
    expect(missing.calls).toEqual([20_000]);
  });

  it("returns the response when a retry succeeds", async () => {
    let first = true;
    const { instance, calls } = makeClient((config) => {
      if (first) {
        first = false;
        return failWith(503)(config);
      }
      return ok(config);
    });
    const { result } = await settle(instance.get("/anime/1"));

    expect((result as AxiosResponse).status).toBe(200);
    expect(calls).toEqual([0, 500]);
  });

  it("spaces six parallel requests to three per 1.1 seconds", async () => {
    const { instance, calls } = makeClient(ok);
    await settle(
      Promise.all(Array.from({ length: 6 }, () => instance.get("/anime/1"))),
    );

    expect(calls).toEqual([0, 0, 0, 1100, 1100, 1100]);
  });

  it("fails fast instead of queueing past the budget", async () => {
    const { instance, calls } = makeClient(ok, [{ max: 1, windowMs: 60_000 }]);
    await settle(instance.get("/a"));
    const { result, finishedAt } = await settle(instance.get("/b"));

    expect((result as AxiosError).code).toBe("ERR_JIKAN_BUDGET");
    expect(calls).toHaveLength(1);
    expect(finishedAt).toBe(20_000);
  });
});
