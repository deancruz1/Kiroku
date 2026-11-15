import { isAxiosError } from "axios";
import { malApi } from "@/lib/mal-axios";
import {
  fromMal,
  isListed,
  mapMalAnime,
  mapMalCharacters,
  mapMalRecommendations,
  mapMalRelations,
  mapMalVideos,
  readCharacters,
  readList,
  readNode,
  type MalAnime,
  type FromMal,
  type MalCharacterEdge,
  type MalGap,
  type MalRelationGroup,
  type MalVideos,
} from "@/lib/mal-shape";
import { normalizeSearchQuery, uniqueByMalId, type TopFilter } from "@/lib/params";
import { cacheUpstream } from "@/lib/upstream-cache";
import {
  MAL_BATCH_BUDGET,
  MAL_MAX_LIST_LIMIT,
  MAL_MAX_QUERY_LENGTH,
  MAL_MIN_QUERY_LENGTH,
} from "@/lib/upstream";
import type { Candidate } from "@/lib/recommend";
import type { JikanCharacter, JikanRecommendation, JikanReview } from "@/types/anime";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const SEARCH_CACHE_MAX_PAGE = 5;
const SEARCH_CACHE_MAX_LENGTH = 50;
const PAGE_SIZE = 20;
// Rankings are read in blocks of 500 and filtered here, so the window is
// the first 1,000 rows of a ranking.
const RANKING_WINDOW_BLOCKS = 2;
const GENRE_LIST_SIZE = 25;
const CHARACTER_PAGE_LIMIT = 100;
const CHARACTER_PAGES = 2;

const ROW_FIELDS =
  "id,title,main_picture,alternative_titles,mean,media_type,num_episodes,status,start_date,end_date,start_season,genres,rating";
const STORE_FIELDS =
  "id,title,alternative_titles,main_picture,num_episodes,genres,mean,status,average_episode_duration,start_season";
// videos is not in the v2 reference but is returned on every details request tried.
const DETAIL_FIELDS = `${ROW_FIELDS},synopsis,background,broadcast,average_episode_duration,studios,related_anime,recommendations,videos`;
const CHARACTER_FIELDS = "id,first_name,last_name,main_picture";

function cached<A extends unknown[], R>(
  name: string,
  revalidate: number,
  fn: (...args: A) => Promise<R>,
  isEmpty?: (result: R) => boolean,
) {
  return cacheUpstream(fn, ["mal", name], {
    revalidate,
    tags: ["mal", `mal:${name}`],
    isEmpty,
  });
}

// unstable_cache does not merge parallel misses, and one v2 reply feeds
// several sections of a page, so calls for the same arguments share a promise.
function shared<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const inflight = new Map<string, Promise<R>>();
  return (...args: A): Promise<R> => {
    const key = JSON.stringify(args);
    let promise = inflight.get(key);
    if (!promise) {
      promise = fn(...args).finally(() => inflight.delete(key));
      inflight.set(key, promise);
    }
    return promise;
  };
}

function isNotFound(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404;
}

export interface MalSearchResponse extends FromMal {
  data: MalAnime[];
  pagination: {
    // The last page known so far: v2 only says whether a next page exists.
    last_visible_page: number;
    has_next_page: boolean;
    items: { count: number; total: null; per_page: number };
  };
}

// v2 searches only 3 to 64 characters. A longer query is cut at the last
// space before the limit, so no word is cut in half. A shorter one returns null.
export function malSearchQuery(query: string): string | null {
  const q = normalizeSearchQuery(query);
  const chars = Array.from(q);
  if (chars.length < MAL_MIN_QUERY_LENGTH) return null;
  if (chars.length <= MAL_MAX_QUERY_LENGTH) return q;

  const cut = chars.slice(0, MAL_MAX_QUERY_LENGTH).join("");
  const space = cut.lastIndexOf(" ");
  const atWord =
    chars[MAL_MAX_QUERY_LENGTH] !== " " && space > 0 ? cut.slice(0, space).trim() : cut.trim();
  return Array.from(atWord).length >= MAL_MIN_QUERY_LENGTH ? atWord : cut.trim();
}

