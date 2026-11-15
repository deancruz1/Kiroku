import type { StoredShow } from "@/lib/anime-shape";

export const FALLBACK_EPISODE_MINUTES = 24;

export interface StatsEntry {
  animeId: number;
  status: string;
  episodes: number;
  rating: number | null;
}

type StatsShow = Pick<
  StoredShow,
  "title" | "titleEnglish" | "imageUrl" | "episodes" | "genres" | "durationMinutes"
>;

export interface GenreCount {
  name: string;
  count: number;
}

export interface FavoriteShow {
  title: string;
  image: string;
  rating: number;
  episodes: number;
  mal_id: number;
  genre?: string;
}

export interface MostWatched {
  title: string;
  image: string;
  episodes: number;
  totalEpisodes: number;
  mal_id: number;
  genre?: string;
}

// Entries are expected newest-updated first; ties keep the earlier entry
export function computeStats(
  entries: StatsEntry[],
  shows: Map<number, StatsShow>,
) {
  const statusCounts: Record<string, number> = {
    watching: 0,
    completed: 0,
    plan_to_watch: 0,
    dropped: 0,
  };
  const episodesByStatus: Record<string, number> = {
    watching: 0,
    completed: 0,
    plan_to_watch: 0,
    dropped: 0,
  };
  const ratingDistribution = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1,
    count: 0,
  }));
  const genreCounts: Record<string, number> = {};

  let totalEpisodesWatched = 0;
  let totalWatchTimeMinutes = 0;
  let watchTimeFallbackShows = 0;
  let ratedCount = 0;
  let ratingSum = 0;
  let unstoredShows = 0;
  let favoriteShow: FavoriteShow | null = null;
  let mostWatched: MostWatched | null = null;

  for (const entry of entries) {
    const show = shows.get(entry.animeId);

    totalEpisodesWatched += entry.episodes;
    statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
    episodesByStatus[entry.status] =
      (episodesByStatus[entry.status] || 0) + entry.episodes;

    if (entry.episodes > 0) {
      if (show?.durationMinutes) {
        totalWatchTimeMinutes += entry.episodes * show.durationMinutes;
      } else {
        totalWatchTimeMinutes += entry.episodes * FALLBACK_EPISODE_MINUTES;
        watchTimeFallbackShows++;
      }
    }

    if (entry.rating) {
      ratedCount++;
      ratingSum += entry.rating;
      const bucket = ratingDistribution[entry.rating - 1];
      if (bucket) bucket.count++;
    }

    if (!show) {
      unstoredShows++;
      continue;
    }

    for (const genre of show.genres) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }

    const title = show.titleEnglish || show.title;
    const image = show.imageUrl || "";
    const firstGenre = show.genres[0];

    if (entry.rating && entry.episodes > 0) {
      if (
        !favoriteShow ||
        entry.rating > favoriteShow.rating ||
        (entry.rating === favoriteShow.rating &&
          entry.episodes > favoriteShow.episodes)
      ) {
        favoriteShow = {
          title,
          image,
          rating: entry.rating,
          episodes: entry.episodes,
          mal_id: entry.animeId,
          genre: firstGenre,
        };
      }
    }

    if (!mostWatched || entry.episodes > mostWatched.episodes) {
      mostWatched = {
        title,
        image,
        episodes: entry.episodes,
        totalEpisodes: show.episodes || 0,
        mal_id: entry.animeId,
        genre: firstGenre,
      };
    }
  }

  const genres: GenreCount[] = Object.entries(genreCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const topGenres = genres.slice(0, 3);
  const topGenre = topGenres.length > 0 ? topGenres[0] : null;

  const totalWatchTimeHours = Math.round(totalWatchTimeMinutes / 60);
  const watchTimeDays = Math.floor(totalWatchTimeHours / 24);
  const watchTimeRemainingHours = totalWatchTimeHours % 24;

  const averageRating =
    ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : 0;
  const totalEntries = entries.length;
  const completionRate =
    totalEntries > 0
      ? Math.round((statusCounts.completed / totalEntries) * 100)
      : 0;

  return {
    totalEntries,
    statusCounts,
    episodesByStatus,
    totalEpisodesWatched,
    totalWatchTimeMinutes,
    totalWatchTimeHours,
    watchTimeDays,
    watchTimeRemainingHours,
    watchTimeFallbackShows,
    fallbackEpisodeMinutes: FALLBACK_EPISODE_MINUTES,
    averageRating,
    ratedCount,
    ratingDistribution,
    completionRate,
    genres,
    topGenres,
    topGenre,
    favoriteShow,
    mostWatched,
    heroImage: favoriteShow?.image || null,
    unstoredShows,
  };
}

export type Stats = ReturnType<typeof computeStats>;
