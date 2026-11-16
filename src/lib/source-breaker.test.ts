import { describe, expect, it, vi } from "vitest";
import { createBreaker, createPathCounter } from "@/lib/source-breaker";

const COOLDOWN = 5 * 60 * 1000;
const LEASE = 30_000;

function makeBreaker() {
  let clock = 1_000_000;
  const onOpen = vi.fn();
  const onClose = vi.fn();
  const breaker = createBreaker({
    cooldownMs: COOLDOWN,
    probeLeaseMs: LEASE,
    now: () => clock,
    onOpen,
    onClose,
  });
  return {
    breaker,
    onOpen,
    onClose,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe("createBreaker", () => {
  it("lets every request through while closed", () => {
    const { breaker, onOpen } = makeBreaker();
    expect(breaker.isOpen).toBe(false);
    expect(breaker.admit()).toBe("normal");
    expect(breaker.admit()).toBe("normal");
    breaker.succeed();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("opens on the first failure and reports it once", () => {
    const { breaker, onOpen } = makeBreaker();
    breaker.fail("ECONNREFUSED");
    breaker.fail("HTTP 503");
    expect(breaker.isOpen).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith("ECONNREFUSED");
  });

  it("skips until the cooldown ends, then allows one probe", () => {
    const { breaker, advance } = makeBreaker();
    breaker.fail("timeout");
    expect(breaker.admit()).toBe("skip");
    advance(COOLDOWN - 1);
    expect(breaker.admit()).toBe("skip");
    advance(1);
    expect(breaker.admit()).toBe("probe");
    expect(breaker.admit()).toBe("skip");
    expect(breaker.admit()).toBe("skip");
  });

  it("closes only when a probe succeeds", () => {
    const { breaker, advance, onClose } = makeBreaker();
    breaker.fail("timeout");
    breaker.succeed();
    expect(breaker.isOpen).toBe(true);

    advance(COOLDOWN);
    expect(breaker.admit()).toBe("probe");
    breaker.succeed(true);
    expect(breaker.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(breaker.admit()).toBe("normal");
  });

  it("starts a new cooldown when the probe fails", () => {
    const { breaker, advance, onOpen } = makeBreaker();
    breaker.fail("timeout");
    advance(COOLDOWN);
    expect(breaker.admit()).toBe("probe");
    advance(3_000);
    breaker.fail("timeout", true);

    expect(breaker.isOpen).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(breaker.admit()).toBe("skip");
    advance(COOLDOWN - 1);
    expect(breaker.admit()).toBe("skip");
    advance(1);
    expect(breaker.admit()).toBe("probe");
  });

  it("does not extend the cooldown on failures that were not probes", () => {
    const { breaker, advance } = makeBreaker();
    breaker.fail("timeout");
    advance(COOLDOWN - 1_000);
    breaker.fail("timeout");
    advance(1_000);
    expect(breaker.admit()).toBe("probe");
  });

  it("frees the probe slot when a probe never reports back", () => {
    const { breaker, advance } = makeBreaker();
    breaker.fail("timeout");
    advance(COOLDOWN);
    expect(breaker.admit()).toBe("probe");
    advance(LEASE - 1);
    expect(breaker.admit()).toBe("skip");
    advance(1);
    expect(breaker.admit()).toBe("probe");
  });

  it("can open again after closing", () => {
    const { breaker, advance, onOpen, onClose } = makeBreaker();
    breaker.fail("timeout");
    advance(COOLDOWN);
    breaker.admit();
    breaker.succeed(true);
    breaker.fail("HTTP 502");
    expect(breaker.isOpen).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(breaker.admit()).toBe("skip");
  });
});

describe("createPathCounter", () => {
  function makeCounter() {
    let clock = 0;
    const counter = createPathCounter({ windowMs: 60_000, paths: 3, now: () => clock });
    return { counter, advance: (ms: number) => (clock += ms) };
  }

  it("counts one path once however often it fails", () => {
    const { counter } = makeCounter();
    for (let i = 0; i < 5; i++) expect(counter.fail("/anime/1/reviews")).toBe(false);
  });

  it("reports three different paths within the window", () => {
    const { counter, advance } = makeCounter();
    expect(counter.fail("/a")).toBe(false);
    advance(30_000);
    expect(counter.fail("/b")).toBe(false);
    advance(30_000);
    expect(counter.fail("/c")).toBe(true);
  });

  it("forgets failures older than the window", () => {
    const { counter, advance } = makeCounter();
    counter.fail("/a");
    advance(30_000);
    counter.fail("/b");
    advance(30_001);
    expect(counter.fail("/c")).toBe(false);
  });

  it("drops a path that succeeds, and everything on clear", () => {
    const { counter } = makeCounter();
    counter.fail("/a");
    counter.fail("/b");
    counter.succeed("/a");
    expect(counter.fail("/c")).toBe(false);
    counter.clear();
    counter.fail("/d");
    expect(counter.fail("/e")).toBe(false);
  });
});