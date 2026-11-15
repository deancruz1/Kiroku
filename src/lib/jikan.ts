import { isAxiosError } from "axios";
import { unstable_cache } from "next/cache";
import { jikanApi } from "@/lib/axios";
import { normalizeSearchQuery } from "@/lib/params";
import type { JikanCharacter, JikanSearchResponse } from "@/types/anime";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Searches outside these bounds are fetched without caching, so typed-in
// queries cannot fill the data cache with one-off entries.
const SEARCH_CACHE_MAX_PAGE = 5;
const SEARCH_CACHE_MAX_LENGTH = 50;

// unstable_cache only stores what the function returns, so throwing here keeps
// error pages and odd bodies out of the cache.
function checked<T>(data: T): T {
  if (!data || typeof data !== "object" || !("data" in data)) {
    throw new Error("Unexpected response from Jikan");
  }
  return data;
}

// The cache key is the name plus the JSON of the arguments, so callers must
// pass normalised arguments.
function cached<A extends unknown[], R>(
  name: string,
  revalidate: number,
  fn: (...args: A) => Promise<R>,
) {
  return unstable_cache(fn, ["jikan", name], {
    revalidate,
    tags: ["jikan", `jikan:${name}`],
  });
}

export function isJikanNotFound(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404;
}

async function fetchSearch(query: string, page: number) {
  const { data } = await jikanApi.get<JikanSearchResponse>("/anime", {
    params: { q: query, page, limit: 20 },
  });
  return checked(data);
}

const cachedSearch = cached("search", 10 * MINUTE, fetchSearch);

export async function searchAnime(query: string, page = 1) {
  const q = normalizeSearchQuery(query);
  if (page <= SEARCH_CACHE_MAX_PAGE && q.length <= SEARCH_CACHE_MAX_LENGTH) {
    return cachedSearch(q, page);
  }
  return fetchSearch(q, page);
}

const cachedAnimeById = cached("anime-full", 6 * HOUR, async (id: number) => {
  const { data } = await jikanApi.get(`/anime/${id}/full`);
  return checked(data);
});

export async function getAnimeById(id: number) {
  return cachedAnimeById(id);
}

const cachedTopAnime = cached(
  "top-anime",
  HOUR,
  async (page: number, filter: string) => {
    const { data } = await jikanApi.get("/top/anime", {
      params: { page, limit: 20, filter },
    });
    return checked(data);
  },
);

export async function getTopAnime(
  page = 1,
  filter: "airing" | "upcoming" | "bypopularity" | "favorite" = "bypopularity",
) {
  return cachedTopAnime(page, filter);
}

const cachedRecommendations = cached(
  "anime-recommendations",
  DAY,
  async (id: number) => {
    const { data } = await jikanApi.get(`/anime/${id}/recommendations`);
    return checked(data);
  },
);

export async function getAnimeRecommendations(id: number) {
  return cachedRecommendations(id);
}

const cachedVideos = cached("anime-videos", DAY, async (id: number) => {
  const { data } = await jikanApi.get(`/anime/${id}/videos`);
  return checked(data);
});

export async function getAnimeVideos(id: number) {
  return cachedVideos(id);
}

const cachedRelations = cached("anime-relations", DAY, async (id: number) => {
  const { data } = await jikanApi.get(`/anime/${id}/relations`);
  return checked(data);
});

export async function getAnimeRelations(id: number) {
  return cachedRelations(id);
}

// Long-running shows list over a thousand characters, which can pass the data
// cache's 2 MB entry limit, so only the slice a page shows is stored.
const cachedCharacterPreview = cached(
  "anime-characters-preview",
  DAY,
  async (id: number, count: number) => {
    const { data } = await jikanApi.get<{ data: JikanCharacter[] }>(
      `/anime/${id}/characters`,
    );
    return { data: checked(data).data.slice(0, count) };
  },
);

export async function getAnimeCharacterPreview(id: number, count = 12) {
  return cachedCharacterPreview(id, count);
}

// The reviews endpoint takes page, preliminary and spoilers, not limit.
const cachedReviews = cached(
  "anime-reviews",
  12 * HOUR,
  async (id: number, page: number) => {
    const { data } = await jikanApi.get(`/anime/${id}/reviews`, {
      params: { page },
    });
    return checked(data);
  },
);

export async function getAnimeReviews(id: number, page = 1) {
  return cachedReviews(id, page);
}
