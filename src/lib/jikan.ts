import { isAxiosError } from "axios";
import { jikanApi } from "@/lib/axios";
import { normalizeSearchQuery } from "@/lib/params";
import { cacheUpstream } from "@/lib/upstream-cache";
import { MAX_PAGE_SIZE, UPSTREAM_NAME } from "@/lib/upstream";
import type { JikanAnimeData } from "@/lib/anime-shape";
import type { Candidate } from "@/lib/recommend";
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
  if (
    !data ||
    typeof data !== "object" ||
    !("data" in data) ||
    data.data === null ||
    data.data === undefined
  ) {
    throw new Error(`Unexpected response from ${UPSTREAM_NAME}`);
  }
  return data;
}

function checkedList<T>(data: { data?: T[] }) {
  if (!Array.isArray(data?.data)) {
    throw new Error(`Unexpected response from ${UPSTREAM_NAME}`);
  }
  return data as { data: T[] };
}

// The cache key is the name plus the JSON of the arguments, so callers must
// pass normalised arguments.
function cached<A extends unknown[], R>(
  name: string,
  revalidate: number,
  fn: (...args: A) => Promise<R>,
  isEmpty?: (result: R) => boolean,
) {
  return cacheUpstream(fn, ["jikan", name], {
    revalidate,
    tags: ["jikan", `jikan:${name}`],
    isEmpty,
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

// One request for many shows. Not cached: every caller asks for a different
// set. Tenrai returns the matches sorted by id and leaves out unknown ids, so
// callers must match results by mal_id, never by position.
export async function getAnimeByIds(ids: number[]): Promise<JikanAnimeData[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  if (unique.length > MAX_PAGE_SIZE) {
    throw new Error(`At most ${MAX_PAGE_SIZE} ids per batch`);
  }
  const { data } = await jikanApi.get<{ data?: JikanAnimeData[] }>("/anime", {
    params: { ids: unique.join(","), limit: unique.length },
  });
  const wanted = new Set(unique);
  return checkedList(data).data.filter((anime) => wanted.has(anime.mal_id));
}

const cachedTopAnime = cached(
  "top-anime",
  HOUR,
  async (page: number, filter: string) => {
    const { data } = await jikanApi.get("/top/anime", {
      params: { page, limit: 20, filter },
    });
    checkedList(data);
    return data;
  },
  (result) => result.data.length === 0,
);

export async function getTopAnime(
  page = 1,
  filter: "airing" | "upcoming" | "bypopularity" | "favorite" = "bypopularity",
) {
  return cachedTopAnime(page, filter);
}

// Shared by every user, and small because only what the feed shows is kept.
const cachedTopByGenre = cached(
  "top-by-genre",
  6 * HOUR,
  async (genreId: number): Promise<Candidate[]> => {
    const { data } = await jikanApi.get<JikanSearchResponse>("/anime", {
      params: {
        genres: genreId,
        order_by: "score",
        sort: "desc",
        limit: 25,
        sfw: true,
      },
    });
    return checkedList(data).data.map((anime) => ({
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image: anime.images.webp.large_image_url,
      score: anime.score,
      genres: anime.genres?.map((g) => g.name) || [],
    }));
  },
  (candidates) => candidates.length === 0,
);

export async function getTopByGenre(genreId: number) {
  return cachedTopByGenre(genreId);
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

interface RelationGroup {
  relation: string;
  entry: { mal_id: number; type?: string; name: string }[];
}

// Relations also list manga, whose ids are a different id space, so only
// anime entries are kept for the /anime/<id> links.
export function animeRelationsOnly(groups: RelationGroup[]) {
  return groups
    .map((group) => ({
      relation: group.relation,
      entry: (group.entry ?? []).filter(
        (entry) => entry.type === undefined || entry.type === "anime",
      ),
    }))
    .filter((group) => group.entry.length > 0);
}

const cachedRelations = cached("anime-relations", DAY, async (id: number) => {
  const { data } = await jikanApi.get<{ data: RelationGroup[] }>(
    `/anime/${id}/relations`,
  );
  return { data: animeRelationsOnly(checkedList(data).data) };
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
    return { data: checkedList(data).data.slice(0, count) };
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
