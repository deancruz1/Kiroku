import { jikanApi } from "@/lib/axios";
import { getWeeklySlot } from "@/lib/broadcast";
import { first } from "@/lib/params";
import { fromSource, UpstreamShapeError } from "@/lib/show-source";
import { UPSTREAM_NAME } from "@/lib/upstream";
import { cacheUpstream } from "@/lib/upstream-cache";
import type { JikanAnime } from "@/types/anime";

export const SEASONS = ["winter", "spring", "summer", "fall"] as const;
export type SeasonName = (typeof SEASONS)[number];

export const FIRST_SEASON_YEAR = 1917;
export const PAGE_SIZE = 25;
export const MAX_SEASON_PAGES = 20;
// Leaves room inside the route's maxDuration for one more slow request and the
// season list, so a slow upstream returns a partial season instead of timing out.
const LOAD_BUDGET_MS = 35_000;
export const CALENDAR_CACHE_SECONDS = 10800;
export const ARCHIVE_CACHE_SECONDS = 86400;

const CALENDAR_TYPES = ["TV", "ONA"];

// Loaded only when v2 is used. mal-season imports this module, so a static
// import would be circular.
const loadMalSeason = () => import("@/lib/mal-season");

interface DateProp {
  day: number | null;
  month: number | null;
  year: number | null;
}

export type SeasonAnime = JikanAnime & {
  type: string | null;
  aired: JikanAnime["aired"] & {
    prop?: { from: DateProp | null; to: DateProp | null };
  };
  broadcast: JikanAnime["broadcast"] & {
    timezone?: string | null;
    string?: string | null;
  };
};

interface RawPage {
  data?: SeasonAnime[];
  pagination?: { last_visible_page?: number; has_next_page?: boolean };
}

export interface SeasonPage {
  anime: SeasonAnime[];
  lastPage: number;
}

export class PartialSeasonError extends Error {
  constructor(
    public anime: SeasonAnime[],
    cause: unknown,
  ) {
    super("Season loaded only in part", { cause });
    this.name = "PartialSeasonError";
  }
}

export function getSeasonAt(now: Date): { year: number; season: SeasonName } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, season: SEASONS[Math.floor((month - 1) / 3)] };
}

export function compareSeasons(
  a: { year: number; season: SeasonName },
  b: { year: number; season: SeasonName },
): number {
  if (a.year !== b.year) return a.year - b.year;
  return SEASONS.indexOf(a.season) - SEASONS.indexOf(b.season);
}

export type SeasonQuery =
  | { kind: "current" }
  | { kind: "season"; year: number; season: SeasonName; page: number }
  | { kind: "redirect"; to: string };

export function parseSeasonQuery(params: {
  year?: string | string[];
  season?: string | string[];
  page?: string | string[];
}): SeasonQuery {
  const year = first(params.year)?.trim();
  const season = first(params.season)?.trim().toLowerCase();
  const page = first(params.page)?.trim();

  if (!year && !season) return { kind: "current" };
  if (!year || !season || !/^\d{4}$/.test(year)) return { kind: "redirect", to: "/season" };
  if (!(SEASONS as readonly string[]).includes(season))
    return { kind: "redirect", to: "/season" };

  const base = `/season?year=${year}&season=${season}`;
  if (page !== undefined && !/^[1-9]\d{0,3}$/.test(page)) return { kind: "redirect", to: base };

  return {
    kind: "season",
    year: Number(year),
    season: season as SeasonName,
    page: page ? Number(page) : 1,
  };
}

export function toSeasonAnime(anime: SeasonAnime): SeasonAnime {
  return {
    mal_id: anime.mal_id,
    title: anime.title,
    title_english: anime.title_english ?? null,
    title_japanese: anime.title_japanese ?? null,
    images: {
      jpg: {
        image_url: anime.images?.jpg?.image_url ?? "",
        small_image_url: anime.images?.jpg?.small_image_url ?? "",
        large_image_url: anime.images?.jpg?.large_image_url ?? "",
      },
      webp: {
        image_url: anime.images?.webp?.image_url ?? "",
        small_image_url: anime.images?.webp?.small_image_url ?? "",
        large_image_url: anime.images?.webp?.large_image_url ?? "",
      },
    },
    synopsis: null,
    episodes: anime.episodes ?? null,
    status: anime.status,
    aired: {
      from: anime.aired?.from ?? null,
      to: anime.aired?.to ?? null,
      prop: anime.aired?.prop
        ? { from: anime.aired.prop.from ?? null, to: anime.aired.prop.to ?? null }
        : undefined,
    },
    score: anime.score ?? null,
    genres: (anime.genres ?? []).map((g) => ({ mal_id: g.mal_id, name: g.name })),
    studios: (anime.studios ?? []).map((s) => ({ mal_id: s.mal_id, name: s.name })),
    season: anime.season ?? null,
    year: anime.year ?? null,
    type: anime.type ?? null,
    broadcast: {
      day: anime.broadcast?.day ?? null,
      time: anime.broadcast?.time ?? null,
      timezone: anime.broadcast?.timezone ?? null,
      string: anime.broadcast?.string ?? null,
    },
  };
}

