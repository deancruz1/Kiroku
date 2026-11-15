"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "@/components/anime-card";
import { LISTS_KEY, type CollectionDetail } from "@/hooks/use-lists";
import { responseError } from "@/lib/fetch-json";
import { showTitle, toJikanAnime, type StoredShow } from "@/lib/anime-shape";

class HttpError extends Error {
  status: number;

  constructor(status: number) {
    super(`Request failed with ${status}`);
    this.status = status;
  }
}

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const listKey = ["list", id];

  const {
    data: list,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const res = await fetch(`/api/user/lists/${id}`);
      if (!res.ok) throw new HttpError(res.status);
      return res.json() as Promise<CollectionDetail>;
    },
    enabled: !!session,
    retry: (count, err) => !(err instanceof HttpError && err.status === 404) && count < 3,
  });

  const removeAnime = useMutation({
    mutationFn: async (animeId: number) => {
      const res = await fetch(`/api/user/lists/${id}/anime`, {
        method: "DELETE",
        body: JSON.stringify({ animeId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw await responseError(res, "Could not remove the show");
    },
    onMutate: async (animeId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<CollectionDetail>(listKey);
      queryClient.setQueryData<CollectionDetail>(listKey, (old) =>
        old
          ? {
              ...old,
              count: old.count - 1,
              animes: old.animes.filter((a) => a.animeId !== animeId),
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _animeId, result) => {
      if (result?.previous) queryClient.setQueryData(listKey, result.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });

  if (sessionStatus === "loading" || isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm sm:text-base">Loading...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to view this list.
          </p>
          <Button asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (error && !(error instanceof HttpError && error.status === 404)) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-destructive text-sm sm:text-base">
            Failed to load this collection.
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Retrying..." : "Try again"}
          </Button>
        </div>
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

        {removeAnime.isError && (
          <p role="alert" className="text-xs sm:text-sm text-destructive mb-4">
            The show was not removed: {removeAnime.error.message}
          </p>
        )}

        {list.animes.length === 0 ? (
          <p className="text-muted-foreground text-sm sm:text-base text-center sm:text-left">
            No anime in this collection yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            <AnimatePresence>
              {list.animes.map((entry) => (
                <CollectionItem
                  key={entry.id}
                  animeId={entry.animeId}
                  anime={entry.anime}
                  onRemove={() => removeAnime.mutate(entry.animeId)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

function CollectionItem({
  animeId,
  anime,
  onRemove,
}: {
  animeId: number;
  anime: StoredShow | null;
  onRemove: () => void;
}) {
  const title = showTitle(anime, animeId);

  return (
    <motion.div
      layout
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.25, ease: "easeIn" }}
      className="relative group"
    >
      {anime?.imageUrl ? (
        <AnimeCard anime={toJikanAnime(anime)} />
      ) : (
        <Link href={`/anime/${animeId}`} className="block h-full">
          <div className="rounded-lg overflow-hidden bg-card border transition-all h-full hover:ring-2 hover:ring-primary">
            <div className="w-full aspect-3/4 bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">N/A</span>
            </div>
            <div className="p-3 border-t">
              <h3 className="font-medium text-sm truncate">{title}</h3>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Details not loaded yet
              </p>
            </div>
          </div>
        </Link>
      )}
      <button
        type="button"
        aria-label={`Remove ${title} from this collection`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-red-400 hover:bg-black/80 hover:text-red-300 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
