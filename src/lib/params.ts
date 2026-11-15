export const TOP_FILTERS = [
  "bypopularity",
  "airing",
  "upcoming",
  "favorite",
] as const;
export type TopFilter = (typeof TOP_FILTERS)[number];

export const MAX_PAGE = 10_000;
export const MAX_QUERY_LENGTH = 100;
const MAX_JIKAN_ID = 2_147_483_647;

type ParamValue = string | string[] | undefined;

export function first(value: ParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: ParamValue) {
  const text = first(value)?.trim();
  if (!text || !/^\d+$/.test(text)) return 1;
  const page = Number(text);
  if (page < 1) return 1;
  return Math.min(page, MAX_PAGE);
}

export function parseTopFilter(value: ParamValue): TopFilter {
  const text = first(value);
  return TOP_FILTERS.find((f) => f === text) ?? "bypopularity";
}

export function parseAnimeId(value: ParamValue) {
  const text = first(value);
  if (!text || !/^[1-9]\d{0,9}$/.test(text)) return null;
  const id = Number(text);
  return id <= MAX_JIKAN_ID ? id : null;
}

export function getSearchQuery(value: ParamValue) {
  return (first(value) ?? "").trim();
}

// Tenrai's search ignores case and extra spaces, so these all share one cache entry.
export function normalizeSearchQuery(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, MAX_QUERY_LENGTH)
    .trim();
}

export function uniqueByMalId<T extends { mal_id: number }>(items: T[]) {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.mal_id)) return false;
    seen.add(item.mal_id);
    return true;
  });
}