// Movies, specials, music videos and the like have no weekly slot.
export function belongsOnCalendar(anime: SeasonAnime): boolean {
  if (anime.type && CALENDAR_TYPES.includes(anime.type)) return true;
  return getWeeklySlot(anime.broadcast) !== null;
}

function unexpectedPage() {
  return new UpstreamShapeError(`Unexpected season page from ${UPSTREAM_NAME}`);
}

// Request spacing comes from the rate scheduler inside jikanApi.
// `continuing` adds shows carried over from earlier seasons (long runners
// such as One Piece), which still air every week.
export async function fetchCalendarSeason(
  path: string,
  { maxPages = MAX_SEASON_PAGES } = {},
): Promise<SeasonAnime[]> {
  const seen = new Set<number>();
  const anime: SeasonAnime[] = [];
  const started = Date.now();

  for (let page = 1; page <= maxPages; page++) {
    if (page > 1 && Date.now() - started > LOAD_BUDGET_MS) {
      throw new PartialSeasonError(anime, new Error("Season load ran out of time"));
    }
    let body: RawPage;
    try {
      ({ data: body } = await jikanApi.get<RawPage>(path, {
        params: { page, limit: PAGE_SIZE, continuing: true, sfw: true },
      }));
      if (!Array.isArray(body?.data)) throw unexpectedPage();
    } catch (error) {
      if (page === 1) throw error;
      throw new PartialSeasonError(anime, error);
    }

    for (const item of body.data ?? []) {
      if (seen.has(item.mal_id)) continue;
      seen.add(item.mal_id);
      const slim = toSeasonAnime(item);
      if (belongsOnCalendar(slim)) anime.push(slim);
    }

    if (!body.pagination?.has_next_page) break;
  }

  return anime;
}

// A thrown error is never cached, so a failed or partial load is retried on the next visit.
// An empty season is returned but not cached either.
// seasonKey only splits the cache, so /seasons/now is not reused once the season changes.
// "sfw" in the key parts keeps entries stored before the safe filter from being served.
const getCachedCalendarSeason = cacheUpstream(
  async (path: string, seasonKey: string) => {
    void seasonKey;
    return fetchCalendarSeason(path);
  },
  ["season-calendar", "sfw"],
  {
    revalidate: CALENDAR_CACHE_SECONDS,
    tags: ["season-calendar"],
    isEmpty: (anime) => anime.length === 0,
  },
);

// A Tenrai load that fails part-way is shown in part, not filled from v2.
export async function getCalendarSeason(
  year: number,
  season: SeasonName,
  isCurrent: boolean,
): Promise<{ anime: SeasonAnime[]; complete: boolean }> {
  return fromSource(
    () => getTenraiCalendarSeason(year, season, isCurrent),
    async () => (await loadMalSeason()).getCalendarSeason(year, season, isCurrent),
  );
}

async function getTenraiCalendarSeason(
  year: number,
  season: SeasonName,
  isCurrent: boolean,
): Promise<{ anime: SeasonAnime[]; complete: boolean }> {
  const path = isCurrent ? "/seasons/now" : `/seasons/${year}/${season}`;
  try {
    return {
      anime: await getCachedCalendarSeason(path, `${year}-${season}`),
      complete: true,
    };
  } catch (error) {
    if (error instanceof PartialSeasonError) {
      return { anime: error.anime, complete: false };
    }
    throw error;
  }
}

// Pages past the end and seasons with no shows come back empty; they are
// shown but not cached.
const getCachedArchiveSeasonPage = cacheUpstream(
  async (year: number, season: SeasonName, page: number): Promise<SeasonPage> => {
    const { data } = await jikanApi.get<RawPage>(`/seasons/${year}/${season}`, {
      params: { page, limit: PAGE_SIZE, sfw: true },
    });
    if (!Array.isArray(data?.data)) throw unexpectedPage();
    return {
      anime: data.data.map(toSeasonAnime),
      lastPage: Math.max(1, data.pagination?.last_visible_page ?? 1),
    };
  },
  ["season-archive", "sfw"],
  {
    revalidate: ARCHIVE_CACHE_SECONDS,
    tags: ["season-archive"],
    isEmpty: (result) => result.anime.length === 0,
  },
);

export async function getArchiveSeasonPage(
  year: number,
  season: SeasonName,
  page: number,
): Promise<SeasonPage> {
  return fromSource(
    () => getCachedArchiveSeasonPage(year, season, page),
    async () => (await loadMalSeason()).getArchiveSeasonPage(year, season, page),
  );
}

const getCachedSeasonYears = cacheUpstream(
  async (): Promise<number[]> => {
    const { data } = await jikanApi.get<{ data?: { year: number }[] }>("/seasons");
    const years = [...new Set((data.data ?? []).map((s) => s.year))];
    if (years.length === 0) throw new UpstreamShapeError("Empty season list");
    return years.sort((a, b) => b - a);
  },
  ["season-years"],
  { revalidate: ARCHIVE_CACHE_SECONDS, tags: ["season-years"] },
);

export async function getSeasonYears(): Promise<number[]> {
  return fromSource(
    () => getCachedSeasonYears(),
    async () => (await loadMalSeason()).getSeasonYears(),
  );
}
