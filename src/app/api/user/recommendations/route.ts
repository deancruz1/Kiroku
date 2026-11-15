import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jikanApi } from "@/lib/axios";
import { ensureShows } from "@/lib/anime-store";
import {
  GENRE_IDS,
  becauseOf,
  buildRecommendations,
  pickGenres,
  scoreGenres,
  type Candidate,
} from "@/lib/recommend";
import type { JikanSearchResponse } from "@/types/anime";

// Shared by every user; a failed request throws, so it is not cached
const getTopByGenre = unstable_cache(
  async (genreId: number): Promise<Candidate[]> => {
    const { data } = await jikanApi.get<JikanSearchResponse>("/anime", {
      params: {
        genres: genreId,
        order_by: "score",
        sort: "desc",
        limit: 25,
        sfw: true,
      },
    });
    return (data.data ?? []).map((anime) => ({
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image: anime.images.webp.large_image_url,
      score: anime.score,
      genres: anime.genres?.map((g) => g.name) || [],
    }));
  },
  ["recommendations-top-by-genre"],
  { revalidate: 21600 },
);

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.animeEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { animeId: true, status: true, rating: true },
  });

  if (entries.length === 0) {
    return NextResponse.json({
      recommendations: [],
      basedOn: [],
      message: "Add some anime to get recommendations.",
    });
  }

  const shows = await ensureShows(entries.map((e) => e.animeId));
  const topGenres = pickGenres(scoreGenres(entries, shows));

  if (topGenres.length === 0) {
    return NextResponse.json({
      recommendations: [],
      basedOn: [],
      message: "Not enough data for recommendations.",
    });
  }

  // Started together so an outage costs one request budget, not one per genre.
  // The scheduler inside jikanApi still spaces the requests.
  const settled = await Promise.allSettled(
    topGenres.map((genre) => getTopByGenre(GENRE_IDS[genre])),
  );
  const results = topGenres.flatMap((genre, i) => {
    const result = settled[i];
    return result.status === "fulfilled"
      ? [{ genre, candidates: result.value }]
      : [];
  });

  const reasons = Object.fromEntries(
    topGenres.map((genre) => [genre, becauseOf(genre, entries, shows)]),
  );
  const recommendations = buildRecommendations(
    results,
    new Set(entries.map((e) => e.animeId)),
    reasons,
  );

  return NextResponse.json({
    recommendations,
    basedOn: topGenres,
    ...(recommendations.length === 0 && {
      message:
        results.length === 0
          ? "Recommendations are unavailable right now. Try again later."
          : "Not enough data for recommendations.",
    }),
  });
}
