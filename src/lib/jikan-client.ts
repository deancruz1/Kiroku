import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  ATTEMPT_TIMEOUT_MS,
  MIN_ATTEMPT_MS,
  REQUEST_BUDGET_MS,
  getRetryDelay,
} from "@/lib/jikan-policy";
import { createRateScheduler, type RateScheduler } from "@/lib/rate-scheduler";

interface JikanMeta {
  startedAt: number;
  attempts: number;
  // The status of the last failed attempt, undefined when it got no response.
  lastStatus?: number;
}

type JikanConfig = InternalAxiosRequestConfig & { jikanMeta?: JikanMeta };

interface PolicyOptions {
  scheduler?: RateScheduler;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function applyJikanPolicy(
  instance: AxiosInstance,
  {
    scheduler = createRateScheduler(),
    now = () => Date.now(),
    sleep = defaultSleep,
  }: PolicyOptions = {},
) {
  instance.interceptors.request.use(async (config: JikanConfig) => {
    // jikanMeta survives retries because axios copies unknown config keys.
    const meta = config.jikanMeta ?? { startedAt: now(), attempts: 0 };
    config.jikanMeta = meta;
    const deadline = meta.startedAt + REQUEST_BUDGET_MS;

    const gotSlot = await scheduler.acquire(deadline - MIN_ATTEMPT_MS);
    if (!gotSlot) {
      throw new AxiosError(
        "Upstream request queue is longer than the time budget",
        "ERR_JIKAN_BUDGET",
        config,
      );
    }

    const remaining = deadline - now();
    config.timeout = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
    // axios' timeout resets while bytes keep arriving, so a slow trickle
    // could outlast it. This signal is the hard stop for the whole budget.
    if (!config.signal && typeof AbortSignal.timeout === "function") {
      config.signal = AbortSignal.timeout(remaining);
    }
    meta.attempts += 1;
    return config;
  });

  instance.interceptors.response.use(undefined, async (error) => {
    const config: JikanConfig | undefined = error?.config;
    if (!axios.isAxiosError(error) || !config?.jikanMeta) throw error;

    const status = error.response?.status;
    const delay = getRetryDelay({
      attempts: config.jikanMeta.attempts,
      status,
      code: error.code,
      retryAfter: error.response?.headers?.["retry-after"],
      startedAt: config.jikanMeta.startedAt,
      now: now(),
    });
    if (delay === null) throw error;

    config.jikanMeta.lastStatus = status;
    if (status === 429) scheduler.pause(delay);
    await sleep(delay);
    return instance.request(config);
  });

  return instance;
}
