import { UPSTREAM_LIMITS } from "@/lib/upstream";

export interface RateLimit {
  max: number;
  windowMs: number;
}

// `history` holds the start times already handed out, oldest first.
export function nextSlot(
  history: number[],
  now: number,
  limits: RateLimit[],
  notBefore = 0,
) {
  let slot = Math.max(now, notBefore);
  for (const { max, windowMs } of limits) {
    if (history.length >= max) {
      slot = Math.max(slot, history[history.length - max] + windowMs);
    }
  }
  return slot;
}

interface SchedulerOptions {
  limits?: RateLimit[];
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function createRateScheduler({
  limits = UPSTREAM_LIMITS,
  now = Date.now,
  sleep = defaultSleep,
}: SchedulerOptions = {}) {
  const longestWindow = Math.max(...limits.map((l) => l.windowMs));
  let history: number[] = [];
  let pausedUntil = 0;

  return {
    // Waits for a free slot. Resolves false without waiting when the slot
    // would start later than `latestStart`.
    async acquire(latestStart = Infinity) {
      const current = now();
      history = history.filter((t) => t > current - longestWindow);
      const slot = nextSlot(history, current, limits, pausedUntil);
      if (slot > latestStart) return false;
      history.push(slot);
      if (slot > current) await sleep(slot - current);
      return true;
    },

    pause(ms: number) {
      pausedUntil = Math.max(pausedUntil, now() + ms);
    },
  };
}

export type RateScheduler = ReturnType<typeof createRateScheduler>;
