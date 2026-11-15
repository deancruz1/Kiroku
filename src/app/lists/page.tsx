"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Plus, FolderOpen, Trash2, Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LISTS_KEY,
  useCollections,
  type CollectionSummary,
} from "@/hooks/use-lists";
import { responseError } from "@/lib/fetch-json";
import { LIST_NAME_MAX } from "@/lib/entry-validation";

async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw await responseError(res, "Something went wrong");
  return res.json();
}

export default function ListsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CollectionSummary | null>(
    null,
  );

  const { data: lists, isLoading, error, refetch, isFetching } =
    useCollections();

  const createList = useMutation({
    mutationFn: (name: string) => sendJson("/api/user/lists", "POST", { name }),
    onSuccess: () => setNewName(""),
    onSettled: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });

  const renameList = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      sendJson(`/api/user/lists/${id}`, "PATCH", { name }),
    onSuccess: (_data, { id }) => {
      setEditingId(null);
      setEditName("");
      queryClient.invalidateQueries({ queryKey: ["list", id] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });

  const deleteList = useMutation({
    mutationFn: (id: string) => sendJson(`/api/user/lists/${id}`, "DELETE"),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["list", id] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });

  function handleCreate() {
    if (!newName.trim() || createList.isPending) return;
    createList.mutate(newName.trim());
  }

  function handleRename(id: string) {
    if (!editName.trim() || renameList.isPending) return;
    renameList.mutate({ id, name: editName.trim() });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteList.mutate(pendingDelete.id);
    setPendingDelete(null);
  }

  if (sessionStatus === "loading") {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center sm:text-left">
            My Collections
          </h1>
          <GridSkeleton />
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to view your lists.
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center sm:text-left">
          My Collections
        </h1>

        <div className="mb-6 sm:mb-8">
          <div className="flex items-stretch gap-2 justify-center sm:justify-start">
            <Input
              placeholder="New collection name..."
              aria-label="New collection name"
              value={newName}
              maxLength={LIST_NAME_MAX}
              onChange={(e) => {
                setNewName(e.target.value);
                if (createList.isError) createList.reset();
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="max-w-xs text-xs sm:text-sm"
            />
            <Button
              onClick={handleCreate}
              disabled={createList.isPending || !newName.trim()}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>
          {createList.isError && (
            <p
              role="alert"
              className="text-xs text-destructive mt-2 text-center sm:text-left"
            >
              Could not create the collection: {createList.error.message}
            </p>
          )}
          {deleteList.isError && (
            <p
              role="alert"
              className="text-xs text-destructive mt-2 text-center sm:text-left"
            >
              Could not delete the collection: {deleteList.error.message}
            </p>
          )}
        </div>

        {isLoading && <GridSkeleton />}

        {error && !lists && (
          <div className="text-center py-12 sm:py-16 space-y-4">
            <p className="text-destructive text-sm sm:text-base">
              Failed to load your collections.
            </p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Retrying..." : "Try again"}
            </Button>
          </div>
        )}

        {lists && lists.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <FolderOpen className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">
              No collections yet. Create one to get started.
            </p>
          </div>
        )}

        {lists && lists.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {lists.map((list) => (
              <div
                key={list.id}
                className="rounded-lg overflow-hidden bg-card border transition-all hover:ring-2 hover:ring-primary h-full"
              >
                <Link href={`/lists/${list.id}`} aria-label={list.name}>
                  <div className="relative w-full aspect-3/4 bg-gradient-to-br from-muted/80 to-muted overflow-hidden">
                    {list.preview.length === 1 ? (
                      <AnimeCover
                        image={list.preview[0].anime?.imageUrl ?? null}
                        single
                      />
                    ) : list.preview.length > 0 ? (
                      <div className="grid grid-cols-2 w-full h-full">
                        {list.preview.map((a) => (
                          <AnimeCover
                            key={a.animeId}
                            image={a.anime?.imageUrl ?? null}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FolderOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-2 sm:p-3 border-t">
                  {editingId === list.id ? (
                    <>
                      <div className="flex gap-1">
                        <Input
                          value={editName}
                          aria-label="Collection name"
                          maxLength={LIST_NAME_MAX}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            if (renameList.isError) renameList.reset();
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleRename(list.id)
                          }
                          className="h-7 text-xs"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          aria-label="Save name"
                          disabled={renameList.isPending || !editName.trim()}
                          onClick={() => handleRename(list.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          aria-label="Cancel renaming"
                          onClick={() => {
                            setEditingId(null);
                            renameList.reset();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {renameList.isError && (
                        <p role="alert" className="text-[10px] sm:text-xs text-destructive mt-1">
                          {renameList.error.message}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/lists/${list.id}`}
                        className="font-medium text-xs sm:text-sm truncate flex-1 hover:underline"
                      >
                        {list.name}
                      </Link>
                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          aria-label={`Rename ${list.name}`}
                          onClick={() => {
                            renameList.reset();
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
                          aria-label={`Delete ${list.name}`}
                          onClick={() => {
                            deleteList.reset();
                            setPendingDelete(list);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {list.count} anime
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this collection?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.name}" and its ${pendingDelete.count} anime will be removed. Your watch list is not affected.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="aspect-3/4 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

function AnimeCover({
  image,
  single,
}: {
  image: string | null;
  single?: boolean;
}) {
  if (!image) return <div className="bg-muted/50 w-full h-full" />;

  return (
    <Image
      src={image}
      alt=""
      fill={single}
      width={single ? undefined : 100}
      height={single ? undefined : 150}
      className={single ? "object-cover" : "w-full h-full object-cover"}
    />
  );
}
