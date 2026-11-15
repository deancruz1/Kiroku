import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import fall2026 from "@/lib/fixtures/mal/season-2026-fall-limit-500-nsfw.json";
import fall2025 from "@/lib/fixtures/mal/season-2025-fall-limit-500-nsfw.json";
import fall2026Page from "@/lib/fixtures/mal/season-2026-fall-p1-limit-25.json";
import notFoundBody from "@/lib/fixtures/mal/error-not-found.json";
import tenraiSeasonIds from "@/lib/fixtures/tenrai/season-ids.json";
import tenraiSeasonNow from "@/lib/fixtures/tenrai/season-now-p1.json";

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
vi.mock("@/lib/axios", () => ({ jikanApi: { get: vi.fn() } }));

import {
  fetchSeasonRows,
  getArchiveSeasonPage,
  getCalendarSeason,
  getSeasonYears,
} from "@/lib/mal-season";
import { FIRST_SEASON_YEAR, toSeasonAnime, type SeasonAnime } from "@/lib/season";

function reply<T>(data: T) {
  return { data };
}

function httpError(status: number) {
  const config = { headers: new AxiosHeaders() };
  const response = { data: notFoundBody, status, statusText: "", headers: {}, config } as AxiosResponse;
  return new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response);
}

function node(id: number, extra: Record<string, unknown> = {}) {
  return {
    node: {
      id,
      title: `Show ${id}`,
      media_type: "tv",
      start_season: { year: 2026, season: "fall" },
      broadcast: { day_of_the_week: "monday", start_time: "23:00" },
      ...extra,
    },
  };
}

beforeEach(() => {
  get.mockReset();
  store.clear();
});

describe("fetchSeasonRows", () => {
  it("asks for the whole season at once, sorted by members", async () => {
    get.mockResolvedValueOnce(reply(fall2026));
    await fetchSeasonRows(2026, "fall");
    expect(get).toHaveBeenCalledWith("/anime/season/2026/fall", {
      params: expect.objectContaining({
        limit: 500,
        offset: 0,
        nsfw: true,
        sort: "anime_num_list_users",
      }),
    });
  });

  it("gives the same set as Tenrai's continuing sfw season", async () => {
    get.mockResolvedValueOnce(reply(fall2026));
    const rows = await fetchSeasonRows(2026, "fall");
    expect(new Set(rows.map((a) => a.mal_id))).toEqual(
      new Set(tenraiSeasonIds["2026-fall-continuing-sfw"]),
    );
  });

  it("maps rows as Tenrai's season rows", async () => {
    get.mockResolvedValueOnce(reply(fall2026Page)).mockResolvedValueOnce(reply({ data: [], paging: {} }));
    const rows = await fetchSeasonRows(2026, "fall");
    const tenrai = new Map(
      tenraiSeasonNow.data.map((a) => [
        a.mal_id,
        toSeasonAnime({ ...a, synopsis: null } as SeasonAnime),
      ]),
    );
    const shared = rows.filter((a) => tenrai.has(a.mal_id));
    expect(shared.length).toBeGreaterThan(5);
    for (const show of shared) {
      const expected = tenrai.get(show.mal_id)!;
      const pick = (a: SeasonAnime) => ({
        title: a.title,
        title_english: a.title_english,
        type: a.type,
        status: a.status,
        aired: a.aired,
        season: a.season,
        year: a.year,
        studios: a.studios,
        genres: a.genres,
      });
      expect(pick(show)).toEqual(pick(expected));
    }
  });

  it("reads further pages and skips repeated rows", async () => {
    get
      .mockResolvedValueOnce({ data: { data: [node(1), node(2)], paging: { next: "x" } } })
      .mockResolvedValueOnce({ data: { data: [node(2), node(3)], paging: {} } });
    const rows = await fetchSeasonRows(2026, "fall");
    expect(rows.map((a) => a.mal_id)).toEqual([1, 2, 3]);
    expect(get.mock.calls[1][1].params.offset).toBe(500);
  });

  it("drops adult ratings and music, PV and CM entries", async () => {
    get.mockResolvedValueOnce(
      reply({
        data: [
          node(1, { rating: "r+" }),
          node(2, { rating: "rx" }),
          node(3, { media_type: "music" }),
          node(4, { media_type: "pv" }),
          node(5, { media_type: "cm" }),
          node(6, { rating: "pg_13" }),
        ],
        paging: {},
      }),
    );
    expect((await fetchSeasonRows(2026, "fall")).map((a) => a.mal_id)).toEqual([6]);
  });

  it("treats a 404 as an empty season and other failures as errors", async () => {
    get.mockRejectedValueOnce(httpError(404));
    expect(await fetchSeasonRows(1916, "winter")).toEqual([]);
    get.mockRejectedValueOnce(httpError(503));
    await expect(fetchSeasonRows(2026, "fall")).rejects.toBeInstanceOf(AxiosError);
    get.mockResolvedValueOnce(reply(notFoundBody));
    await expect(fetchSeasonRows(2026, "fall")).rejects.toThrow("Unexpected response from MyAnimeList");
  });
});

