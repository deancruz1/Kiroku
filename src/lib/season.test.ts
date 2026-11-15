import { beforeEach, describe, expect, it, vi } from "vitest";

import fall2025 from "@/lib/fixtures/tenrai/season-2025-fall-p2.json";
import seasonNow from "@/lib/fixtures/tenrai/season-now-p1.json";
import upcoming from "@/lib/fixtures/tenrai/top-upcoming-p1.json";
import seasonsList from "@/lib/fixtures/tenrai/seasons-list.json";
import notFoundBody from "@/lib/fixtures/tenrai/not-found-99999999.json";

const { get, store } = vi.hoisted(() => ({
  get: vi.fn(),
  store: new Map<string, unknown>(),
}));

// Stores a result only when the function resolves, like unstable_cache.
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
vi.mock("@/lib/axios", () => ({ jikanApi: { get } }));

import {
  PartialSeasonError,
  belongsOnCalendar,
  compareSeasons,
  fetchCalendarSeason,
  getArchiveSeasonPage,
  getCalendarSeason,
  getSeasonAt,
  getSeasonYears,
  parseSeasonQuery,
  toSeasonAnime,
  type SeasonAnime,
} from "@/lib/season";

function anime(id: number, type: string | null = "TV", day: string | null = "Mondays"): SeasonAnime {
  return {
    mal_id: id,
    title: `Show ${id}`,
    title_english: null,
    title_japanese: null,
    images: {
      jpg: { image_url: "j", small_image_url: "js", large_image_url: "jl" },
      webp: { image_url: "w", small_image_url: "ws", large_image_url: "wl" },
    },
    synopsis: "long text",
    episodes: 12,
    status: "Currently Airing",
    aired: { from: "2026-10-05T00:00:00+00:00", to: null },
    score: 7.5,
    genres: [{ mal_id: 1, name: "Action" }],
    studios: [],
    season: "fall",
    year: 2026,
    type,
    broadcast: {
      day,
      time: day ? "23:00" : null,
      timezone: day ? "Asia/Tokyo" : null,
      string: day ? `${day} at 23:00 (JST)` : "Unknown",
    },
  };
}

function page(items: SeasonAnime[], hasNext: boolean) {
  return { data: { data: items, pagination: { last_visible_page: 3, has_next_page: hasNext } } };
}

beforeEach(() => {
  get.mockReset();
  store.clear();
});

describe("parseSeasonQuery", () => {
  it("uses the current season without params", () => {
    expect(parseSeasonQuery({})).toEqual({ kind: "current" });
    expect(parseSeasonQuery({ page: "3" })).toEqual({ kind: "current" });
  });

  it("accepts a valid season and page", () => {
    expect(parseSeasonQuery({ year: "2019", season: "Spring", page: "2" })).toEqual({
      kind: "season",
      year: 2019,
      season: "spring",
      page: 2,
    });
    expect(parseSeasonQuery({ year: ["2019", "2020"], season: "fall" })).toEqual({
      kind: "season",
      year: 2019,
      season: "fall",
      page: 1,
    });
  });

  it("redirects invalid or incomplete seasons to the current one", () => {
    expect(parseSeasonQuery({ year: "abc", season: "fall" })).toEqual({ kind: "redirect", to: "/season" });
    expect(parseSeasonQuery({ year: "2019", season: "banana" })).toEqual({ kind: "redirect", to: "/season" });
    expect(parseSeasonQuery({ year: "2019" })).toEqual({ kind: "redirect", to: "/season" });
    expect(parseSeasonQuery({ season: "fall" })).toEqual({ kind: "redirect", to: "/season" });
  });

  it("redirects an invalid page to the first page", () => {
    const to = "/season?year=2019&season=fall";
    expect(parseSeasonQuery({ year: "2019", season: "fall", page: "0" })).toEqual({ kind: "redirect", to });
    expect(parseSeasonQuery({ year: "2019", season: "fall", page: "abc" })).toEqual({ kind: "redirect", to });
    expect(parseSeasonQuery({ year: "2019", season: "fall", page: "-1" })).toEqual({ kind: "redirect", to });
    expect(parseSeasonQuery({ year: "2019", season: "fall", page: "1.5" })).toEqual({ kind: "redirect", to });
  });
});

