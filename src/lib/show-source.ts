import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { MAX_ATTEMPTS, REQUEST_BUDGET_MS } from "@/lib/jikan-policy";
import { MalConfigError, classifyMalError } from "@/lib/mal-client";
import {
  createBreaker,
  createPathCounter,
  type Breaker,
  type PathCounter,
} from "@/lib/source-breaker";
import { MAL_BATCH_BUDGET, MAL_NAME, UPSTREAM_NAME } from "@/lib/upstream";

export type SourceMode = "auto" | "tenrai" | "mal";

// Long enough that a dead Tenrai costs one short probe per instance every
// five minutes, short enough that a brief Tenrai outage is over quickly.
export const BREAKER_COOLDOWN_MS = 5 * 60 * 1000;
// One attempt, no retries. Tenrai answered in 185 to 566 ms when probed.
export const PROBE_TIMEOUT_MS = 3_000;
// After v2 rejects the Client ID, it is not asked again for this long.
export const MAL_CONFIG_PAUSE_MS = 10 * 60 * 1000;
// One broken show fails on its own paths; this many different paths failing
// means Tenrai itself is struggling.
export const WEAK_FAILURE_PATHS = 3;
// Weak failures further apart than this are taken as unrelated.
export const WEAK_FAILURE_WINDOW_MS = 60_000;

// Without a Client ID there is no second source, whatever SHOW_DATA_SOURCE says.
export function sourceMode(): SourceMode {
  if (!process.env.MAL_CLIENT_ID) return "tenrai";
  const value = process.env.SHOW_DATA_SOURCE?.trim().toLowerCase();
  return value === "tenrai" || value === "mal" ? value : "auto";
}

export class UpstreamShapeError extends Error {
  constructor(message = `Unexpected response from ${UPSTREAM_NAME}`) {
    super(message);
    this.name = "UpstreamShapeError";
  }
}

export const tenraiBreaker = createBreaker({
  cooldownMs: BREAKER_COOLDOWN_MS,
  probeLeaseMs: 30_000,
  onOpen: (reason) =>
    console.warn(
      `[show data] ${UPSTREAM_NAME} failed (${reason}); using ${MAL_NAME} until ${UPSTREAM_NAME} answers again`,
    ),
  onClose: () =>
    console.info(`[show data] ${UPSTREAM_NAME} answered again; using ${UPSTREAM_NAME}`),
});

export const tenraiWeakFailures = createPathCounter({
  windowMs: WEAK_FAILURE_WINDOW_MS,
  paths: WEAK_FAILURE_PATHS,
});

// Every Tenrai reply the app uses is an object with a data key; a parked
// domain or proxy page is not.
function isJikanBody(data: unknown) {
  return !!data && typeof data === "object" && "data" in data;
}

function isJsonObject(data: unknown) {
  return !!data && typeof data === "object";
}

type SourceConfig = InternalAxiosRequestConfig & {
  jikanMeta?: { startedAt: number; attempts: number; lastStatus?: number };
  tenraiProbe?: boolean;
};

// The budget error is raised while waiting for a slot in our own rate
// scheduler. If no attempt had been sent yet, Tenrai was never asked, so the
// error is our load, not an outage. A probe starts from MAX_ATTEMPTS - 1.
export function isOwnQueueTimeout(error: AxiosError) {
  if (error.code !== "ERR_JIKAN_BUDGET") return false;
  const config = error.config as SourceConfig | undefined;
  const baseline = config?.tenraiProbe ? MAX_ATTEMPTS - 1 : 0;
  return (config?.jikanMeta?.attempts ?? 0) <= baseline;
}

export interface TenraiFailure {
  // Strong: Tenrai as a whole is not answering. Weak: one resource failed,
  // which a single broken show can cause.
  strength: "strong" | "weak";
  reason: string;
}

// Returns how the error shows Tenrai is not working, or null when Tenrai
// answered (a 404 or a 400 is an answer). A budget that ran out after real
// attempts takes the strength of the last attempt: no response is strong, a
// 5xx or 429 reply is weak.
export function tenraiFailure(error: AxiosError): TenraiFailure | null {
  if (error.code === "ERR_TENRAI_SHAPE") return { strength: "strong", reason: "unexpected reply" };
  const status = error.response?.status;
  if (status === undefined) {
    const reason = error.code ?? "no response";
    const lastStatus = (error.config as SourceConfig | undefined)?.jikanMeta?.lastStatus;
    const weak = error.code === "ERR_JIKAN_BUDGET" && lastStatus !== undefined;
    return { strength: weak ? "weak" : "strong", reason };
  }
  if (status === 403) return { strength: "strong", reason: `HTTP ${status}` };
  if (status >= 500 || status === 429 || status === 408) {
    return { strength: "weak", reason: `HTTP ${status}` };
  }
  if (!isJsonObject(error.response?.data)) {
    return { strength: "strong", reason: `HTTP ${status} without JSON` };
  }
  return null;
}

export function isTenraiOutage(error: unknown) {
  if (error instanceof UpstreamShapeError) return true;
  if (!axios.isAxiosError(error)) return false;
  if (isOwnQueueTimeout(error)) return false;
  if (error.code === "ERR_TENRAI_SKIPPED") return true;
  return tenraiFailure(error) !== null;
}

// The path without the query string, which can hold a visitor's search text.
function requestPath(config: InternalAxiosRequestConfig) {
  try {
    return new URL(axios.getUri(config)).pathname;
  } catch {
    return (config.url ?? "").split("?")[0];
  }
}