describe("getCalendarSeason", () => {
  it("keeps weekly shows and caches the season", async () => {
    get.mockResolvedValueOnce(
      reply({ data: [node(1), node(2, { media_type: "movie", broadcast: undefined })], paging: {} }),
    );
    const first = await getCalendarSeason(2026, "fall", true);
    const second = await getCalendarSeason(2026, "fall", true);
    expect(first.anime.map((a) => a.mal_id)).toEqual([1]);
    expect(first.complete).toBe(true);
    expect(second).toEqual(first);
    expect(get).toHaveBeenCalledTimes(1);
    expect([...store.keys()]).toEqual(['mal,season-calendar,sfw-[2026,"fall"]']);
    expect(first.anime[0].broadcast).toEqual({
      day: "Mondays",
      time: "23:00",
      timezone: "Asia/Tokyo",
      string: "Mondays at 23:00 (JST)",
    });
  });

  it("returns a partial season as incomplete without caching it", async () => {
    get
      .mockResolvedValueOnce({ data: { data: [node(1)], paging: { next: "x" } } })
      .mockRejectedValueOnce(httpError(503));
    const result = await getCalendarSeason(2026, "fall", true);
    expect(result).toEqual({ anime: [expect.objectContaining({ mal_id: 1 })], complete: false });
    expect(store.size).toBe(0);
  });

  it("does not cache an empty season", async () => {
    get.mockRejectedValueOnce(httpError(404)).mockResolvedValueOnce(reply({ data: [node(1)], paging: {} }));
    expect(await getCalendarSeason(2031, "winter", false)).toEqual({ anime: [], complete: true });
    expect((await getCalendarSeason(2031, "winter", false)).anime).toHaveLength(1);
  });
});

describe("getArchiveSeasonPage", () => {
  it("gives the same set as Tenrai's archive season, paged here", async () => {
    get.mockResolvedValueOnce(reply(fall2025));
    const ids: number[] = [];
    const first = await getArchiveSeasonPage(2025, "fall", 1);
    for (let page = 1; page <= first.lastPage; page++) {
      ids.push(...(await getArchiveSeasonPage(2025, "fall", page)).anime.map((a) => a.mal_id));
    }
    expect(get).toHaveBeenCalledTimes(1);
    expect(first.lastPage).toBe(7);
    expect(first.anime).toHaveLength(25);
    expect(new Set(ids)).toEqual(new Set(tenraiSeasonIds["2025-fall-sfw"]));
    expect(ids).toHaveLength(tenraiSeasonIds["2025-fall-sfw"].length);
  });

  it("leaves out carried-over TV shows but keeps carried-over ONAs", async () => {
    get.mockResolvedValueOnce(
      reply({
        data: [
          node(1),
          node(2, { start_season: { year: 1999, season: "fall" } }),
          node(3, { media_type: "ona", start_season: { year: 2023, season: "spring" } }),
        ],
        paging: {},
      }),
    );
    const page = await getArchiveSeasonPage(2026, "fall", 1);
    expect(page).toEqual({ anime: [expect.objectContaining({ mal_id: 1 }), expect.objectContaining({ mal_id: 3 })], lastPage: 1 });
  });

  it("returns an empty page past the end", async () => {
    get.mockResolvedValueOnce(reply({ data: [node(1)], paging: {} }));
    expect(await getArchiveSeasonPage(2026, "fall", 5)).toEqual({ anime: [], lastPage: 1 });
  });
});

describe("getSeasonYears", () => {
  it("lists every year from 1917 to next year without a request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T00:00:00Z"));
    const years = await getSeasonYears();
    vi.useRealTimers();
    expect(years[0]).toBe(2027);
    expect(years.at(-1)).toBe(FIRST_SEASON_YEAR);
    expect(years).toHaveLength(2027 - FIRST_SEASON_YEAR + 1);
    expect(get).not.toHaveBeenCalled();
  });
});
