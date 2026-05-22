import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jikanApi } from "@/lib/axios";

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
    where: {
      userId: session.user.id,
      rating: { not: null },
    },
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

  const entryGenres: { animeId: number; title: string; genres: string[] }[] =
    [];

  for (const entry of entries) {
    try {
      const { data } = await jikanApi.get(`/anime/${entry.animeId}`);
      if (data.data?.genres) {
        entryGenres.push({
          animeId: entry.animeId,
          title: data.data.title_english || data.data.title,
          genres: data.data.genres.map((g: { name: string }) => g.name),
        });
      }
    } catch {
      // Skip
    }
  }

  const genreCounts: Record<string, number> = {};
  for (const entry of entryGenres) {
    for (const genre of entry.genres) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }
  }

  const topGenres = Object.entries(genreCounts)
    .filter(([name]) => GENRE_IDS[name])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (topGenres.length === 0) {
    return NextResponse.json({
      recommendations: [],
      basedOn: [],
      message: "Not enough data for recommendations.",
    });
  }

  const recommendations: {
    mal_id: number;
    title: string;
    image: string;
    score: number | null;
    genres: string[];
    becauseOf: string;
  }[] = [];

  for (const [genreName] of topGenres) {
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
            !recommendations.find((r) => r.mal_id === anime.mal_id) &&
            anime.score &&
            anime.score >= 7
          ) {
            const matchingEntry = entryGenres.find((e) =>
              e.genres.includes(genreName),
            );
            const becauseOf = matchingEntry ? matchingEntry.title : genreName;

            recommendations.push({
              mal_id: anime.mal_id,
              title: anime.title_english || anime.title,
              image: anime.images.webp.large_image_url,
              score: anime.score,
              genres: anime.genres?.map((g: { name: string }) => g.name) || [],
              becauseOf,
            });
          }
        }
      }
    } catch {
      // Skip
    }

    if (recommendations.length >= 10) break;
  }

  return NextResponse.json({
    recommendations: recommendations.slice(0, 10),
    basedOn: topGenres.map(([name]) => name),
  });
}
