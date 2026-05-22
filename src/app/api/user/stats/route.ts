import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jikanApi } from "@/lib/axios";

interface JikanAnimeResponse {
  data: {
    mal_id: number;
    genres: { name: string }[];
    episodes: number | null;
    score: number | null;
    title_english: string | null;
    title: string;
    images: {
      webp: {
        small_image_url: string;
      };
    };
  };
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.animeEntry.findMany({
    where: { userId: session.user.id },
  });

  // Status distribution
  const statusCounts: Record<string, number> = {
    watching: 0,
    completed: 0,
    plan_to_watch: 0,
    dropped: 0,
  };

  let totalEpisodesWatched = 0;
  let ratedCount = 0;
  let ratingSum = 0;
  const genreCounts: Record<string, number> = {};

  // Fetch genre data from Jikan for each entry
  for (const entry of entries) {
    totalEpisodesWatched += entry.episodes;
    statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;

    if (entry.rating) {
      ratedCount++;
      ratingSum += entry.rating;
    }

    try {
      const { data } = await jikanApi.get<JikanAnimeResponse>(
        `/anime/${entry.animeId}`,
      );
      if (data.data?.genres) {
        for (const genre of data.data.genres) {
          genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
        }
      }
    } catch {
      // Skip if Jikan fails for this entry
    }
  }

  // Sort genres by count
  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Average rating
  const averageRating = ratedCount > 0 ? ratingSum / ratedCount : 0;

  // Completion rate
  const totalEntries = entries.length;
  const completionRate =
    totalEntries > 0
      ? Math.round((statusCounts.completed / totalEntries) * 100)
      : 0;

  const totalWatchTimeHours = Math.round((totalEpisodesWatched * 24) / 60);

  return NextResponse.json({
    totalEntries,
    statusCounts,
    totalEpisodesWatched,
    totalWatchTimeHours,
    averageRating: Math.round(averageRating * 10) / 10,
    ratedCount,
    completionRate,
    topGenres,
  });
}