describe("getSeasonAt", () => {
  it("uses the Japanese date", () => {
    expect(getSeasonAt(new Date("2026-11-15T12:00:00Z"))).toEqual({ year: 2026, season: "fall" });
    expect(getSeasonAt(new Date("2026-12-31T16:00:00Z"))).toEqual({ year: 2027, season: "winter" });
    expect(getSeasonAt(new Date("2026-04-01T00:00:00Z"))).toEqual({ year: 2026, season: "spring" });
  });

  it("orders seasons", () => {
    expect(compareSeasons({ year: 2026, season: "fall" }, { year: 2027, season: "winter" })).toBeLessThan(0);
    expect(compareSeasons({ year: 2026, season: "fall" }, { year: 2026, season: "summer" })).toBeGreaterThan(0);
    expect(compareSeasons({ year: 2026, season: "fall" }, { year: 2026, season: "fall" })).toBe(0);
  });
});

describe("calendar contents", () => {
  it("keeps TV and ONA, and anything else with a weekly slot", () => {
    expect(belongsOnCalendar(anime(1, "TV", null))).toBe(true);
    expect(belongsOnCalendar(anime(2, "ONA", null))).toBe(true);
    expect(belongsOnCalendar(anime(3, "Movie", null))).toBe(false);
    expect(belongsOnCalendar(anime(4, "Music", null))).toBe(false);
    expect(belongsOnCalendar(anime(5, "Special", "Fridays"))).toBe(true);
  });

  it("drops fields the season views do not use", () => {
    const slim = toSeasonAnime(anime(1));
    expect(slim.synopsis).toBeNull();
    expect(slim.broadcast.timezone).toBe("Asia/Tokyo");
  });
});

