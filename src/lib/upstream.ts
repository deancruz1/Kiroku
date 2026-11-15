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
