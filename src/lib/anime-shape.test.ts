import { describe, expect, it } from "vitest";
import {
  isStale,
  mapJikanAnime,
  parseDurationMinutes,
  planFetches,
  showTitle,
  toJikanAnime,
} from "@/lib/anime-shape";

const now = new Date("2026-11-15T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

describe("parseDurationMinutes", () => {
  it("parses minutes per episode", () => {
    expect(parseDurationMinutes("24 min per ep")).toBe(24);
  });

  it("parses hours and minutes", () => {
    expect(parseDurationMinutes("1 hr 55 min")).toBe(115);
    expect(parseDurationMinutes("2 hr")).toBe(120);
  });

  it("rounds seconds and never returns zero for a real duration", () => {
    expect(parseDurationMinutes("45 sec per ep")).toBe(1);
    expect(parseDurationMinutes("3 min 30 sec per ep")).toBe(4);
  });

  it("returns null when unknown", () => {
    expect(parseDurationMinutes("Unknown")).toBeNull();
    expect(parseDurationMinutes("")).toBeNull();
    expect(parseDurationMinutes(null)).toBeNull();
    expect(parseDurationMinutes(undefined)).toBeNull();
  });
});

describe("mapJikanAnime", () => {
  it("maps a full Jikan response", () => {
    const row = mapJikanAnime(
      {
        mal_id: 5114,
        title: "Fullmetal Alchemist: Brotherhood",
        title_english: "Fullmetal Alchemist: Brotherhood",
        title_japanese: "鋼の錬金術師",
        images: {
          webp: { large_image_url: "https://cdn/webp-large.webp" },
          jpg: { large_image_url: "https://cdn/jpg-large.jpg" },
        },
        episodes: 64,
        genres: [{ name: "Action" }, { name: "Drama" }],
        score: 9.1,
        status: "Finished Airing",
        duration: "24 min per ep",
        season: "spring",
        year: 2009,
      },
      now,
    );

    expect(row).toEqual({
      id: 5114,
      title: "Fullmetal Alchemist: Brotherhood",
      titleEnglish: "Fullmetal Alchemist: Brotherhood",
      titleJapanese: "鋼の錬金術師",
      imageUrl: "https://cdn/webp-large.webp",
      episodes: 64,
      genres: ["Action", "Drama"],
      score: 9.1,
      status: "Finished Airing",
      durationMinutes: 24,
      season: "spring",
      year: 2009,
      fetchedAt: now,
    });
  });

  it("fills gaps with nulls for an airing show with sparse data", () => {
    const row = mapJikanAnime(
      {
        mal_id: 1,
        title: "Ongoing",
        title_english: null,
        images: { jpg: { image_url: "https://cdn/small.jpg" } },
        episodes: null,
        genres: null,
        score: null,
        status: "Currently Airing",
        duration: "Unknown",
        season: null,
        year: null,
      },
      now,
    );

    expect(row.titleEnglish).toBeNull();
    expect(row.titleJapanese).toBeNull();
    expect(row.imageUrl).toBe("https://cdn/small.jpg");
    expect(row.episodes).toBeNull();
    expect(row.genres).toEqual([]);
    expect(row.score).toBeNull();
    expect(row.durationMinutes).toBeNull();
    expect(row.season).toBeNull();
    expect(row.year).toBeNull();
  });

  it("treats zero episodes as unknown and prefers the jpg large image over small ones", () => {
    const row = mapJikanAnime(
      {
        mal_id: 2,
        title: "Upcoming",
        images: {
          webp: { image_url: "https://cdn/webp-small.webp" },
          jpg: { large_image_url: "https://cdn/jpg-large.jpg" },
        },
        episodes: 0,
      },
      now,
    );
    expect(row.episodes).toBeNull();
    expect(row.imageUrl).toBe("https://cdn/jpg-large.jpg");
    expect(row.imageUrl).not.toBe("https://cdn/webp-small.webp");
  });

  it("falls back to a title when Jikan sends an empty one", () => {
    expect(mapJikanAnime({ mal_id: 3, title: "" }, now).title).toBe(
      "Anime #3",
    );
  });
});

describe("isStale", () => {
  it("refreshes airing shows after a day", () => {
    expect(isStale({ status: "Currently Airing", fetchedAt: hoursAgo(23) }, now)).toBe(false);
    expect(isStale({ status: "Currently Airing", fetchedAt: hoursAgo(25) }, now)).toBe(true);
    expect(isStale({ status: "Not yet aired", fetchedAt: hoursAgo(25) }, now)).toBe(true);
    expect(isStale({ status: null, fetchedAt: hoursAgo(25) }, now)).toBe(true);
  });

  it("keeps finished shows for a month", () => {
    expect(isStale({ status: "Finished Airing", fetchedAt: hoursAgo(24 * 29) }, now)).toBe(false);
    expect(isStale({ status: "Finished Airing", fetchedAt: hoursAgo(24 * 31) }, now)).toBe(true);
  });

  it("accepts serialized dates", () => {
    expect(
      isStale({ status: "Currently Airing", fetchedAt: hoursAgo(2).toISOString() }, now),
    ).toBe(false);
  });
});

describe("planFetches", () => {
  const fresh = { status: "Finished Airing", fetchedAt: hoursAgo(1) };

  it("fetches nothing when every show is stored and fresh", () => {
    const stored = new Map([
      [1, fresh],
      [2, fresh],
    ]);
    expect(planFetches([1, 2], stored, now)).toEqual([]);
  });

  it("puts missing shows first, then the stalest, within the budget", () => {
    const stored = new Map([
      [1, fresh],
      [2, { status: "Currently Airing", fetchedAt: hoursAgo(30) }],
      [3, { status: "Currently Airing", fetchedAt: hoursAgo(50) }],
    ]);
    expect(planFetches([1, 2, 3, 4, 5], stored, now)).toEqual([4, 5, 3, 2]);
    expect(planFetches([1, 2, 3, 4, 5], stored, now, 3)).toEqual([4, 5, 3]);
  });

  it("caps a large legacy list at six and ignores duplicate ids", () => {
    const ids = Array.from({ length: 60 }, (_, i) => i + 1);
    expect(planFetches([...ids, 1, 2], new Map(), now)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});

describe("display helpers", () => {
  const show = {
    id: 9,
    title: "Shingeki no Kyojin",
    titleEnglish: "Attack on Titan",
    titleJapanese: null,
    imageUrl: "https://cdn/aot.webp",
    episodes: 25,
    genres: ["Action", "Drama"],
    score: 8.5,
    status: "Finished Airing",
    durationMinutes: 24,
    season: "spring",
    year: 2013,
    fetchedAt: now.toISOString(),
  };

  it("prefers the English title and falls back to the id", () => {
    expect(showTitle(show, 9)).toBe("Attack on Titan");
    expect(showTitle({ ...show, titleEnglish: null }, 9)).toBe("Shingeki no Kyojin");
    expect(showTitle(null, 9)).toBe("Anime #9");
  });

  it("converts a stored show to the card shape", () => {
    const anime = toJikanAnime(show);
    expect(anime.mal_id).toBe(9);
    expect(anime.images.webp.large_image_url).toBe("https://cdn/aot.webp");
    expect(anime.genres).toEqual([
      { mal_id: 0, name: "Action" },
      { mal_id: 1, name: "Drama" },
    ]);
    expect(anime.score).toBe(8.5);
  });
});
