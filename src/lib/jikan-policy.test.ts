import { describe, expect, it } from "vitest";
import {
  backoffDelay,
  getRetryDelay,
  isRetryable,
  parseRetryAfter,
} from "@/lib/jikan-policy";

const low = () => 0;
const high = () => 1;

describe("backoffDelay", () => {
  it("doubles each retry with jitter in the upper half of the step", () => {
    expect([backoffDelay(1, low), backoffDelay(1, high)]).toEqual([250, 500]);
    expect([backoffDelay(2, low), backoffDelay(2, high)]).toEqual([500, 1000]);
    expect([backoffDelay(3, low), backoffDelay(3, high)]).toEqual([1000, 2000]);
  });

  it("caps the step at 4 seconds", () => {
    expect(backoffDelay(10, high)).toBe(4000);
  });
});

describe("parseRetryAfter", () => {
  it("reads seconds", () => {
    expect(parseRetryAfter("2", 0)).toBe(2000);
    expect(parseRetryAfter(3, 0)).toBe(3000);
  });

  it("reads an HTTP date relative to now", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseRetryAfter("Thu, 01 Jan 2026 00:00:05 GMT", now)).toBe(5000);
  });

  it("ignores missing or junk values", () => {
    expect(parseRetryAfter(undefined, 0)).toBeNull();
    expect(parseRetryAfter("soon", 0)).toBeNull();
  });
});

describe("isRetryable", () => {
  it("retries rate limits, gateway errors and timeouts", () => {
    expect(isRetryable(429)).toBe(true);
    expect(isRetryable(503)).toBe(true);
    expect(isRetryable(undefined, "ECONNABORTED")).toBe(true);
    expect(isRetryable(undefined, "ECONNRESET")).toBe(true);
  });

  it("does not retry client errors, refused connections or cancels", () => {
    expect(isRetryable(404)).toBe(false);
    expect(isRetryable(400)).toBe(false);
    expect(isRetryable(500)).toBe(false);
    expect(isRetryable(undefined, "ECONNREFUSED")).toBe(false);
    expect(isRetryable(undefined, "ERR_CANCELED")).toBe(false);
  });
});

describe("getRetryDelay", () => {
  const base = { startedAt: 0, random: high };

  it("backs off after a 429", () => {
    expect(getRetryDelay({ ...base, attempts: 1, status: 429, now: 100 })).toBe(
      500,
    );
  });

  it("waits at least as long as Retry-After", () => {
    expect(
      getRetryDelay({
        ...base,
        attempts: 1,
        status: 429,
        retryAfter: "3",
        now: 100,
      }),
    ).toBe(3000);
  });

  it("gives up when Retry-After does not fit the budget", () => {
    expect(
      getRetryDelay({
        ...base,
        attempts: 1,
        status: 429,
        retryAfter: "7",
        now: 100,
      }),
    ).toBeNull();
  });

  it("gives up when another full attempt would pass the budget", () => {
    expect(
      getRetryDelay({ ...base, attempts: 2, code: "ECONNABORTED", now: 8500 }),
    ).toBeNull();
    expect(
      getRetryDelay({ ...base, attempts: 1, code: "ECONNABORTED", now: 4000 }),
    ).toBe(500);
  });

  it("stops after three attempts", () => {
    expect(
      getRetryDelay({ ...base, attempts: 3, status: 503, now: 100 }),
    ).toBeNull();
  });

  it("does not retry a 404", () => {
    expect(
      getRetryDelay({ ...base, attempts: 1, status: 404, now: 100 }),
    ).toBeNull();
  });
});
