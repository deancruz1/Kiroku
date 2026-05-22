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
  const { data: session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["user-recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/user/recommendations");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<RecommendationsResponse>;
    },
    enabled: !!session,
  });

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Sign in to get recommendations.
          </p>
          <Link href="/auth/signin">
            <Button>Sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">For You</h1>
        <p className="text-muted-foreground mb-6">
          {data?.basedOn && data.basedOn.length > 0
            ? `Based on your interest in: ${data.basedOn.join(", ")}`
            : "Recommendations based on your watch history"}
        </p>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="aspect-3/4 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        )}

        {data?.message && !data.recommendations.length && (
          <div className="text-center py-16">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{data.message}</p>
            <Link href="/search" className="mt-4 inline-block">
              <Button variant="outline">Discover Anime</Button>
            </Link>
          </div>
        )}

        {data?.recommendations && data.recommendations.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
