"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const queryClient = useQueryClient();

  const { data: list, isLoading } = useQuery({
    queryKey: ["list", id],
    queryFn: async () => {
      const res = await fetch(`/api/user/lists/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<ListDetail>;
    },
    enabled: !!session,
  });

  async function handleRemove(animeId: number) {
    await fetch(`/api/user/lists/${id}/anime`, {
      method: "DELETE",
      body: JSON.stringify({ animeId }),
      headers: { "Content-Type": "application/json" },
    });
    queryClient.invalidateQueries({ queryKey: ["list", id] });
    queryClient.invalidateQueries({ queryKey: ["user-lists"] });
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to view this list.
          </p>
          <Link href="/auth/signin">
            <Button>Sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm sm:text-base">Loading...</p>
      </main>
    );
  }

  if (!list) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm sm:text-base">
          List not found.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Link
          href="/lists"
          className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 sm:h-4 w-3.5 sm:w-4 mr-1" />
          Back to collections
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center sm:text-left">
          {list.name}
        </h1>

        {list.animes.length === 0 ? (
          <p className="text-muted-foreground text-sm sm:text-base text-center sm:text-left">
            No anime in this collection yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            <AnimatePresence>
              {list.animes.map((entry) => (
                <AnimeLoader
                  key={entry.id}
                  animeId={entry.animeId}
                  onRemove={() => handleRemove(entry.animeId)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

function AnimeLoader({
  animeId,
  onRemove,
}: {
  animeId: number;
  onRemove: () => void;
}) {
  const { data: anime } = useQuery({
    queryKey: ["anime", animeId],
    queryFn: async () => {
      const res = await jikanApi.get(`/anime/${animeId}`);
      return res.data.data as JikanAnime;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (!anime) {
    return (
      <motion.div
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2, ease: "easeIn" }}
        className="aspect-3/4 bg-muted animate-pulse rounded-lg"
      />
    );
  }

  return (
    <motion.div
      layout
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.25, ease: "easeIn" }}
      className="relative group"
    >
      <AnimeCard anime={anime} />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-red-400 hover:bg-black/80 hover:text-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
