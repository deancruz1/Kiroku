"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Plus, FolderOpen, Trash2, Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jikanApi } from "@/lib/axios";

interface ListAnime {
  id: string;
  animeId: number;
}

interface CustomList {
  id: string;
  name: string;
  createdAt: string;
  animes: ListAnime[];
}

export default function ListsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: lists, isLoading } = useQuery({
    queryKey: ["user-lists"],
    queryFn: async () => {
      const res = await fetch("/api/user/lists");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<CustomList[]>;
    },
    enabled: !!session,
  });

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/user/lists", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
      headers: { "Content-Type": "application/json" },
    });
    queryClient.invalidateQueries({ queryKey: ["user-lists"] });
    setNewName("");
    setCreating(false);
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    await fetch(`/api/user/lists/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editName }),
      headers: { "Content-Type": "application/json" },
    });
    queryClient.invalidateQueries({ queryKey: ["user-lists"] });
    setEditingId(null);
    setEditName("");
  }

  async function handleDelete(id: string) {
    await fetch(`/api/user/lists/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["user-lists"] });
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Sign in to view your lists.</p>
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
        <h1 className="text-3xl font-bold mb-6">My Collections</h1>

        <div className="flex gap-2 mb-8">
          <Input
            placeholder="New collection name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="max-w-xs h-9 text-sm"
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        )}

        {lists && lists.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No collections yet. Create one to get started.
            </p>
          </div>
        )}

        {lists && lists.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {lists.map((list) => (
              <div
                key={list.id}
                className="rounded-lg overflow-hidden bg-card border transition-all hover:ring-2 hover:ring-primary h-full"
              >
                <Link href={`/lists/${list.id}`}>
                  <div className="relative w-full aspect-[3/4] bg-muted">
                    {list.animes.length === 1 ? (
                      <AnimeCover animeId={list.animes[0].animeId} single />
                    ) : list.animes.length > 0 ? (
                      <div className="grid grid-cols-2 w-full h-full">
                        {list.animes.slice(0, 4).map((a, i) => (
                          <AnimeCover key={i} animeId={a.animeId} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FolderOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3 border-t">
                  {editingId === list.id ? (
                    <div className="flex gap-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleRename(list.id)
                        }
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleRename(list.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/lists/${list.id}`}
                        className="font-medium text-sm truncate flex-1 hover:underline"
                      >
                        {list.name}
                      </Link>
                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingId(list.id);
                            setEditName(list.name);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDelete(list.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {list.animes.length} anime
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AnimeCover({
  animeId,
  single,
}: {
  animeId: number;
  single?: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["anime-cover", animeId],
    queryFn: async () => {
      const res = await jikanApi.get(`/anime/${animeId}`);
      return res.data.data?.images?.webp?.large_image_url || null;
    },
    staleTime: Infinity,
  });

  if (!data) return <div className="bg-muted w-full h-full" />;

  return (
    <Image
      src={data}
      alt=""
      fill={single}
      width={single ? undefined : 100}
      height={single ? undefined : 150}
      className={single ? "object-cover" : "w-full h-full object-cover"}
    />
  );
}
