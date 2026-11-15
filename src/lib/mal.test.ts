import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import searchFrieren from "@/lib/fixtures/mal/search-frieren-p1.json";
import searchKuroinu from "@/lib/fixtures/mal/search-kuroinu-nsfw-true.json";
import rankingAiring from "@/lib/fixtures/mal/ranking-airing-p1.json";
import rankingAll from "@/lib/fixtures/mal/ranking-all-p1.json";
import fmab from "@/lib/fixtures/mal/details-5114-finished.json";
import fmabVideos from "@/lib/fixtures/mal/details-5114-videos.json";
import apothecary from "@/lib/fixtures/mal/details-61987-show-page.json";
import frieren from "@/lib/fixtures/mal/details-52991-finished.json";
import fmabCharacters from "@/lib/fixtures/mal/characters-5114-p1.json";
import notFoundBody from "@/lib/fixtures/mal/error-not-found.json";
import tenraiSearch from "@/lib/fixtures/tenrai/search-frieren-p1.json";
import tenraiGenreAction from "@/lib/fixtures/tenrai/genre-action-by-score-sfw.json";
import tenraiCharacters from "@/lib/fixtures/tenrai/fmab-5114-characters.json";

const { get, store } = vi.hoisted(() => ({
  get: vi.fn(),
  store: new Map<string, unknown>(),
}));

vi.mock("next/cache", () => ({
  unstable_cache:
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>, keyParts: string[]) =>
    async (...args: A) => {
      const key = `${keyParts.join(",")}-${JSON.stringify(args)}`;
      if (store.has(key)) return store.get(key) as R;
      const result = await fn(...args);
      store.set(key, result);
      return result;
    },
}));
vi.mock("@/lib/mal-axios", () => ({ malApi: { get } }));

import { isJikanNotFound } from "@/lib/jikan";
import {
  getAnimeById,
  getAnimeByIds,
  getAnimeCharacterPreview,
  getAnimeRecommendations,
  getAnimeRelations,
  getAnimeReviews,
  getAnimeVideos,
  getTopAnime,
  getTopByGenre,
  malSearchQuery,
  searchAnime,
} from "@/lib/mal";

vi.mock("@/lib/axios", () => ({ jikanApi: { get: vi.fn() } }));

function reply<T>(data: T) {
  return { data };
}

function httpError(status: number, data: unknown = notFoundBody) {
  const config = { headers: new AxiosHeaders() };
  const response = { data, status, statusText: "", headers: {}, config } as AxiosResponse;
  return new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response);
}

type Row = { node: { id: number; title: string; rating?: string; genres?: { id: number; name: string }[] } };

function block(rows: Row[], next: boolean) {
  return reply({ data: rows, paging: next ? { next: "https://api.myanimelist.net/v2/next" } : {} });
}

function rows(from: number, count: number, extra: Partial<Row["node"]> = {}): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    node: { id: from + i, title: `Show ${from + i}`, ...extra },
  }));
}

beforeEach(() => {
  get.mockReset();
  store.clear();
});

describe("searchAnime", () => {
  it("asks for 20 rows with nsfw on and returns the same shows as Tenrai", async () => {
    get.mockResolvedValueOnce(reply(searchFrieren));
    const result = await searchAnime("  Frieren  ", 1);

    expect(get).toHaveBeenCalledWith("/anime", {
      params: expect.objectContaining({ q: "frieren", limit: 20, offset: 0, nsfw: true }),
    });
    expect(new Set(result.data.map((a) => a.mal_id))).toEqual(
      new Set(tenraiSearch.data.map((a) => a.mal_id)),
    );
    expect(result.pagination).toEqual({
      last_visible_page: 1,
      has_next_page: false,
      items: { count: 4, total: null, per_page: 20 },
    });
    expect(result.source).toBe("mal");
    expect(result.unavailable).toEqual(["total", "lastPage"]);
  });

  it("pages by offset and knows only that a next page exists", async () => {
    get.mockResolvedValueOnce(block(rows(1, 20), true));
    const result = await searchAnime("one piece", 3);
    expect(get.mock.calls[0][1].params.offset).toBe(40);
    expect(result.pagination.last_visible_page).toBe(4);
    expect(result.pagination.has_next_page).toBe(true);
  });

  it("drops Rx and R+ rows", async () => {
    get.mockResolvedValueOnce(reply(searchKuroinu));
    expect((await searchAnime("kuroinu")).data).toEqual([]);
  });

  it("does not send a query shorter than 3 characters", async () => {
    const result = await searchAnime("ab");
    expect(get).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.unavailable).toEqual(["query"]);
  });

  it("cuts a long query to 64 characters at a word boundary", () => {
    expect(malSearchQuery("進撃の")).toBe("進撃の");
    expect(malSearchQuery("進撃")).toBeNull();
    const words = Array.from({ length: 20 }, (_, i) => `word${i}`).join(" ");
    const cut = malSearchQuery(words)!;
    expect(cut.length).toBeLessThanOrEqual(64);
    expect(words.startsWith(`${cut} `)).toBe(true);
    expect(malSearchQuery("a".repeat(100))).toBe("a".repeat(64));
  });

  it("caches under its own key", async () => {
    get.mockResolvedValueOnce(reply(searchFrieren));
    await searchAnime("frieren");
    await searchAnime("Frieren");
    expect(get).toHaveBeenCalledTimes(1);
    expect([...store.keys()]).toEqual(['mal,search-["frieren",1]']);
  });
});

