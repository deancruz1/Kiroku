"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { PageHeading } from "@/components/page-heading";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { ErrorPanel } from "@/components/error-panel";
import { EmptyState } from "@/components/empty-state";
import { InlineMessage } from "@/components/inline-message";
import { Skeleton } from "@/components/skeleton";
import { Poster } from "@/components/poster";
import {
  LISTS_KEY,
  useCollections,
  type CollectionSummary,
} from "@/hooks/use-lists";
import { responseError } from "@/lib/fetch-json";
import { LIST_NAME_MAX } from "@/lib/entry-validation";
import { showTitle } from "@/lib/anime-shape";

const ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2.5 border-b border-rule py-3 md:grid-cols-[156px_minmax(0,1fr)_auto]";

async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw await responseError(res, "Something went wrong");
  return res.json();
}

const showCount = (n: number) => `${n} ${n === 1 ? "show" : "shows"}`;

function RowsSkeleton() {
  return (
    <ul aria-hidden="true" className="mt-2">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className={ROW}>
          <div className="order-last col-span-full flex gap-1 md:order-none md:col-span-1">
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} className="h-12 w-9" />
            ))}
          </div>
          <div>
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="mt-2 h-3.5 w-16" />
          </div>
          <div className="flex">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
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
  const renameButtons = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterRename = useRef<string | null>(null);

  const { data: lists, isLoading, error, refetch } = useCollections();

  const createList = useMutation({
    mutationFn: (name: string) => sendJson("/api/user/lists", "POST", { name }),
    onSuccess: () => setNewName(""),
    onSettled: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });

  const renameList = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      sendJson(`/api/user/lists/${id}`, "PATCH", { name }),
    onSuccess: (_data, { id }) => {
      stopEditing(id);
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

  useEffect(() => {
    if (editingId === null && focusAfterRename.current) {
      renameButtons.current.get(focusAfterRename.current)?.focus();
      focusAfterRename.current = null;
    }
  }, [editingId]);

  function stopEditing(id: string) {
    focusAfterRename.current = id;
    setEditingId(null);
    setEditName("");
    renameList.reset();
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || createList.isPending) return;
    createList.mutate(newName.trim());
  }

  function handleRename(e: React.FormEvent, id: string) {
    e.preventDefault();
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
      <main className="page" aria-busy="true">
        <PageHeading title="Collections" rule />
        <RowsSkeleton />
      </main>
    );
  }

  if (!session) {
    return <SignInPrompt title="Collections" subject="your collections" />;
  }

  if (error && !lists) {
    return (
      <ErrorPanel
        title="Collections"
        message="Could not load your collections."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <main className="page">
      <PageHeading title="Collections" rule>
        <div className="w-full md:w-auto">
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex flex-1 flex-col md:w-[260px] md:flex-none">
              <label
                htmlFor="new-collection"
                className="mb-1.5 text-sm text-muted-foreground"
              >
                New collection
              </label>
              <Input
                id="new-collection"
                value={newName}
                maxLength={LIST_NAME_MAX}
                aria-invalid={createList.isError ? true : undefined}
                aria-describedby={
                  createList.isError ? "new-collection-error" : undefined
                }
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (createList.isError) createList.reset();
                }}
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={createList.isPending || !newName.trim()}
            >
              {createList.isPending ? "Creating" : "Create"}
            </Button>
          </form>
          {createList.isError && (
            <InlineMessage id="new-collection-error" className="mt-1.5">
              Could not create the collection: {createList.error.message}
            </InlineMessage>
          )}
        </div>
      </PageHeading>

      {deleteList.isError && (
        <InlineMessage className="mt-4 flex flex-wrap items-baseline gap-x-4">
          <span>Could not delete the collection: {deleteList.error.message}</span>
          <Button
            type="button"
            variant="link"
            className="min-h-10 text-base"
            onClick={() => {
              if (deleteList.variables) deleteList.mutate(deleteList.variables);
            }}
          >
            Try again
          </Button>
        </InlineMessage>
      )}

      {isLoading && <RowsSkeleton />}

      {lists && lists.length === 0 && (
        <EmptyState className="mt-2">
          You have no collections yet.
        </EmptyState>
      )}

      {lists && lists.length > 0 && (
        <ul className="mt-2">
          {lists.map((list) => {
            const href = `/lists/${list.id}`;
            return (
              <li key={list.id} className={ROW}>
                <Link
                  href={href}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="order-last col-span-full flex gap-1 empty:hidden md:order-none md:col-span-1 md:empty:flex"
                >
                  {list.preview.map((p) => (
                    <Poster
                      key={p.animeId}
                      src={p.anime?.imageUrl}
                      title={showTitle(p.anime, p.animeId)}
                      size="sm"
                    />
                  ))}
                </Link>

                {editingId === list.id ? (
                  <form
                    onSubmit={(e) => handleRename(e, list.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") stopEditing(list.id);
                    }}
                    className="col-span-full flex flex-col md:col-span-2"
                  >
                    <label
                      htmlFor={`rename-${list.id}`}
                      className="mb-1.5 text-sm text-muted-foreground"
                    >
                      New name for {list.name}
                    </label>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                      <Input
                        id={`rename-${list.id}`}
                        value={editName}
                        maxLength={LIST_NAME_MAX}
                        aria-invalid={renameList.isError ? true : undefined}
                        aria-describedby={
                          renameList.isError
                            ? `rename-${list.id}-error`
                            : undefined
                        }
                        onChange={(e) => {
                          setEditName(e.target.value);
                          if (renameList.isError) renameList.reset();
                        }}
                        className="h-10 min-w-0 flex-1 text-lg md:max-w-[360px]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10"
                          onClick={() => stopEditing(list.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="h-10"
                          disabled={renameList.isPending || !editName.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                    {renameList.isError && (
                      <InlineMessage
                        id={`rename-${list.id}-error`}
                        className="mt-1.5"
                      >
                        Could not rename it: {renameList.error.message}
                      </InlineMessage>
                    )}
                  </form>
                ) : (
                  <>
                    <div className="min-w-0">
                      <Link
                        href={href}
                        className="-my-2.5 block w-fit max-w-full py-2.5 text-lg leading-[1.25]"
                      >
                        {list.name}
                      </Link>
                      <p className="mt-0.5 text-[15px] text-muted-foreground">
                        {showCount(list.count)}
                      </p>
                    </div>
                    <div className="flex">
                      <Button
                        ref={(el) => {
                          if (el) renameButtons.current.set(list.id, el);
                          else renameButtons.current.delete(list.id);
                        }}
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Rename ${list.name}`}
                        onClick={() => {
                          renameList.reset();
                          setEditingId(list.id);
                          setEditName(list.name);
                        }}
                      >
                        <Pencil aria-hidden="true" className="size-[17px]" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Delete ${list.name}`}
                        onClick={() => {
                          deleteList.reset();
                          setPendingDelete(list);
                        }}
                      >
                        <Trash2 aria-hidden="true" className="size-[17px]" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

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
                ? `“${pendingDelete.name}” will be deleted. Your watch list is not affected.`
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
