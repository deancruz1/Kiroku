export const REQUEST_BUDGET_MS = 10_000;
export const ATTEMPT_TIMEOUT_MS = 4_000;
export const MIN_ATTEMPT_MS = 1_000;
export const MAX_ATTEMPTS = 3;
export const BASE_DELAY_MS = 500;
export const MAX_DELAY_MS = 4_000;

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const RETRYABLE_CODES = new Set(["ECONNABORTED", "ETIMEDOUT", "ECONNRESET"]);

export interface RetryInput {
  attempts: number;
  status?: number;
  code?: string;
  retryAfter?: unknown;
  startedAt: number;
  now: number;
  random?: () => number;
}

export function isRetryable(status?: number, code?: string) {
  if (status !== undefined) return RETRYABLE_STATUS.has(status);
  return code !== undefined && RETRYABLE_CODES.has(code);
}

// Exponential backoff with "equal jitter": half the step is fixed, half random.
export function backoffDelay(retry: number, random: () => number = Math.random) {
  const step = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (retry - 1));
  return Math.round(step / 2 + random() * (step / 2));
}

export function parseRetryAfter(value: unknown, now: number): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return Number(text) * 1000;
  const date = Date.parse(text);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - now);
}

// Returns the wait before the next attempt, or null when it should not retry.
export function getRetryDelay({
  attempts,
  status,
  code,
  retryAfter,
  startedAt,
  now,
  random = Math.random,
}: RetryInput): number | null {
  if (attempts >= MAX_ATTEMPTS) return null;
  if (!isRetryable(status, code)) return null;

  let delay = backoffDelay(attempts, random);
  if (status === 429 || status === 503) {
    const wait = parseRetryAfter(retryAfter, now);
    if (wait !== null) delay = Math.max(delay, wait);
  }

  const remaining = startedAt + REQUEST_BUDGET_MS - now;
  if (delay + ATTEMPT_TIMEOUT_MS > remaining) return null;
  return delay;
}