async function fetchSearch(q: string, page: number): Promise<MalSearchResponse> {
  const { data } = await malApi.get("/anime", {
    params: {
      q,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      nsfw: true,
      fields: ROW_FIELDS,
    },
  });
  const { nodes, paging } = readList(data);
  const rows = nodes.filter(isListed).map(mapMalAnime);
  const hasNext = Boolean(paging.next);
  return fromMal(
    {
      data: rows,
      pagination: {
        last_visible_page: hasNext ? page + 1 : page,
        has_next_page: hasNext,
        items: { count: rows.length, total: null, per_page: PAGE_SIZE },
      },
    },
    ["total", "lastPage"],
  );
}

const cachedSearch = cached("search", 10 * MINUTE, fetchSearch);

// Rows rated R+ or Rx are dropped after the page is cut, so a page can hold
// fewer than 20 shows.
export async function searchAnime(query: string, page = 1): Promise<MalSearchResponse> {
  const q = malSearchQuery(query);
  if (q === null) {
    return fromMal(
      {
        data: [],
        pagination: {
          last_visible_page: 1,
          has_next_page: false,
          items: { count: 0, total: null, per_page: PAGE_SIZE },
        },
      },
      ["query"],
    );
  }
  if (page <= SEARCH_CACHE_MAX_PAGE && q.length <= SEARCH_CACHE_MAX_LENGTH) {
    return cachedSearch(q, page);
  }
  return fetchSearch(q, page);
}

interface MalDetails {
  anime: MalAnime;
  recommendations: JikanRecommendation[];
  relations: MalRelationGroup[];
  videos: MalVideos;
}

// One request covers the show, its recommendations, relations and videos.
const getDetails = shared(
  cached("anime-details", 6 * HOUR, async (id: number): Promise<MalDetails> => {
    const { data } = await malApi.get(`/anime/${id}`, { params: { fields: DETAIL_FIELDS } });
    const node = readNode(data);
    return {
      anime: mapMalAnime(node),
      recommendations: mapMalRecommendations(node),
      relations: mapMalRelations(node),
      videos: mapMalVideos(node),
    };
  }),
);

export async function getAnimeById(id: number) {
  return fromMal({ data: (await getDetails(id)).anime });
}

// v2 returns at most 10 recommendations.
export async function getAnimeRecommendations(id: number) {
  return fromMal({ data: (await getDetails(id)).recommendations });
}

export async function getAnimeVideos(id: number) {
  return fromMal({ data: (await getDetails(id)).videos }, ["episodeVideos", "musicVideos"]);
}

// v2 lists manga relations separately, so these are all anime.
export async function getAnimeRelations(id: number) {
  return fromMal({ data: (await getDetails(id)).relations });
}

// Not cached: every caller asks for a different set. Ids v2 does not know are
// left out, as Tenrai does. Any other failure fails the whole batch, so a
// caller never takes a failed id for a missing show.
export async function getAnimeByIds(ids: number[]): Promise<MalAnime[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  if (unique.length > MAL_BATCH_BUDGET) {
    throw new Error(`At most ${MAL_BATCH_BUDGET} ids per batch`);
  }
  const settled = await Promise.allSettled(
    unique.map((id) => malApi.get(`/anime/${id}`, { params: { fields: STORE_FIELDS } })),
  );
  const shows: MalAnime[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") shows.push(mapMalAnime(readNode(result.value.data)));
    else if (!isNotFound(result.reason)) throw result.reason;
  }
  const wanted = new Set(unique);
  return shows.filter((anime) => wanted.has(anime.mal_id));
}

interface RankingBlock {
  rows: MalAnime[];
  hasNext: boolean;
}

async function fetchRankingBlock(rankingType: string, block: number): Promise<RankingBlock> {
  const { data } = await malApi.get("/anime/ranking", {
    params: {
      ranking_type: rankingType,
      limit: MAL_MAX_LIST_LIMIT,
      offset: block * MAL_MAX_LIST_LIMIT,
      fields: ROW_FIELDS,
    },
  });
  const { nodes, paging } = readList(data);
  return { rows: nodes.filter(isListed).map(mapMalAnime), hasNext: Boolean(paging.next) };
}

