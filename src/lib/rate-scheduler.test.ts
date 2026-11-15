import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateScheduler, nextSlot } from "@/lib/rate-scheduler";

const perSecond = [{ max: 3, windowMs: 1000 }];

describe("nextSlot", () => {
  it("starts immediately while under the limit", () => {
    expect(nextSlot([0, 0], 0, perSecond)).toBe(0);
  });

  it("waits for the oldest request in the window to expire", () => {
    expect(nextSlot([0, 100, 200], 250, perSecond)).toBe(1000);
    expect(nextSlot([0, 100, 200, 1000], 1000, perSecond)).toBe(1100);
  });

  it("applies every limit", () => {
    const limits = [...perSecond, { max: 4, windowMs: 10_000 }];
    expect(nextSlot([0, 0, 0, 1000], 1000, limits)).toBe(10_000);
  });

  it("respects a pause", () => {
    expect(nextSlot([], 0, perSecond, 2000)).toBe(2000);
  });
});

describe("createRateScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function start(scheduler: ReturnType<typeof createRateScheduler>) {
    const startedAt: number[] = [];
    const run = () =>
      scheduler.acquire().then(() => startedAt.push(Date.now()));
    return { startedAt, run };
  }

  it("spaces six simultaneous requests into two bursts of three", async () => {
    const scheduler = createRateScheduler({
      limits: perSecond,
      now: () => Date.now(),
    });
    const { startedAt, run } = start(scheduler);

    const all = Promise.all(Array.from({ length: 6 }, run));
    await vi.advanceTimersByTimeAsync(999);
    expect(startedAt).toEqual([0, 0, 0]);

    await vi.advanceTimersByTimeAsync(1);
    await all;
    expect(startedAt).toEqual([0, 0, 0, 1000, 1000, 1000]);
  });

  it("refuses a slot that starts after the latest allowed time", async () => {
    const scheduler = createRateScheduler({
      limits: [{ max: 1, windowMs: 5000 }],
      now: () => Date.now(),
    });

    await expect(scheduler.acquire(1000)).resolves.toBe(true);
    await expect(scheduler.acquire(1000)).resolves.toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(scheduler.acquire(6000)).resolves.toBe(true);
  });

  it("keeps the default limits under 3 per second and 100 per minute", async () => {
    const scheduler = createRateScheduler({ now: () => Date.now() });
    const { startedAt, run } = start(scheduler);

    const all = Promise.all(Array.from({ length: 150 }, run));
    await vi.advanceTimersByTimeAsync(180_000);
    await all;

    expect(startedAt).toHaveLength(150);
    for (let i = 0; i < startedAt.length; i++) {
      const inSecond = startedAt.filter((t) => t >= startedAt[i] && t < startedAt[i] + 1000);
      const inMinute = startedAt.filter((t) => t >= startedAt[i] && t < startedAt[i] + 60_000);
      expect(inSecond.length).toBeLessThanOrEqual(3);
      expect(inMinute.length).toBeLessThanOrEqual(100);
    }
    expect(startedAt[100]).toBeGreaterThanOrEqual(60_000);
  });

  it("holds every caller back after a pause", async () => {
    const scheduler = createRateScheduler({
      limits: perSecond,
      now: () => Date.now(),
    });
    const { startedAt, run } = start(scheduler);

    scheduler.pause(2000);
    const all = Promise.all([run(), run()]);
    await vi.advanceTimersByTimeAsync(2000);
    await all;
    expect(startedAt).toEqual([2000, 2000]);
  });
});