describe("show details", () => {
  it("serves the show, recommendations, relations and videos from one request", async () => {
    get.mockResolvedValueOnce(reply({ ...fmab, videos: fmabVideos.videos }));
    const [show, recs, relations, videos] = await Promise.all([
      getAnimeById(5114),
      getAnimeRecommendations(5114),
      getAnimeRelations(5114),
      getAnimeVideos(5114),
    ]);

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe("/anime/5114");
    expect(get.mock.calls[0][1].params.fields).toContain("videos");
    expect(show.data.title).toBe("Fullmetal Alchemist: Brotherhood");
    expect(show.data.status).toBe("Finished Airing");
    expect(recs.data).toHaveLength(10);
    expect(relations.data.map((g) => g.relation)).toEqual([
      "Alternative Version",
      "Side Story",
      "Spin-Off",
    ]);
    expect(videos.data.promo[0].trailer.youtube_id).toBe("1ac3_YdSSy0");
    expect(videos.unavailable).toEqual(["episodeVideos", "musicVideos"]);
    expect(show.unavailable).toEqual([]);
  });

  it("keeps the details in the cache", async () => {
    get.mockResolvedValueOnce(reply(apothecary));
    await getAnimeById(61987);
    await getAnimeVideos(61987);
    expect(get).toHaveBeenCalledTimes(1);
    expect([...store.keys()]).toEqual(["mal,anime-details-[61987]"]);
  });

  it("passes a 404 through so the page can show not found", async () => {
    get.mockRejectedValueOnce(httpError(404));
    const error = await getAnimeById(99999999).catch((e) => e);
    expect(isJikanNotFound(error)).toBe(true);
  });

  it("does not cache an unexpected body", async () => {
    get.mockResolvedValueOnce(reply("<html>parked</html>")).mockResolvedValueOnce(reply(fmab));
    await expect(getAnimeById(5114)).rejects.toThrow("Unexpected response from MyAnimeList");
    expect((await getAnimeById(5114)).data.mal_id).toBe(5114);
  });
});

