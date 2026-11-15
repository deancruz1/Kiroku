import { describe, expect, it } from "vitest";
import { computeStats, type StatsEntry } from "@/lib/stats";

function show(
  title: string,
  genres: string[],
  extra: Partial<{
    titleEnglish: string | null;
    imageUrl: string | null;
    episodes: number | null;
    durationMinutes: number | null;
  }> = {},
) {
  return {
    title,
    titleEnglish: null,
    imageUrl: `https://cdn/${title}.webp`,
    episodes: 12,
    genres,
    durationMinutes: 24,
    ...extra,
  };
}

describe("computeStats", () => {
  it("returns zeroed stats for an empty list", () => {
    const stats = computeStats([], new Map());
    expect(stats.totalEntries).toBe(0);
    expect(stats.averageRating).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.topGenre).toBeNull();
    expect(stats.favoriteShow).toBeNull();
    expect(stats.mostWatched).toBeNull();
    expect(stats.heroImage).toBeNull();
    expect(stats.ratingDistribution).toHaveLength(10);
    expect(stats.totalWatchTimeMinutes).toBe(0);
  });

  it("aggregates counts, genres, ratings and watch time", () => {
    const entries: StatsEntry[] = [
      { animeId: 1, status: "completed", episodes: 12, rating: 9 },
      { animeId: 2, status: "watching", episodes: 5, rating: 6 },
      { animeId: 3, status: "completed", episodes: 2, rating: 9 },
      { animeId: 4, status: "plan_to_watch", episodes: 0, rating: null },
      { animeId: 5, status: "dropped", episodes: 3, rating: null },
    ];
    const shows = new Map([
      [1, show("A", ["Action", "Drama"], { titleEnglish: "Alpha" })],
      [2, show("B", ["Comedy", "Action"], { durationMinutes: 12 })],
      [3, show("C", ["Drama"], { durationMinutes: null })],
      [4, show("D", ["Action"])],
    ]);

    const stats = computeStats(entries, shows);

    expect(stats.totalEntries).toBe(5);
    expect(stats.statusCounts).toEqual({
      watching: 1,
      completed: 2,
      plan_to_watch: 1,
      dropped: 1,
    });
    expect(stats.episodesByStatus).toEqual({
      watching: 5,
      completed: 14,
      plan_to_watch: 0,
      dropped: 3,
    });
    expect(stats.totalEpisodesWatched).toBe(22);
    // 12*24 + 5*12 + 2*24 (fallback) + 3*24 (not stored, fallback)
    expect(stats.totalWatchTimeMinutes).toBe(288 + 60 + 48 + 72);
    expect(stats.watchTimeFallbackShows).toBe(2);
    expect(stats.totalWatchTimeHours).toBe(8);
    expect(stats.watchTimeDays).toBe(0);
    expect(stats.watchTimeRemainingHours).toBe(8);
    expect(stats.unstoredShows).toBe(1);

    expect(stats.ratedCount).toBe(3);
    expect(stats.averageRating).toBe(8);
    expect(stats.ratingDistribution[8]).toEqual({ rating: 9, count: 2 });
    expect(stats.ratingDistribution[5]).toEqual({ rating: 6, count: 1 });
    expect(stats.ratingDistribution.reduce((s, b) => s + b.count, 0)).toBe(3);
    expect(stats.completionRate).toBe(40);

    expect(stats.genres).toEqual([
      { name: "Action", count: 3 },
      { name: "Drama", count: 2 },
      { name: "Comedy", count: 1 },
    ]);
    expect(stats.topGenres).toHaveLength(3);
    expect(stats.topGenre).toEqual({ name: "Action", count: 3 });

    expect(stats.favoriteShow).toEqual({
      title: "Alpha",
      image: "https://cdn/A.webp",
      rating: 9,
      episodes: 12,
      mal_id: 1,
      genre: "Action",
    });
    expect(stats.heroImage).toBe("https://cdn/A.webp");
    expect(stats.mostWatched).toMatchObject({
      mal_id: 1,
      episodes: 12,
      totalEpisodes: 12,
    });
  });

  it("breaks rating ties on episodes and ignores unrated or unwatched favourites", () => {
    const stats = computeStats(
      [
        { animeId: 1, status: "watching", episodes: 0, rating: 10 },
        { animeId: 2, status: "completed", episodes: 3, rating: 8 },
        { animeId: 3, status: "completed", episodes: 24, rating: 8 },
      ],
      new Map([
        [1, show("A", [])],
        [2, show("B", [])],
        [3, show("C", [])],
      ]),
    );
    expect(stats.favoriteShow?.mal_id).toBe(3);
  });

  it("sorts genres with equal counts by name and keeps the full list", () => {
    const stats = computeStats(
      [
        { animeId: 1, status: "watching", episodes: 1, rating: null },
        { animeId: 2, status: "watching", episodes: 1, rating: null },
      ],
      new Map([
        [1, show("A", ["Romance", "Comedy", "Sports", "Drama"])],
        [2, show("B", ["Sports"])],
      ]),
    );
    expect(stats.genres.map((g) => g.name)).toEqual([
      "Sports",
      "Comedy",
      "Drama",
      "Romance",
    ]);
    expect(stats.topGenres.map((g) => g.name)).toEqual([
      "Sports",
      "Comedy",
      "Drama",
    ]);
  });

  it("uses the fallback length for every show when nothing is stored", () => {
    const stats = computeStats(
      [{ animeId: 1, status: "completed", episodes: 60, rating: 7 }],
      new Map(),
    );
    expect(stats.totalWatchTimeMinutes).toBe(60 * 24);
    expect(stats.totalWatchTimeHours).toBe(24);
    expect(stats.watchTimeDays).toBe(1);
    expect(stats.watchTimeRemainingHours).toBe(0);
    expect(stats.watchTimeFallbackShows).toBe(1);
    expect(stats.favoriteShow).toBeNull();
    expect(stats.averageRating).toBe(7);
  });
});
