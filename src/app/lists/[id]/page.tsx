"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "@/components/anime-card";
import { jikanApi } from "@/lib/axios";
import type { JikanAnime } from "@/types/anime";

interface ListDetail {
  id: string;
  name: string;
  animes: { id: string; animeId: number }[];
}

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();

  const { data: list, isLoading } = useQuery({
    queryKey: ["list", id],
    queryFn: async () => {
      const res = await fetch(`/api/user/lists/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<ListDetail>;
    },
    enabled: !!session,
  });

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Sign in to view this list.</p>
          <Link href="/auth/signin">
            <Button>Sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!list) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">List not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/lists"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to collections
        </Link>

        <h1 className="text-3xl font-bold mb-6">{list.name}</h1>

        {list.animes.length === 0 ? (
          <p className="text-muted-foreground">
            No anime in this collection yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {list.animes.map((entry) => (
              <AnimeLoader key={entry.id} animeId={entry.animeId} listId={id} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AnimeLoader({ animeId, listId }: { animeId: number; listId: string }) {
  const { data: anime } = useQuery({
    queryKey: ["anime", animeId],
    queryFn: async () => {
      const res = await jikanApi.get(`/anime/${animeId}`);
      return res.data.data as JikanAnime;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (!anime) {
    return <div className="aspect-3/4 bg-muted animate-pulse rounded-lg" />;
  }

  return <AnimeCard anime={anime} />;
}
