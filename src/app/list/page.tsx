"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Check, X, Edit3, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
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

  const totalEpisodes = anime?.episodes || 0;

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/user/entries/${entry.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, episodes, rating: rating || null }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      queryClient.setQueryData(["user-entries"], (old: Entry[] | undefined) =>
        old?.map((e) =>
          e.id === entry.id
            ? { ...e, status, episodes, rating: rating || null }
            : e,
        ),
      );
    }
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    await fetch(`/api/user/entries/${entry.id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["user-entries"] });
  }

  return (
    <Card className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
      <div className="flex p-2.5 sm:p-3 gap-3 sm:gap-4">
        <Link
          href={`/anime/${entry.animeId}`}
          className="shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-20 sm:w-24 h-20 sm:h-24 bg-muted animate-pulse rounded-lg" />
          ) : anime ? (
            <div className="relative w-20 sm:w-24 h-20 sm:h-24 rounded-lg overflow-hidden">
              <Image
                src={anime.images.webp.large_image_url}
                alt={anime.title}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-20 sm:w-24 h-20 sm:h-24 bg-muted flex items-center justify-center rounded-lg">
              <span className="text-xs text-muted-foreground">N/A</span>
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/anime/${entry.animeId}`} className="cursor-pointer">
            <h3 className="font-semibold text-sm sm:text-base truncate hover:underline">
              {anime?.title_english ||
                anime?.title ||
                `Anime #${entry.animeId}`}
            </h3>
          </Link>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-7 sm:h-8 text-xs">
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
                  className="h-6 sm:h-7 w-6 sm:w-7"
                  onClick={() => setEpisodes(Math.max(0, episodes - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs sm:text-sm w-8 text-center">
                  {episodes}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 sm:h-7 w-6 sm:w-7"
                  onClick={() => {
                    if (totalEpisodes === 0 || episodes < totalEpisodes) {
                      setEpisodes(episodes + 1);
                    }
                  }}
                  disabled={totalEpisodes > 0 && episodes >= totalEpisodes}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground ml-1">
                  / {totalEpisodes > 0 ? totalEpisodes : "?"} ep
                </span>
              </div>
              <div className="flex items-center gap-0.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n === rating ? 0 : n)}
                    className={`text-xs sm:text-sm cursor-pointer ${
                      n <= rating
                        ? "text-yellow-500"
                        : "text-muted-foreground/30"
                    } hover:text-yellow-500 transition-colors`}
                  >
                    <Star
                      className="h-3 sm:h-3.5 w-3 sm:w-3.5"
                      fill={n <= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-xs sm:text-sm text-yellow-500 ml-1">
                    {rating}/10
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-6 sm:h-7 text-xs"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 sm:h-7 text-xs"
                  onClick={() => setEditing(false)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {STATUS_LABELS[entry.status]}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {entry.episodes > 0 || totalEpisodes > 0
                  ? `${entry.episodes} / ${totalEpisodes > 0 ? totalEpisodes : "?"} ep`
                  : ""}
              </span>
              {entry.rating && (
                <span className="text-xs sm:text-sm text-yellow-500">
                  ★ {entry.rating}
                </span>
              )}
              <div className="ml-auto flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 sm:h-8 w-7 sm:w-8 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditing(true);
                  }}
                >
                  <Edit3 className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 sm:h-8 w-7 sm:w-8 text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                >
                  <Trash2 className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function WatchListPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("all");

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
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to view your watch list.
          </p>
          <Link href="/auth/signin">
            <Button>Sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  const filteredEntries =
    activeTab === "all"
      ? entries || []
      : (entries || []).filter((e) => e.status === activeTab);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center sm:text-left">
          My Watch List
        </h1>

        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 sm:h-28 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm sm:text-base">
            Failed to load entries.
          </p>
        )}

        {entries && entries.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <p className="text-muted-foreground text-sm sm:text-base mb-4">
              Your list is empty.
            </p>
            <Link href="/search">
              <Button>Search Anime</Button>
            </Link>
          </div>
        )}

        {entries && entries.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full h-9 sm:h-10">
              <TabsTrigger
                value="all"
                className="flex-1 text-xs sm:text-sm cursor-pointer"
              >
                All
              </TabsTrigger>
              {STATUS_ORDER.map((status) => (
                <TabsTrigger
                  key={status}
                  value={status}
                  className="flex-1 text-xs sm:text-sm cursor-pointer"
                >
                  {STATUS_LABELS[status]}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="space-y-2.5 sm:space-y-3">
              <AnimatePresence mode="wait">
                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{
                        duration: 0.25,
                        delay: index * 0.04,
                        ease: "easeOut",
                      }}
                    >
                      <AnimeEntryCard entry={entry} />
                    </motion.div>
                  ))
                ) : (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="text-center text-muted-foreground py-8 text-sm sm:text-base"
                  >
                    No anime in this category.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </Tabs>
        )}
      </div>
    </main>
  );
}
