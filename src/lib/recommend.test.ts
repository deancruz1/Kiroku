import { describe, expect, it } from "vitest";
import {
  becauseOf,
  buildRecommendations,
  pickGenres,
  ratingWeight,
  scoreGenres,
  tasteEntries,
  type Candidate,
  type RecommendEntry,
} from "@/lib/recommend";

const shows = new Map([
  [1, { title: "A", titleEnglish: "Alpha", genres: ["Action", "Drama"] }],
  [2, { title: "B", titleEnglish: null, genres: ["Comedy", "Action"] }],
  [3, { title: "C", titleEnglish: null, genres: ["Romance"] }],
  [4, { title: "D", titleEnglish: null, genres: ["Action"] }],
]);

function candidate(mal_id: number, score: number | null = 8): Candidate {
  return { mal_id, title: `#${mal_id}`, image: "", score, genres: [] };
}

describe("ratingWeight", () => {
  it("counts high ratings more and low ratings not at all", () => {
    expect(ratingWeight(10)).toBe(5);
    expect(ratingWeight(6)).toBe(1);
    expect(ratingWeight(5)).toBe(0);
    expect(ratingWeight(1)).toBe(0);
  });
});

describe("tasteEntries", () => {
  it("uses liked rated entries when there are any", () => {
    const entries: RecommendEntry[] = [
      { animeId: 1, status: "completed", rating: 9 },
      { animeId: 2, status: "watching", rating: null },
      { animeId: 3, status: "completed", rating: 3 },
    ];
    expect(tasteEntries(entries).map((t) => t.entry.animeId)).toEqual([1]);
  });

  it("falls back to unrated entries that were not dropped", () => {
    const entries: RecommendEntry[] = [
      { animeId: 1, status: "watching", rating: null },
      { animeId: 2, status: "dropped", rating: null },
      { animeId: 3, status: "completed", rating: 2 },
    ];
    expect(tasteEntries(entries)).toEqual([
      { entry: entries[0], weight: 1 },
    ]);
  });
});

describe("scoreGenres and pickGenres", () => {
  it("weights genres by rating and ignores poorly rated shows", () => {
    const weights = scoreGenres(
      [
        { animeId: 1, status: "completed", rating: 10 },
        { animeId: 2, status: "completed", rating: 7 },
        { animeId: 3, status: "dropped", rating: 2 },
      ],
      shows,
    );
    expect(weights).toEqual({ Action: 7, Drama: 5, Comedy: 2 });
    expect(pickGenres(weights)).toEqual(["Action", "Drama", "Comedy"]);
  });

  it("works for a user with only unrated entries", () => {
    const weights = scoreGenres(
      [
        { animeId: 2, status: "watching", rating: null },
        { animeId: 4, status: "plan_to_watch", rating: null },
      ],
      shows,
    );
    expect(pickGenres(weights)).toEqual(["Action", "Comedy"]);
  });

  it("skips genres without a search id and caps at the limit", () => {
    expect(
      pickGenres({ Gourmet: 9, Action: 1, Drama: 2, Comedy: 3, Romance: 4 }),
    ).toEqual(["Romance", "Comedy", "Drama"]);
  });

  it("ignores shows that are not stored yet", () => {
    expect(
      scoreGenres([{ animeId: 99, status: "completed", rating: 9 }], shows),
    ).toEqual({});
  });
});

describe("becauseOf", () => {
  it("names the best-rated show with the genre, not the first one", () => {
    const entries: RecommendEntry[] = [
      { animeId: 2, status: "completed", rating: 7 },
      { animeId: 1, status: "completed", rating: 9 },
      { animeId: 4, status: "completed", rating: 9 },
    ];
    expect(becauseOf("Action", entries, shows)).toBe("Alpha");
    expect(becauseOf("Comedy", entries, shows)).toBe("B");
  });

  it("falls back to the genre name", () => {
    expect(becauseOf("Horror", [], shows)).toBe("Horror");
  });
});

describe("buildRecommendations", () => {
  it("excludes everything on the list, low scores and duplicates", () => {
    const recs = buildRecommendations(
      [
        { genre: "Action", candidates: [candidate(10), candidate(1), candidate(11, 6.5)] },
        { genre: "Drama", candidates: [candidate(10), candidate(12, null), candidate(13)] },
      ],
      new Set([1, 2]),
      { Action: "Alpha", Drama: "Alpha" },
    );
    expect(recs.map((r) => r.mal_id)).toEqual([10, 13]);
    expect(recs[0].becauseOf).toBe("Alpha");
  });

  it("takes from each genre in turn and stops at the limit", () => {
    const many = (start: number) =>
      Array.from({ length: 8 }, (_, i) => candidate(start + i));
    const recs = buildRecommendations(
      [
        { genre: "Action", candidates: many(100) },
        { genre: "Drama", candidates: many(200) },
        { genre: "Comedy", candidates: many(300) },
      ],
      new Set(),
      {},
    );
    expect(recs).toHaveLength(10);
    expect(recs.slice(0, 3).map((r) => r.mal_id)).toEqual([100, 200, 300]);
    expect(recs[0].becauseOf).toBe("Action");
  });
});
