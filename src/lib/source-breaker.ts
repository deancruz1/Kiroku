export type Admission = "normal" | "probe" | "skip";

interface BreakerOptions {
  cooldownMs: number;
  // A probe that never reports back frees the slot after this long.
  probeLeaseMs: number;
  now?: () => number;
  onOpen?: (reason: string) => void;
  onClose?: () => void;
}

// Closed: every request may use the source. Open: requests skip it until the
// cooldown ends, then one request at a time may probe it. Only a probe can
// close the breaker; a failed probe starts a new cooldown.
export function createBreaker({
  cooldownMs,
  probeLeaseMs,
  now = Date.now,
  onOpen,
  onClose,
}: BreakerOptions) {
  let open = false;
  let retryAt = 0;
  let probeUntil = 0;

  return {
    get isOpen() {
      return open;
    },

    admit(): Admission {
      if (!open) return "normal";
      const current = now();
      if (current < retryAt || current < probeUntil) return "skip";
      probeUntil = current + probeLeaseMs;
      return "probe";
    },

    fail(reason: string, probe = false) {
      if (!open) {
        open = true;
        retryAt = now() + cooldownMs;
        probeUntil = 0;
        onOpen?.(reason);
      } else if (probe) {
        retryAt = now() + cooldownMs;
        probeUntil = 0;
      }
    },

    succeed(probe = false) {
      if (!open || !probe) return;
      open = false;
      probeUntil = 0;
      onClose?.();
    },

    // A probe that never reached the source frees the slot and changes nothing else.
    release() {
      probeUntil = 0;
    },
  };
}

export type Breaker = ReturnType<typeof createBreaker>;

interface PathCounterOptions {
  windowMs: number;
  paths: number;
  now?: () => number;
}

// Counts the different paths that failed within the window. One path failing
// again and again still counts once.
export function createPathCounter({ windowMs, paths, now = Date.now }: PathCounterOptions) {
  const failedAt = new Map<string, number>();

  return {
    // Returns true when enough different paths have failed.
    fail(path: string) {
      const current = now();
      failedAt.set(path, current);
      for (const [key, at] of failedAt) {
        if (current - at > windowMs) failedAt.delete(key);
      }
      return failedAt.size >= paths;
    },

    succeed(path: string) {
      failedAt.delete(path);
    },

    clear() {
      failedAt.clear();
    },
  };
}

export type PathCounter = ReturnType<typeof createPathCounter>;
