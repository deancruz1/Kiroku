"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Check, X, Edit3, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JikanAnime } from "@/types/anime";
import { Star } from "lucide-react";

interface Entry {
  id: string;
  animeId: number;
  status: string;
  episodes: number;
  rating: number | null;
  notes: string | null;
}

const STATUS_ORDER = ["watching", "plan_to_watch", "completed", "dropped"];

const STATUS_LABELS: Record<string, string> = {
  watching: "Watching",
  plan_to_watch: "Plan to Watch",
  completed: "Completed",
  dropped: "Dropped",
};

async function fetchAnimeDetails(animeId: number): Promise<JikanAnime | null> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

function AnimeEntryCard({ entry }: { entry: Entry }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(entry.status);
  const [episodes, setEpisodes] = useState(entry.episodes);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(entry.rating || 0);

  const { data: anime, isLoading } = useQuery({
    queryKey: ["anime", entry.animeId],
    queryFn: () => fetchAnimeDetails(entry.animeId),
    staleTime: 30 * 60 * 1000,
  });

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/user/entries/${entry.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, episodes, rating: rating || null }),
      headers: { "Content-Type": "application/json" },
    });
    queryClient.invalidateQueries({ queryKey: ["user-entries"] });
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    await fetch(`/api/user/entries/${entry.id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["user-entries"] });
  }

  return (
    <Card className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
      <div className="flex">
        <Link href={`/anime/${entry.animeId}`} className="shrink-0">
          {isLoading ? (
            <div className="w-20 h-28 bg-muted animate-pulse" />
          ) : anime ? (
            <div className="relative w-20 h-28">
              <Image
                src={anime.images.webp.small_image_url}
                alt={anime.title}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-28 bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">N/A</span>
            </div>
          )}
        </Link>

        <CardContent className="p-3 flex-1 min-w-0">
          <Link href={`/anime/${entry.animeId}`}>
            <h3 className="font-medium text-sm truncate hover:underline">
              {anime?.title_english ||
                anime?.title ||
                `Anime #${entry.animeId}`}
            </h3>
          </Link>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setEpisodes(Math.max(0, episodes - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm w-8 text-center">{episodes}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setEpisodes(episodes + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground ml-1">ep</span>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n === rating ? 0 : n)}
                    className={`text-sm ${
                      n <= rating
                        ? "text-yellow-500"
                        : "text-muted-foreground/30"
                    } hover:text-yellow-500 transition-colors`}
                  >
                    <Star
                      className="h-3.5 w-3.5"
                      fill={n <= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-xs text-yellow-500 ml-1">
                    {rating}/10
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setEditing(false)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {STATUS_LABELS[entry.status]}
              </Badge>
              {entry.episodes > 0 && (
                <span className="text-xs text-muted-foreground">
                  {entry.episodes} ep
                </span>
              )}
              {entry.rating && (
                <span className="text-xs text-yellow-500">
                  ★ {entry.rating}
                </span>
              )}
              <div className="ml-auto flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditing(true);
                  }}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

export default function WatchListPage() {
  const { data: session } = useSession();

  const {
    data: entries,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-entries"],
    queryFn: async () => {
      const res = await fetch("/api/user/entries");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Entry[]>;
    },
    enabled: !!session,
  });

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Sign in to view your watch list.
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">My Watch List</h1>

        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {error && <p className="text-destructive">Failed to load entries.</p>}

        {entries && entries.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Your list is empty.</p>
            <Link href="/search">
              <Button>Search Anime</Button>
            </Link>
          </div>
        )}

        {entries && entries.length > 0 && (
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              {STATUS_ORDER.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {STATUS_LABELS[status]}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {entries.map((entry) => (
                <AnimeEntryCard key={entry.id} entry={entry} />
              ))}
            </TabsContent>

            {STATUS_ORDER.map((status) => (
              <TabsContent key={status} value={status} className="space-y-3">
                {entries
                  .filter((e) => e.status === status)
                  .map((entry) => (
                    <AnimeEntryCard key={entry.id} entry={entry} />
                  ))}
                {entries.filter((e) => e.status === status).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No anime in this category.
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </main>
  );
}
