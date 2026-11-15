import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureShows } from "@/lib/anime-store";
import { getTopByGenre } from "@/lib/jikan";
import {
  GENRE_IDS,
  becauseOf,
  buildRecommendations,
  pickGenres,
  scoreGenres,
} from "@/lib/recommend";

// The stored-show backfill and the genre lists each have a 10 second request
// budget and run one after the other.
export const maxDuration = 30;

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
      message: "Add shows to your watch list to get recommendations.",
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
  // The scheduler inside the upstream client still spaces the requests.
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