describe("fetchCalendarSeason", () => {
  it("loads every page and removes duplicates and non-weekly formats", async () => {
    get
      .mockResolvedValueOnce(page([anime(1), anime(2, "Movie", null)], true))
      .mockResolvedValueOnce(page([anime(1), anime(3, "ONA", null)], true))
      .mockResolvedValueOnce(page([anime(4)], false));

    const result = await fetchCalendarSeason("/seasons/now");
    expect(result.map((a) => a.mal_id)).toEqual([1, 3, 4]);
    expect(get).toHaveBeenCalledTimes(3);
    expect(get).toHaveBeenLastCalledWith("/seasons/now", {
      params: { page: 3, limit: 25, continuing: true, sfw: true },
    });
  });

  it("stops at the page limit", async () => {
    get.mockImplementation(async (_path: string, { params }: { params: { page: number } }) =>
      page([anime(params.page)], true),
    );
    const result = await fetchCalendarSeason("/seasons/now", { maxPages: 4 });
    expect(result).toHaveLength(4);
    expect(get).toHaveBeenCalledTimes(4);
  });

  it("rethrows when the first page fails", async () => {
    get.mockRejectedValueOnce(new Error("down"));
    await expect(fetchCalendarSeason("/seasons/now")).rejects.toThrow("down");
  });

  it("keeps what loaded when a later page fails", async () => {
    get
      .mockResolvedValueOnce(page([anime(1)], true))
      .mockRejectedValueOnce(new Error("timeout"));
    const error = await fetchCalendarSeason("/seasons/now").catch((e) => e);
    expect(error).toBeInstanceOf(PartialSeasonError);
    expect(error.anime.map((a: SeasonAnime) => a.mal_id)).toEqual([1]);
  });

  it("stops with what loaded once the load runs out of time", async () => {
    vi.useFakeTimers();
    get.mockImplementation(async (_path: string, { params }: { params: { page: number } }) => {
      vi.advanceTimersByTime(20_000);
      return page([anime(params.page)], true);
    });
    const error = await fetchCalendarSeason("/seasons/now").catch((e) => e);
    vi.useRealTimers();
    expect(error).toBeInstanceOf(PartialSeasonError);
    expect(error.anime.map((a: SeasonAnime) => a.mal_id)).toEqual([1, 2]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("returns a partial season as incomplete instead of failing", async () => {
    vi.useFakeTimers();
    get
      .mockResolvedValueOnce(page([anime(1)], true))
      .mockRejectedValueOnce(new Error("timeout"));
    const pending = getCalendarSeason(2026, "fall", true);
    await vi.runAllTimersAsync();
    const result = await pending;
    vi.useRealTimers();
    expect(result.complete).toBe(false);
    expect(result.anime).toHaveLength(1);
    expect(get).toHaveBeenCalledWith("/seasons/now", {
      params: { page: 1, limit: 25, continuing: true, sfw: true },
    });
  });

  it("uses the season endpoint for a future season", async () => {
    get.mockResolvedValueOnce(page([anime(1)], false));
    const result = await getCalendarSeason(2027, "winter", false);
    expect(result).toEqual({ anime: [toSeasonAnime(anime(1))], complete: true });
    expect(get).toHaveBeenCalledWith("/seasons/2027/winter", {
      params: { page: 1, limit: 25, continuing: true, sfw: true },
    });
  });

  it("fails instead of treating an error body as an empty season", async () => {
    get.mockResolvedValueOnce({ data: notFoundBody });
    await expect(fetchCalendarSeason("/seasons/now")).rejects.toThrow(
      "Unexpected season page from Tenrai",
    );
  });

  it("returns an empty season without caching it", async () => {
    get
      .mockResolvedValueOnce({ data: { data: [], pagination: { has_next_page: false } } })
      .mockResolvedValueOnce(page([anime(1)], false));

    expect(await getCalendarSeason(2027, "spring", false)).toEqual({ anime: [], complete: true });
    expect((await getCalendarSeason(2027, "spring", false)).anime).toHaveLength(1);
    expect((await getCalendarSeason(2027, "spring", false)).anime).toHaveLength(1);
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe("getArchiveSeasonPage", () => {
  it("maps a real Tenrai season page", async () => {
    get.mockResolvedValueOnce({ data: fall2025 });
    const result = await getArchiveSeasonPage(2025, "fall", 2);

    expect(get).toHaveBeenCalledWith("/seasons/2025/fall", { params: { page: 2, limit: 25, sfw: true } });
    expect(result.lastPage).toBe(7);
    expect(result.anime.map((a) => a.mal_id)).toEqual(fall2025.data.map((a) => a.mal_id));
    expect(result.anime.every((a) => a.synopsis === null)).toBe(true);
  });

  it("returns an empty page without caching it", async () => {
    const empty = { data: [], pagination: { last_visible_page: 8, has_next_page: false } };
    get.mockResolvedValueOnce({ data: empty }).mockResolvedValueOnce({ data: fall2025 });

    expect(await getArchiveSeasonPage(2025, "fall", 50)).toEqual({ anime: [], lastPage: 8 });
    expect((await getArchiveSeasonPage(2025, "fall", 50)).anime).toHaveLength(5);
    expect((await getArchiveSeasonPage(2025, "fall", 50)).anime).toHaveLength(5);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("throws on an error body so it is not cached", async () => {
    get.mockResolvedValueOnce({ data: notFoundBody });
    await expect(getArchiveSeasonPage(2025, "fall", 1)).rejects.toThrow("Unexpected season page");
  });
});

describe("safe filter", () => {
  it("keys both season caches by the safe filter", async () => {
    get
      .mockResolvedValueOnce(page([anime(1)], false))
      .mockResolvedValueOnce({ data: fall2025 });
    await getCalendarSeason(2026, "fall", true);
    await getArchiveSeasonPage(2025, "fall", 2);
    expect([...store.keys()]).toEqual([
      'season-calendar,sfw-["/seasons/now","2026-fall"]',
      'season-archive,sfw-[2025,"fall",2]',
    ]);
  });
});

describe("getSeasonYears", () => {
  it("lists the years newest first", async () => {
    get.mockResolvedValueOnce({ data: seasonsList });
    expect(await getSeasonYears()).toEqual([2027, 2026, 2025, 2024]);
  });
});

describe("Tenrai season replies", () => {
  it("keeps the fields the calendar needs, including partial dates", () => {
    const slim = upcoming.data.map((a) => toSeasonAnime({ ...a, synopsis: null } as SeasonAnime));
    const partial = slim.find((a) => a.aired.from === "2027-10")!;
    expect(partial.aired.prop?.from).toEqual({ day: null, month: 10, year: 2027 });
    expect(slim.find((a) => a.mal_id === 61006)!.aired.from).toBeNull();
  });

  it("puts weekly shows from the current season on the calendar", () => {
    const slim = seasonNow.data.map((a) => toSeasonAnime({ ...a, synopsis: null } as SeasonAnime));
    const onCalendar = slim.filter(belongsOnCalendar);
    expect(onCalendar.length).toBeGreaterThan(0);
    const apothecary = slim.find((a) => a.mal_id === 61987)!;
    expect(belongsOnCalendar(apothecary)).toBe(true);
    expect(apothecary.broadcast).toEqual({
      day: "Fridays",
      time: "23:00",
      timezone: "Asia/Tokyo",
      string: "Fridays at 23:00 (JST)",
    });
  });
});
