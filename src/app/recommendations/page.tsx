"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "@/components/anime-card";
import { Sparkles } from "lucide-react";
import type { JikanAnime } from "@/types/anime";

interface Recommendation {
  mal_id: number;
  title: string;
  image: string;
  score: number | null;
  genres: string[];
  becauseOf: string;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  basedOn: string[];
  message?: string;
}

export default function RecommendationsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["user-recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/user/recommendations");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<RecommendationsResponse>;
    },
    enabled: !!session,
  });

  if (sessionStatus !== "loading" && !session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to get recommendations.
          </p>
          <Button asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center sm:text-left">
          For You
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 text-center sm:text-left">
          {data?.basedOn && data.basedOn.length > 0
            ? `Based on your interest in: ${data.basedOn.join(", ")}`
            : "Recommendations based on your watch history"}
        </p>

        {(sessionStatus === "loading" || isLoading) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="aspect-3/4 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-12 sm:py-16 space-y-4">
            <p className="text-destructive text-sm sm:text-base">
              Failed to load recommendations.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Retrying..." : "Try again"}
            </Button>
          </div>
        )}

        {data?.message && !data.recommendations.length && (
          <div className="text-center py-12 sm:py-16">
            <Sparkles className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">
              {data.message}
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/search">Discover Anime</Link>
            </Button>
          </div>
        )}

        {data?.recommendations && data.recommendations.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {data.recommendations.map((rec) => {
              const anime: JikanAnime = {
                mal_id: rec.mal_id,
                title: rec.title,
                title_english: rec.title,
                title_japanese: null,
                images: {
                  jpg: {
                    image_url: rec.image,
                    small_image_url: rec.image,
                    large_image_url: rec.image,
                  },
                  webp: {
                    image_url: rec.image,
                    small_image_url: rec.image,
                    large_image_url: rec.image,
                  },
                },
                synopsis: null,
                episodes: null,
                status: "",
                aired: { from: null, to: null },
                score: rec.score,
                genres: rec.genres.map((g, i) => ({ mal_id: i, name: g })),
                studios: [],
                season: null,
                year: null,
                broadcast: { day: null, time: null },
              };
              return (
                <AnimeCard
                  key={rec.mal_id}
                  anime={anime}
                  reason={`Because you like ${rec.becauseOf}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
