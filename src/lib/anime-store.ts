import { isAxiosError } from "axios";
import { getAnimeById, getAnimeByIds, isJikanNotFound } from "@/lib/jikan";
import { prisma } from "@/lib/prisma";
import {
  isStale,
  mapJikanAnime,
  planFetches,
  type JikanAnimeData,
  type StoredShow,
} from "@/lib/anime-shape";

// Missing or stale shows fetched per request, all in one batch request
export const BATCH_BUDGET = 25;

const NOT_FOUND_TTL_MS = 6 * 60 * 60 * 1000;
// After an upstream failure, reads and writes use stored data only for this
// long, so an outage costs one slow request per instance, not one per request.
export const OUTAGE_COOLDOWN_MS = 60 * 1000;

// Shared within one server instance so parallel requests do not fetch the same show twice
const inflight = new Map<number, Promise<StoredShow>>();
// Ids upstream does not know, so they do not use up every request's budget
const notFound = new Map<number, number>();
let failedAt = 0;

function recentlyNotFound(id: number) {
  const at = notFound.get(id);
  if (at === undefined) return false;
  if (Date.now() - at > NOT_FOUND_TTL_MS) {
    notFound.delete(id);
    return false;
  }
  return true;
}

function recentlyFailed() {
  return Date.now() - failedAt < OUTAGE_COOLDOWN_MS;
}

function upsertShow(row: ReturnType<typeof mapJikanAnime>) {
  return prisma.anime.upsert({
    where: { id: row.id },
    create: row,
    update: row,
  });
}

function fetchAndStore(id: number) {
  const existing = inflight.get(id);
  if (existing) return existing;

  // Uses the anime page's cached response, so adding a show just viewed costs
  // no extra upstream request.
  const promise = (async () => {
    const data: { data?: JikanAnimeData } = await getAnimeById(id);
    if (!data?.data?.mal_id) throw new Error(`No data for anime ${id}`);
    return upsertShow(mapJikanAnime({ ...data.data, mal_id: id }, new Date()));
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

// Returns stored shows for the ids, fetching a bounded number of missing or
// stale ones first in a single batch request. A failure keeps the stored rows.
export async function ensureShows(ids: number[], budget = BATCH_BUDGET) {
  const shows = await getStoredShows(ids);
  if (recentlyFailed()) return shows;

  const candidates = ids.filter((id) => !recentlyNotFound(id));
  const toFetch = planFetches(candidates, shows, new Date(), budget);
  if (toFetch.length === 0) return shows;

  let found: JikanAnimeData[];
  try {
    found = await getAnimeByIds(toFetch);
  } catch {
    failedAt = Date.now();
    return shows;
  }

  // The batch answer is sorted by id, not in request order.
  const byId = new Map(found.map((anime) => [anime.mal_id, anime]));
  const now = new Date();
  const rows = [];
  for (const id of toFetch) {
    const anime = byId.get(id);
    if (anime) rows.push(mapJikanAnime(anime, now));
    else notFound.set(id, Date.now());
  }

  try {
    const saved = await prisma.$transaction(rows.map(upsertShow));
    for (const show of saved) shows.set(show.id, show);
  } catch {
    // Saving is best effort; the stored rows are still returned.
  }
  return shows;
}

// Best effort: used by writes so an upstream outage never blocks adding a show
export async function storeShow(id: number) {
  try {
    const stored = await prisma.anime.findUnique({ where: { id } });
    if (stored && !isStale(stored, new Date())) return stored;
    if (!stored && recentlyNotFound(id)) return null;
    if (recentlyFailed()) return stored;
    try {
      return await fetchAndStore(id);
    } catch (error) {
      if (isJikanNotFound(error)) notFound.set(id, Date.now());
      else if (isAxiosError(error)) failedAt = Date.now();
      return stored;
    }
  } catch {
    return null;
  }
}
