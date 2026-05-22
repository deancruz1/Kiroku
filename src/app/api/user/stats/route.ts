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
        large_image_url: string;
        small_image_url: string;
      };
    };
  };
}

async function getRandomGalleryImage(animeId: number): Promise<string | null> {
  try {
    const { data } = await jikanApi.get(`/anime/${animeId}/pictures`);
    const pictures = data.data || [];
    if (pictures.length > 0) {
      const random = pictures[Math.floor(Math.random() * pictures.length)];
      return random.webp?.image_url || random.jpg?.image_url || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.animeEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

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

  let favoriteShow: {
    title: string;
    image: string;
    rating: number;
    episodes: number;
    mal_id: number;
    genre?: string;
  } | null = null;

  let mostWatched: {
    title: string;
    image: string;
    episodes: number;
    totalEpisodes: number;
    mal_id: number;
    genre?: string;
  } | null = null;

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

      const title = data.data?.title_english || data.data?.title || "";
      const image = data.data?.images?.webp?.large_image_url || "";
      const totalEps = data.data?.episodes || 0;
      const firstGenre = data.data?.genres?.[0]?.name;

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
          totalEpisodes: totalEps,
          mal_id: entry.animeId,
          genre: firstGenre,
        };
      }
    } catch {
      // Skip
    }
  }

  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const totalWatchTimeHours = Math.round((totalEpisodesWatched * 24) / 60);
  const averageRating =
    ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : 0;
  const totalEntries = entries.length;
  const completionRate =
    totalEntries > 0
      ? Math.round((statusCounts.completed / totalEntries) * 100)
      : 0;

  const topGenre = topGenres.length > 0 ? topGenres[0] : null;

  const watchTimeDays = Math.floor(totalWatchTimeHours / 24);
  const watchTimeRemainingHours = totalWatchTimeHours % 24;

  let heroImage: string | null = null;
  if (favoriteShow) {
    heroImage = await getRandomGalleryImage(favoriteShow.mal_id);
    if (!heroImage) {
      heroImage = favoriteShow.image;
    }
  }

  return NextResponse.json({
    totalEntries,
    statusCounts,
    totalEpisodesWatched,
    totalWatchTimeHours,
    watchTimeDays,
    watchTimeRemainingHours,
    averageRating,
    ratedCount,
    completionRate,
    topGenres,
    topGenre,
    favoriteShow,
    mostWatched,
    heroImage,
  });
}