function describeRequest(config: InternalAxiosRequestConfig | undefined) {
  if (!config) return "a request";
  return `${(config.method ?? "get").toUpperCase()} ${requestPath(config)}`;
}

// A strong failure, or any failed probe, opens the breaker (or restarts its
// cooldown) at once. A weak failure opens it only once enough different paths
// have failed recently. Calling this twice for the same request changes nothing.
export function noteTenraiFailure(
  error: unknown,
  { probe = false, breaker = tenraiBreaker, weak = tenraiWeakFailures } = {},
) {
  let failure: TenraiFailure | null;
  let config: InternalAxiosRequestConfig | undefined;
  if (error instanceof UpstreamShapeError) {
    failure = { strength: "strong", reason: "unexpected reply" };
  } else if (axios.isAxiosError(error) && !isOwnQueueTimeout(error)) {
    failure = tenraiFailure(error);
    config = error.config;
  } else {
    failure = null;
  }
  if (!failure) return;

  const reason = config ? `${failure.reason} on ${describeRequest(config)}` : failure.reason;
  if (probe || failure.strength === "strong") {
    breaker.fail(reason, probe);
  } else if (config && weak.fail(requestPath(config))) {
    weak.clear();
    breaker.fail(reason);
  }
}

function noteTenraiAnswer(
  config: InternalAxiosRequestConfig | undefined,
  { probe = false, breaker = tenraiBreaker, weak = tenraiWeakFailures } = {},
) {
  if (config) weak.succeed(requestPath(config));
  breaker.succeed(probe);
}

interface BreakerPolicyOptions {
  breaker?: Breaker;
  weak?: PathCounter;
  now?: () => number;
  isActive?: () => boolean;
}

// Installed after applyJikanPolicy, so the request side runs before a rate
// slot is taken and the response side sees each request's final outcome.
export function applySourceBreaker(
  instance: AxiosInstance,
  {
    breaker = tenraiBreaker,
    weak = tenraiWeakFailures,
    now = () => Date.now(),
    isActive = () => sourceMode() === "auto",
  }: BreakerPolicyOptions = {},
) {
  instance.interceptors.request.use((config: SourceConfig) => {
    if (!isActive() || config.tenraiProbe) return config;
    const admission = config.jikanMeta ? (breaker.isOpen ? "skip" : "normal") : breaker.admit();
    if (admission === "skip") {
      throw new AxiosError(
        `${UPSTREAM_NAME} is skipped while it is failing`,
        "ERR_TENRAI_SKIPPED",
        config,
      );
    }
    if (admission === "probe") {
      // Leaves the policy room for one short attempt and no retry.
      config.tenraiProbe = true;
      config.jikanMeta = {
        startedAt: now() - (REQUEST_BUDGET_MS - PROBE_TIMEOUT_MS),
        attempts: MAX_ATTEMPTS - 1,
      };
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      if (!isActive()) return response;
      const probe = Boolean((response.config as SourceConfig).tenraiProbe);
      if (!isJikanBody(response.data)) {
        const error = new AxiosError(
          `Unexpected response from ${UPSTREAM_NAME}`,
          "ERR_TENRAI_SHAPE",
          response.config,
          response.request,
          response,
        );
        noteTenraiFailure(error, { probe, breaker, weak });
        throw error;
      }
      noteTenraiAnswer(response.config, { probe, breaker, weak });
      return response;
    },
    (error) => {
      if (!isActive() || !axios.isAxiosError(error)) throw error;
      if (error.code === "ERR_TENRAI_SKIPPED" || error.code === "ERR_TENRAI_SHAPE") throw error;
      const probe = Boolean((error.config as SourceConfig | undefined)?.tenraiProbe);
      if (isOwnQueueTimeout(error)) {
        if (probe) breaker.release();
        throw error;
      }
      if (tenraiFailure(error)) noteTenraiFailure(error, { probe, breaker, weak });
      else noteTenraiAnswer(error.config, { probe, breaker, weak });
      throw error;
    },
  );

  return instance;
}

let malPausedUntil = 0;

async function askMal<M>(mal: () => Promise<M>): Promise<M> {
  if (Date.now() < malPausedUntil) throw new MalConfigError();
  try {
    return await mal();
  } catch (error) {
    if (classifyMalError(error) === "config" && Date.now() >= malPausedUntil) {
      malPausedUntil = Date.now() + MAL_CONFIG_PAUSE_MS;
      console.warn(`[show data] ${MAL_NAME} rejected the Client ID; not using it for 10 minutes`);
    }
    throw error;
  }
}

// Tenrai first. On a Tenrai failure, weak or strong, this request is answered
// from v2 whether or not the breaker opens. If v2 fails too, the Tenrai error
// is rethrown so callers see the same kind of failure as before; a v2 404 is
// passed on because it is an answer.
export async function fromSource<T, M>(
  tenrai: () => Promise<T>,
  mal: () => Promise<M>,
): Promise<T | M> {
  const mode = sourceMode();
  if (mode === "tenrai") return tenrai();
  if (mode === "mal") return askMal(mal);

  try {
    return await tenrai();
  } catch (error) {
    if (!isTenraiOutage(error)) throw error;
    noteTenraiFailure(error);
    try {
      return await askMal(mal);
    } catch (malError) {
      if (classifyMalError(malError) === "not_found") throw malError;
      throw error;
    }
  }
}

// v2 costs one request per show, so a refresh asks for fewer shows while it
// is the source in use.
export function showBatchBudget(budget: number) {
  const mode = sourceMode();
  if (mode === "mal" || (mode === "auto" && tenraiBreaker.isOpen)) {
    return Math.min(budget, MAL_BATCH_BUDGET);
  }
  return budget;
}
