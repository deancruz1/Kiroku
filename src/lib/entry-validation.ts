export const ENTRY_STATUSES = [
  "watching",
  "completed",
  "plan_to_watch",
  "dropped",
] as const;

export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export interface EntryUpdate {
  status?: EntryStatus;
  episodes?: number;
  rating?: number | null;
}

const MAX_INT = 2147483647;
const MAX_EPISODES = 100000;
const UPDATE_FIELDS = new Set(["status", "episodes", "rating"]);
export const LIST_NAME_MAX = 60;
export const INVALID_BODY = "Request body must be a JSON object";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEntryStatus(value: unknown): value is EntryStatus {
  return (
    typeof value === "string" &&
    (ENTRY_STATUSES as readonly string[]).includes(value)
  );
}

export function parseAnimeId(value: unknown): Parsed<number> {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_INT
  ) {
    return { ok: false, error: "animeId must be a positive integer" };
  }
  return { ok: true, data: value };
}

export function parseNewEntry(
  body: unknown,
): Parsed<{ animeId: number; status: EntryStatus }> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };

  const animeId = parseAnimeId(body.animeId);
  if (!animeId.ok) return animeId;

  if (!isEntryStatus(body.status)) {
    return {
      ok: false,
      error: `status must be one of ${ENTRY_STATUSES.join(", ")}`,
    };
  }

  return { ok: true, data: { animeId: animeId.data, status: body.status } };
}

export function parseEntryUpdate(
  body: unknown,
  totalEpisodes: number | null,
): Parsed<EntryUpdate> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };

  const unknown = Object.keys(body).filter((key) => !UPDATE_FIELDS.has(key));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown fields: ${unknown.join(", ")}` };
  }

  const data: EntryUpdate = {};

  if ("status" in body) {
    if (!isEntryStatus(body.status)) {
      return {
        ok: false,
        error: `status must be one of ${ENTRY_STATUSES.join(", ")}`,
      };
    }
    data.status = body.status;
  }

  if ("episodes" in body) {
    const episodes = body.episodes;
    if (
      typeof episodes !== "number" ||
      !Number.isInteger(episodes) ||
      episodes < 0 ||
      episodes > MAX_EPISODES
    ) {
      return { ok: false, error: "episodes must be a non-negative integer" };
    }
    if (totalEpisodes && episodes > totalEpisodes) {
      return {
        ok: false,
        error: `episodes cannot be more than ${totalEpisodes}`,
      };
    }
    data.episodes = episodes;
  }

  if ("rating" in body) {
    const rating = body.rating;
    if (
      rating !== null &&
      (typeof rating !== "number" ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 10)
    ) {
      return {
        ok: false,
        error: "rating must be an integer from 1 to 10, or null",
      };
    }
    data.rating = rating;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Nothing to update" };
  }

  return { ok: true, data };
}

export function parseListName(body: unknown): Parsed<string> {
  const name = isObject(body) ? body.name : undefined;
  if (typeof name !== "string") {
    return { ok: false, error: "Name is required" };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "Name is required" };
  if (trimmed.length > LIST_NAME_MAX) {
    return {
      ok: false,
      error: `Name must be ${LIST_NAME_MAX} characters or fewer`,
    };
  }
  return { ok: true, data: trimmed };
}
