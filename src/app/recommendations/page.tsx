"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface Recommendation {
  mal_id: number;
  title: string;
  image: string;
  score: number | null;
  genres: string[];
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
          <Button onClick={() => signIn("discord")}>
            Sign in with Discord
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">For You</h1>
        <p className="text-muted-foreground mb-6">
          {data?.basedOn && data.basedOn.length > 0
            ? `Based on your interest in: ${data.basedOn.join(", ")}`
            : "Recommendations based on your watch history"}
        </p>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {data.recommendations.map((rec) => (
              <Link key={rec.mal_id} href={`/anime/${rec.mal_id}`}>
                <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all h-full">
                  <div className="relative w-full aspect-3/4">
                    <Image
                      src={rec.image}
                      alt={rec.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2">
                      {rec.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {rec.score && (
                        <span className="text-xs text-yellow-500">
                          ★ {rec.score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rec.genres.slice(0, 2).map((g) => (
                        <Badge
                          key={g}
                          variant="secondary"
                          className="text-[10px] px-1 py-0"
                        >
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