describe("getAnimeCharacterPreview", () => {
  it("returns Tenrai's first 12 characters without voice actors", async () => {
    get.mockResolvedValueOnce(reply(fmabCharacters)).mockResolvedValueOnce(reply({ data: [], paging: {} }));
    const result = await getAnimeCharacterPreview(5114, 12);

    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][1].params).toEqual(
      expect.objectContaining({ limit: 100, offset: 100 }),
    );
    expect(result.data.map((c) => c.character.mal_id)).toEqual(
      tenraiCharacters.data.slice(0, 12).map((c) => c.character.mal_id),
    );
    expect(result.unavailable).toEqual(["voiceActors"]);
  });

  it("stops after one page when there is no next page", async () => {
    get.mockResolvedValueOnce(reply({ ...fmabCharacters, paging: {} }));
    await getAnimeCharacterPreview(5114, 12);
    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe("getAnimeReviews", () => {
  it("says reviews are unavailable without a request", async () => {
    const result = await getAnimeReviews(5114);
    expect(get).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.unavailable).toEqual(["reviews"]);
  });
});

describe("getAnimeByIds", () => {
  it("sends one request per id and leaves out unknown ids", async () => {
    get.mockImplementation(async (path: string) => {
      if (path === "/anime/5114") return reply(fmab);
      if (path === "/anime/52991") return reply(frieren);
      throw httpError(404);
    });
    const shows = await getAnimeByIds([5114, 52991, 5114, 99999999]);
    expect(get).toHaveBeenCalledTimes(3);
    expect(shows.map((s) => s.mal_id)).toEqual([5114, 52991]);
    expect(shows[0].genres.map((g) => g.name)).toEqual(["Action", "Adventure", "Drama", "Fantasy"]);
  });

  it("fails the whole batch on any other error", async () => {
    get.mockResolvedValueOnce(reply(fmab)).mockRejectedValueOnce(httpError(503));
    await expect(getAnimeByIds([5114, 52991])).rejects.toBeInstanceOf(AxiosError);
  });

  it("refuses more ids than the budget without a request", async () => {
    await expect(getAnimeByIds([1, 2, 3, 4, 5, 6, 7])).rejects.toThrow("At most 6");
    expect(await getAnimeByIds([])).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});

describe("getTopAnime", () => {
  it("knows the total when the ranking ends inside the window", async () => {
    get.mockResolvedValueOnce(reply({ ...rankingAiring, paging: {} }));
    const result = await getTopAnime(1, "airing");

    expect(get).toHaveBeenCalledWith("/anime/ranking", {
      params: expect.objectContaining({ ranking_type: "airing", limit: 500, offset: 0 }),
    });
    expect(result.data.map((a) => a.mal_id)).toEqual(rankingAiring.data.map((r) => r.node.id));
    expect(result.pagination).toEqual({
      last_visible_page: 1,
      has_next_page: false,
      items: { count: 20, total: 20, per_page: 20 },
    });
    expect(result.unavailable).toEqual([]);
  });

  it("drops adult rows and keeps the pages full", async () => {
    get.mockResolvedValueOnce(
      block([...rows(1, 15), ...rows(100, 10, { rating: "rx" }), ...rows(16, 15)], false),
    );
    const page1 = await getTopAnime(1, "bypopularity");
    const page2 = await getTopAnime(2, "bypopularity");
    expect(page1.data.map((a) => a.mal_id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(page2.data.map((a) => a.mal_id)).toEqual(Array.from({ length: 10 }, (_, i) => i + 21));
    expect(page2.pagination.items.total).toBe(30);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("pages only the first 1,000 rows of a long ranking", async () => {
    get
      .mockResolvedValueOnce(block(rows(1, 500), true))
      .mockResolvedValueOnce(block(rows(501, 500), true));
    const result = await getTopAnime(50, "favorite");

    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][1].params.offset).toBe(500);
    expect(result.data.map((a) => a.mal_id)[0]).toBe(981);
    expect(result.pagination).toMatchObject({ last_visible_page: 50, has_next_page: false });
    expect(result.pagination.items.total).toBeNull();
    expect(result.unavailable).toEqual(["total", "lastPage"]);

    const beyond = await getTopAnime(51, "favorite");
    expect(beyond.data).toEqual([]);
    expect(beyond.unavailable).toEqual(["total", "lastPage", "page"]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("keeps each filter in its own cache entry", async () => {
    get.mockResolvedValue(block(rows(1, 3), false));
    await getTopAnime(1, "airing");
    await getTopAnime(1, "upcoming");
    expect([...store.keys()]).toEqual([
      'mal,ranking-["airing",0]',
      'mal,ranking-["upcoming",0]',
    ]);
  });
});

describe("getTopByGenre", () => {
  it("derives the genre list from the score ranking as Tenrai orders it", async () => {
    get.mockResolvedValueOnce(reply({ ...rankingAll, paging: {} }));
    const candidates = await getTopByGenre(1);

    expect(get).toHaveBeenCalledWith("/anime/ranking", {
      params: expect.objectContaining({ ranking_type: "all", limit: 500, offset: 0 }),
    });
    expect(candidates.slice(0, 5).map((c) => c.mal_id)).toEqual(
      tenraiGenreAction.data.map((a) => a.mal_id),
    );
    expect(candidates[0]).toEqual({
      mal_id: 5114,
      title: "Fullmetal Alchemist: Brotherhood",
      image: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg",
      score: 9.11,
      genres: tenraiGenreAction.data[0].genres.map((g) => g.name),
    });
  });

  it("matches themes and demographics too, as Tenrai's genres parameter does", async () => {
    get.mockResolvedValueOnce(reply({ ...rankingAll, paging: {} }));
    const shounen = await getTopByGenre(27);
    expect(shounen.length).toBeGreaterThan(0);
    expect(shounen.every((c) => !c.genres.includes("Shounen"))).toBe(true);
  });

  it("shares one ranking request between genres", async () => {
    get.mockResolvedValue(reply({ ...rankingAll, paging: {} }));
    await Promise.all([getTopByGenre(1), getTopByGenre(8), getTopByGenre(10)]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("drops adult rows and does not cache an empty list", async () => {
    get
      .mockResolvedValueOnce(block(rows(1, 3, { rating: "rx", genres: [{ id: 1, name: "Action" }] }), false))
      .mockResolvedValueOnce(block(rows(1, 3, { genres: [{ id: 1, name: "Action" }] }), false));
    expect(await getTopByGenre(1)).toEqual([]);
    expect(await getTopByGenre(1)).toHaveLength(3);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
