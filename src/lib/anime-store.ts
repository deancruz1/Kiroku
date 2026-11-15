import { getAnimeById, isJikanNotFound } from "@/lib/jikan";
import { prisma } from "@/lib/prisma";
import {
  FETCH_BUDGET,
  isStale,
  mapJikanAnime,
  planFetches,
  type JikanAnimeData,
  type StoredShow,
} from "@/lib/anime-shape";

const TIME_BUDGET_MS = 8_000;

const NOT_FOUND_TTL_MS = 6 * 60 * 60 * 1000;

// Shared within one server instance so parallel requests do not fetch the same show twice
const inflight = new Map<number, Promise<StoredShow>>();
// Ids Jikan answered 404 for, so they do not use up every request's budget
const notFound = new Map<number, number>();

function recentlyNotFound(id: number) {
  const at = notFound.get(id);
  if (at === undefined) return false;
  if (Date.now() - at > NOT_FOUND_TTL_MS) {
    notFound.delete(id);
    return false;
  }
  return true;
}

function fetchAndStore(id: number) {
  const existing = inflight.get(id);
  if (existing) return existing;

  // Uses the anime page's cached response, so adding a show just viewed costs
  // no extra Jikan request.
  const promise = (async () => {
    const data: { data?: JikanAnimeData } = await getAnimeById(id);
    if (!data?.data?.mal_id) throw new Error(`No data for anime ${id}`);
    const row = mapJikanAnime({ ...data.data, mal_id: id }, new Date());
    return prisma.anime.upsert({
      where: { id },
      create: row,
      update: row,
    });
  })().finally(() => inflight.delete(id));

  inflight.set(id, promise);
  return promise;
}

export async function getStoredShows(ids: number[]) {
  const unique = [...new Set(ids)];
  const shows = new Map<number, StoredShow>();
  if (unique.length === 0) return shows;

  const rows = await prisma.anime.findMany({ where: { id: { in: unique } } });
  for (const row of rows) shows.set(row.id, row);
  return shows;
}

// Returns stored shows for the ids, fetching a bounded number of missing or stale ones first.
// Stops early when Jikan fails so an outage costs one slow call, not six.
export async function ensureShows(ids: number[], budget = FETCH_BUDGET) {
  const shows = await getStoredShows(ids);
  const candidates = ids.filter((id) => !recentlyNotFound(id));
  const toFetch = planFetches(candidates, shows, new Date(), budget);
  const started = Date.now();

  for (let i = 0; i < toFetch.length; i++) {
    // Request spacing comes from the rate scheduler inside jikanApi.
    if (i > 0 && Date.now() - started > TIME_BUDGET_MS) break;
    try {
      const show = await fetchAndStore(toFetch[i]);
      shows.set(show.id, show);
    } catch (error) {
      if (!isJikanNotFound(error)) break;
      notFound.set(toFetch[i], Date.now());
    }
  }

  return shows;
}

// Best effort: used by writes so a Jikan outage never blocks adding a show
export async function storeShow(id: number) {
  try {
    const stored = await prisma.anime.findUnique({ where: { id } });
    if (stored && !isStale(stored, new Date())) return stored;
    if (!stored && recentlyNotFound(id)) return null;
    try {
      return await fetchAndStore(id);
    } catch (error) {
      if (isJikanNotFound(error)) notFound.set(id, Date.now());
      return stored;
    }
  } catch {
    return null;
  }
}
