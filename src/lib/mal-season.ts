import { isAxiosError } from "axios";
import { malApi } from "@/lib/mal-axios";
import { isListed, mapMalAnime, readList } from "@/lib/mal-shape";
import {
  ARCHIVE_CACHE_SECONDS,
  CALENDAR_CACHE_SECONDS,
  FIRST_SEASON_YEAR,
  PAGE_SIZE,
  PartialSeasonError,
  belongsOnCalendar,
  getSeasonAt,
  toSeasonAnime,
  type SeasonAnime,
  type SeasonName,
  type SeasonPage,
} from "@/lib/season";
import { MAL_MAX_LIST_LIMIT } from "@/lib/upstream";
import { cacheUpstream } from "@/lib/upstream-cache";

const SEASON_FIELDS =
  "id,title,main_picture,alternative_titles,start_date,end_date,mean,genres,media_type,status,num_episodes,start_season,broadcast,rating,studios";
// One request holds a whole season (Fall 2025 has 360 rows with nsfw=true).
const MAX_SEASON_REQUESTS = 3;
// Tenrai's season replies leave these out.
const UNLISTED_TYPES = new Set(["music", "pv", "cm"]);

// nsfw=true keeps all-ages shows that MyAnimeList marks "gray"; adult ratings
// are dropped here instead. Sorted by members, which is Tenrai's order.
// A season v2 does not know answers 404, which counts as an empty season.
export async function fetchSeasonRows(
  year: number,
  season: SeasonName,
): Promise<SeasonAnime[]> {
  const seen = new Set<number>();
  const anime: SeasonAnime[] = [];

  for (let request = 0; request < MAX_SEASON_REQUESTS; request++) {
    let list: ReturnType<typeof readList>;
    try {
      const { data } = await malApi.get(`/anime/season/${year}/${season}`, {
        params: {
          limit: MAL_MAX_LIST_LIMIT,
          offset: request * MAL_MAX_LIST_LIMIT,
          nsfw: true,
          sort: "anime_num_list_users",
          fields: SEASON_FIELDS,
        },
      });
      list = readList(data);
    } catch (error) {
      if (request > 0) throw new PartialSeasonError(anime, error);
      if (isAxiosError(error) && error.response?.status === 404) return [];
      throw error;
    }

    for (const node of list.nodes) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      if (!isListed(node) || UNLISTED_TYPES.has(node.media_type ?? "")) continue;
      anime.push(toSeasonAnime(mapMalAnime(node)));
    }

    if (!list.paging.next) break;
  }

  return anime;
}

// The calendar uses every row, as Tenrai's continuing list does.
const getCachedCalendarSeason = cacheUpstream(
  async (year: number, season: SeasonName) =>
    (await fetchSeasonRows(year, season)).filter(belongsOnCalendar),
  ["mal", "season-calendar", "sfw"],
  {
    revalidate: CALENDAR_CACHE_SECONDS,
    tags: ["mal", "mal:season-calendar"],
    isEmpty: (anime) => anime.length === 0,
  },
);

export async function getCalendarSeason(
  year: number,
  season: SeasonName,
  isCurrent: boolean,
): Promise<{ anime: SeasonAnime[]; complete: boolean }> {
  void isCurrent;
  try {
    return { anime: await getCachedCalendarSeason(year, season), complete: true };
  } catch (error) {
    if (error instanceof PartialSeasonError) {
      return { anime: error.anime.filter(belongsOnCalendar), complete: false };
    }
    throw error;
  }
}

// Tenrai's archive view leaves out TV shows carried over from an earlier
// season but keeps carried-over ONAs and OVAs. This matched its Fall 2025 set
// exactly (175 of 175).
function belongsInArchive(anime: SeasonAnime, year: number, season: SeasonName) {
  return (anime.season === season && anime.year === year) || anime.type !== "TV";
}

// The whole season is one cached entry, paged here.
const getCachedArchiveSeason = cacheUpstream(
  async (year: number, season: SeasonName) =>
    (await fetchSeasonRows(year, season)).filter((anime) =>
      belongsInArchive(anime, year, season),
    ),
  ["mal", "season-archive", "sfw"],
  {
    revalidate: ARCHIVE_CACHE_SECONDS,
    tags: ["mal", "mal:season-archive"],
    isEmpty: (anime) => anime.length === 0,
  },
);

export async function getArchiveSeasonPage(
  year: number,
  season: SeasonName,
  page: number,
): Promise<SeasonPage> {
  const rows = await getCachedArchiveSeason(year, season);
  const start = (page - 1) * PAGE_SIZE;
  return {
    anime: rows.slice(start, start + PAGE_SIZE),
    lastPage: Math.max(1, Math.ceil(rows.length / PAGE_SIZE)),
  };
}

// v2 has no list of seasons (GET /anime/season answers 403). 1917 is the
// first year with shows on v2, so the list is every year from then to next year.
export async function getSeasonYears(): Promise<number[]> {
  const last = getSeasonAt(new Date()).year + 1;
  return Array.from({ length: last - FIRST_SEASON_YEAR + 1 }, (_, i) => last - i);
}
