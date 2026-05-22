import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jikanApi } from "@/lib/axios";

// Common genre name to ID mapping
const GENRE_IDS: Record<string, number> = {
  Action: 1,
  Adventure: 2,
  Comedy: 4,
  Drama: 8,
  Fantasy: 10,
  Horror: 14,
  Mystery: 7,
  Romance: 22,
  "Sci-Fi": 24,
  "Slice of Life": 36,
  Sports: 30,
  Supernatural: 37,
  Thriller: 41,
  Mecha: 18,
  Music: 19,
  School: 23,
  Shounen: 27,
  Seinen: 42,
  Josei: 43,
  Shoujo: 25,
  Isekai: 62,
  Psychological: 40,
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.animeEntry.findMany({
    where: { userId: session.user.id },
    select: { animeId: true },
  });

  const watchedIds = new Set(entries.map((e) => e.animeId));

  if (watchedIds.size === 0) {
    return NextResponse.json({
      recommendations: [],
      basedOn: [],
      message: "Add some anime to get recommendations.",
    });
  }

  // Get genre counts from entries using Jikan
  const genreCounts: Record<string, number> = {};

  for (const entry of entries) {
    try {
      const { data } = await jikanApi.get(`/anime/${entry.animeId}`);
      if (data.data?.genres) {
        for (const genre of data.data.genres) {
          genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
        }
      }
    } catch {
      // Skip
    }
  }

  // Get top 3 genres that have IDs
  const topGenres = Object.entries(genreCounts)
    .filter(([name]) => GENRE_IDS[name])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => name);

  if (topGenres.length === 0) {
    return NextResponse.json({
      recommendations: [],
      basedOn: [],
      message: "Not enough data for recommendations.",
    });
  }

  const recommendedAnime: {
    mal_id: number;
    title: string;
    image: string;
    score: number | null;
    genres: string[];
  }[] = [];

  // Search using genre IDs (more reliable)
  for (const genreName of topGenres) {
    const genreId = GENRE_IDS[genreName];
    if (!genreId) continue;

    try {
      const { data } = await jikanApi.get("/anime", {
        params: {
          genres: genreId,
          order_by: "score",
          sort: "desc",
          limit: 5,
          sfw: true,
        },
      });

      if (data.data) {
        for (const anime of data.data) {
          if (
            !watchedIds.has(anime.mal_id) &&
            !recommendedAnime.find((r) => r.mal_id === anime.mal_id)
          ) {
            recommendedAnime.push({
              mal_id: anime.mal_id,
              title: anime.title_english || anime.title,
              image: anime.images.webp.large_image_url,
              score: anime.score,
              genres: anime.genres?.map((g: { name: string }) => g.name) || [],
            });
          }
        }
      }
    } catch {
      // Skip
    }

    if (recommendedAnime.length >= 10) break;
  }

  return NextResponse.json({
    recommendations: recommendedAnime.slice(0, 10),
    basedOn: topGenres,
  });
}