const getRankingBlock = shared(
  cached("ranking", HOUR, fetchRankingBlock, (block) => block.rows.length === 0),
);
const getScoreRankingBlock = shared(
  cached("ranking-all", 6 * HOUR, fetchRankingBlock, (block) => block.rows.length === 0),
);

async function rankingWindow(
  rankingType: string,
  getBlock: (rankingType: string, block: number) => Promise<RankingBlock>,
) {
  const rows: MalAnime[] = [];
  let ended = false;
  for (let block = 0; block < RANKING_WINDOW_BLOCKS; block++) {
    const result = await getBlock(rankingType, block);
    rows.push(...result.rows);
    if (!result.hasNext) {
      ended = true;
      break;
    }
  }
  return { rows: uniqueByMalId(rows), ended };
}

export interface MalTopResponse extends FromMal {
  data: MalAnime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    items: { count: number; total: number | null; per_page: number };
  };
}

// Rankings ignore nsfw, so adult rows are dropped here. v2 has no total, so
// only the first 1,000 rows are paged. When a ranking ends inside that window
// (airing, upcoming) the total is known; otherwise the total, the last page
// and pages past the window are unavailable.
export async function getTopAnime(
  page = 1,
  filter: TopFilter = "bypopularity",
): Promise<MalTopResponse> {
  const { rows, ended } = await rankingWindow(filter, getRankingBlock);
  const start = (page - 1) * PAGE_SIZE;
  const data = rows.slice(start, start + PAGE_SIZE);
  const knownPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const unavailable: MalGap[] = ended ? [] : ["total", "lastPage"];
  if (!ended && page > knownPages) unavailable.push("page");
  return fromMal(
    {
      data,
      pagination: {
        last_visible_page: knownPages,
        has_next_page: page < knownPages,
        items: { count: data.length, total: ended ? rows.length : null, per_page: PAGE_SIZE },
      },
    },
    unavailable,
  );
}

// v2 ignores a genre filter, so the top 1,000 by score are filtered here. The
// id may be a genre, theme or demographic, as Tenrai's genres parameter allows.
// Thin genres (Horror, Josei) can return fewer than 25.
const cachedTopByGenre = cached(
  "top-by-genre",
  6 * HOUR,
  async (genreId: number): Promise<Candidate[]> => {
    const { rows } = await rankingWindow("all", getScoreRankingBlock);
    return rows
      .filter((anime) =>
        [...anime.genres, ...anime.themes, ...anime.demographics].some(
          (genre) => genre.mal_id === genreId,
        ),
      )
      .slice(0, GENRE_LIST_SIZE)
      .map((anime) => ({
        mal_id: anime.mal_id,
        title: anime.title_english || anime.title,
        image: anime.images.webp.large_image_url,
        score: anime.score,
        genres: anime.genres.map((g) => g.name),
      }));
  },
  (candidates) => candidates.length === 0,
);

export async function getTopByGenre(genreId: number) {
  return cachedTopByGenre(genreId);
}

// The characters endpoint is not in the v2 reference. It has no voice actors.
const cachedCharacterPreview = cached(
  "anime-characters-preview",
  DAY,
  async (id: number, count: number) => {
    const edges: MalCharacterEdge[] = [];
    for (let page = 0; page < CHARACTER_PAGES; page++) {
      const { data } = await malApi.get(`/anime/${id}/characters`, {
        params: {
          limit: CHARACTER_PAGE_LIMIT,
          offset: page * CHARACTER_PAGE_LIMIT,
          fields: CHARACTER_FIELDS,
        },
      });
      const list = readCharacters(data);
      edges.push(...list.edges);
      if (!list.paging.next) break;
    }
    return { data: mapMalCharacters(edges).slice(0, count) };
  },
);

export async function getAnimeCharacterPreview(
  id: number,
  count = 12,
): Promise<{ data: JikanCharacter[] } & FromMal> {
  return fromMal(await cachedCharacterPreview(id, count), ["voiceActors"]);
}

// v2 has no reviews.
export async function getAnimeReviews(id: number, page = 1) {
  void id;
  void page;
  const data: JikanReview[] = [];
  return fromMal(
    { data, pagination: { last_visible_page: 1, has_next_page: false } },
    ["reviews"],
  );
}
