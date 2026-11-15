import { beforeEach, describe, expect, it, vi } from "vitest";

const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));

// Stores a result only when the function resolves, like unstable_cache.
vi.mock("next/cache", () => ({
  unstable_cache:
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>, keyParts: string[]) =>
    async (...args: A) => {
      const key = `${keyParts.join(",")}-${JSON.stringify(args)}`;
      if (store.has(key)) return store.get(key) as R;
      const result = await fn(...args);
      store.set(key, result);
      return result;
    },
}));

import { cacheUpstream } from "@/lib/upstream-cache";

beforeEach(() => {
  store.clear();
});

describe("cacheUpstream", () => {
  it("caches a good result", async () => {
    const fn = vi.fn(async (id: number) => ({ data: [id] }));
    const get = cacheUpstream(fn, ["test-good"], {
      revalidate: 60,
      isEmpty: (r) => r.data.length === 0,
    });

    expect(await get(1)).toEqual({ data: [1] });
    expect(await get(1)).toEqual({ data: [1] });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns an empty result without caching it", async () => {
    const fn = vi
      .fn<(id: number) => Promise<{ data: number[] }>>()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [7] });
    const get = cacheUpstream(fn, ["test-empty"], {
      revalidate: 60,
      isEmpty: (r) => r.data.length === 0,
    });

    expect(await get(1)).toEqual({ data: [] });
    expect(await get(1)).toEqual({ data: [7] });
    expect(await get(1)).toEqual({ data: [7] });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("passes failures through and does not cache them", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce("ok");
    const get = cacheUpstream(fn, ["test-fail"], { revalidate: 60 });

    await expect(get()).rejects.toThrow("down");
    expect(await get()).toBe("ok");
  });
});
