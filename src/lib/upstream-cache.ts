import { unstable_cache } from "next/cache";

class UncachedResult<T> extends Error {
  constructor(public value: T) {
    super("Result was not cached");
    this.name = "UncachedResult";
  }
}

interface CacheOptions<R> {
  revalidate: number;
  tags?: string[];
  // An empty reply is still returned, but it is not stored, so the next
  // visit asks upstream again instead of serving it for hours.
  isEmpty?: (result: R) => boolean;
}

// unstable_cache only stores what the function returns, so a thrown error is
// never cached. Empty results are thrown past it and handed back here.
// keyParts must be unique per use because every wrapper has the same source.
export function cacheUpstream<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  { revalidate, tags, isEmpty }: CacheOptions<R>,
) {
  const cachedFn = unstable_cache(
    async (...args: A) => {
      const result = await fn(...args);
      if (isEmpty?.(result)) throw new UncachedResult(result);
      return result;
    },
    keyParts,
    { revalidate, tags },
  );

  return async (...args: A): Promise<R> => {
    try {
      return await cachedFn(...args);
    } catch (error) {
      if (error instanceof UncachedResult) return error.value as R;
      throw error;
    }
  };
}
