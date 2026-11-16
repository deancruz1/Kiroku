import type { RateLimit } from "@/lib/rate-scheduler";

// The one place that decides which API show data comes from. Tenrai follows
// the Jikan v4 schema, so the jikan* modules work against it unchanged.
export const UPSTREAM_NAME = "Tenrai";
export const UPSTREAM_BASE_URL = "https://api.tenrai.org/v1";

// Tenrai documents 4 requests/second and 120/minute per IP and sends no
// rate-limit headers. These stay under both with room for jitter and for
// other instances sharing an egress IP. The per-second window is padded by
// 10% so network jitter does not push two bursts into one second.
export const UPSTREAM_LIMITS: RateLimit[] = [
  { max: 3, windowMs: 1_100 },
  { max: 100, windowMs: 60_000 },
];

// Tenrai rejects limit above 100 with a 400.
export const MAX_PAGE_SIZE = 100;

// The official MyAnimeList API v2, kept as a second source. Its rate limit is
// not published and it sends no rate-limit headers. 96 probe requests at one
// per 1.1 seconds were not throttled, so that is the fastest pace used here,
// with a per-minute cap well below it.
export const MAL_NAME = "MyAnimeList";
export const MAL_BASE_URL = "https://api.myanimelist.net/v2";
export const MAL_CLIENT_ID_HEADER = "X-MAL-CLIENT-ID";
export const MAL_LIMITS: RateLimit[] = [
  { max: 1, windowMs: 1_100 },
  { max: 30, windowMs: 60_000 },
];

// Season and ranking reject limit above 500 with a 400.
export const MAL_MAX_LIST_LIMIT = 500;

// Search answers 400 for a q shorter than 3 or longer than 64 characters.
export const MAL_MIN_QUERY_LENGTH = 3;
export const MAL_MAX_QUERY_LENGTH = 64;
// Lists answer 400 when offset + limit is over this, even for a search with
// fewer results. Past it there is nothing v2 will return.
export const MAL_MAX_LIST_END = 100_000;

// A 403 after earlier successes may be a block, so requests stop for this long.
export const MAL_BLOCK_COOLDOWN_MS = 5 * 60 * 1000;

// v2 has no batch endpoint, so a refresh costs one request per show.
export const MAL_BATCH_BUDGET = 6;
