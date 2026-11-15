import axios, { AxiosError, AxiosHeaders, type AxiosInstance } from "axios";
import { applyJikanPolicy } from "@/lib/jikan-client";
import { MalShapeError } from "@/lib/mal-shape";
import { createRateScheduler, type RateScheduler } from "@/lib/rate-scheduler";
import {
  MAL_BLOCK_COOLDOWN_MS,
  MAL_CLIENT_ID_HEADER,
  MAL_LIMITS,
  MAL_NAME,
} from "@/lib/upstream";

export class MalConfigError extends Error {
  constructor() {
    super(`${MAL_NAME} client ID is not set`);
    this.name = "MalConfigError";
  }
}

interface MalPolicyOptions {
  getClientId: () => string | undefined;
  scheduler?: RateScheduler;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

// Errors are kept as AxiosErrors so status checks keep working, but they
// carry the request config and the raw request, which hold the Client ID.
function scrubClientId(error: AxiosError) {
  for (const config of [error.config, error.response?.config]) {
    const headers = config?.headers;
    if (headers instanceof AxiosHeaders) headers.delete(MAL_CLIENT_ID_HEADER);
    else if (headers) delete (headers as Record<string, unknown>)[MAL_CLIENT_ID_HEADER];
  }
  error.request = undefined;
  if (error.response) error.response.request = undefined;
}

// Uses the Tenrai client's budget, timeout and retry policy with its own
// scheduler. A 403 is never retried, and one that follows a success stops
// all requests for a while in case it is a block.
export function applyMalPolicy(
  instance: AxiosInstance,
  {
    getClientId,
    scheduler = createRateScheduler({ limits: MAL_LIMITS }),
    now = () => Date.now(),
    sleep,
  }: MalPolicyOptions,
) {
  applyJikanPolicy(instance, { scheduler, now, sleep });
  let succeeded = false;
  let blockedUntil = 0;

  // Request interceptors run last-added first, so this runs before a rate
  // slot is taken.
  instance.interceptors.request.use((config) => {
    const clientId = getClientId();
    if (!clientId) throw new MalConfigError();
    if (now() < blockedUntil) {
      throw new AxiosError(
        `${MAL_NAME} refused a recent request; waiting before trying again`,
        "ERR_MAL_BLOCKED",
        config,
      );
    }
    config.headers.set(MAL_CLIENT_ID_HEADER, clientId);
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      succeeded = true;
      return response;
    },
    (error) => {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 && succeeded) {
          blockedUntil = Math.max(blockedUntil, now() + MAL_BLOCK_COOLDOWN_MS);
        }
        scrubClientId(error);
      }
      throw error;
    },
  );

  return instance;
}

export type MalErrorKind =
  | "not_found"
  | "forbidden"
  | "blocked"
  | "rate_limited"
  | "bad_request"
  | "config"
  | "invalid_response"
  | "unavailable"
  | "unknown";

const UNAVAILABLE_CODES = new Set([
  "ECONNABORTED",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ERR_NETWORK",
  "ERR_CANCELED",
  "ERR_JIKAN_BUDGET",
]);

export function classifyMalError(error: unknown): MalErrorKind {
  if (error instanceof MalConfigError) return "config";
  if (error instanceof MalShapeError) return "invalid_response";
  if (!axios.isAxiosError(error)) return "unknown";
  if (error.code === "ERR_MAL_BLOCKED") return "blocked";

  const status = error.response?.status;
  if (status === undefined) {
    return error.code && UNAVAILABLE_CODES.has(error.code) ? "unavailable" : "unknown";
  }
  if (status === 404) return "not_found";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status === 400) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    return message === "Invalid client id" ? "config" : "bad_request";
  }
  if (status >= 500) return "unavailable";
  return "unknown";
}
