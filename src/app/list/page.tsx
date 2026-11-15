"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeading } from "@/components/page-heading";
import { SectionHeading } from "@/components/section-heading";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { ErrorPanel } from "@/components/error-panel";
import { EmptyState } from "@/components/empty-state";
import { InlineMessage } from "@/components/inline-message";
import { Skeleton } from "@/components/skeleton";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  StatusGlyph,
  type WatchStatus,
} from "@/components/status-mark";
import { ListEntryRow, ListRowsSkeleton } from "@/components/list-entry-row";
import {
  useDeleteEntry,
  useEntries,
  useUpdateEntry,
  type Entry,
  type EntryPatch,
} from "@/hooks/use-entries";
import { showTitle } from "@/lib/anime-shape";
import { cn } from "@/lib/utils";

type Sort = "updated" | "title" | "rating";

const EMPTY_TAB: Record<WatchStatus, string> = {
  watching: "You are not watching anything right now.",
  plan_to_watch: "Nothing is planned yet.",
  completed: "You have not completed anything yet.",
  dropped: "You have not dropped anything.",
};

function sortEntries(entries: Entry[], sort: Sort) {
  if (sort === "title") {
    return [...entries].sort((a, b) =>
      showTitle(a.anime, a.animeId).localeCompare(
        showTitle(b.anime, b.animeId),
        "en",
        { sensitivity: "base" },
      ),
    );
  }
  if (sort === "rating") {
    return [...entries].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
  // The API already returns the most recently updated first.
  return entries;
}

function matchesTitle(entry: Entry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const a = entry.anime;
  return [showTitle(a, entry.animeId), a?.title, a?.titleJapanese]
    .filter(Boolean)
    .some((t) => t!.toLowerCase().includes(q));
}

function PageSkeleton() {
  return (
    <main className="page" aria-busy="true">
      <PageHeading title="Watch list" />
      <div className="mt-6 flex gap-7 border-b border-foreground pb-3 md:mt-8">
        {[48, 90, 110, 100, 80].map((w, i) => (
          <Skeleton key={i} className="h-5" style={{ width: w }} />
        ))}
      </div>
      <Skeleton className="mt-10 h-6 w-40" />
      <div className="mt-2">
        <ListRowsSkeleton />
      </div>
    </main>
  );
}

export default function WatchListPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("updated");
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

  const { data: entries, isLoading, error, refetch } = useEntries();
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  if (sessionStatus === "loading") return <PageSkeleton />;

  if (!session) {
    return <SignInPrompt title="Watch list" subject="your watch list" />;
  }

  if (isLoading) return <PageSkeleton />;

  if (error && !entries) {
    return (
      <ErrorPanel
        title="Watch list"
        message="Could not load your watch list."
        onRetry={() => refetch()}
      />
    );
  }

  const all = entries ?? [];
  const counts = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, all.filter((e) => e.status === s).length]),
  ) as Record<WatchStatus, number>;
  const shown = sortEntries(
    all.filter(
      (e) =>
        (activeTab === "all" || e.status === activeTab) &&
        matchesTitle(e, query),
    ),
    sort,
  );

  const failedId = updateEntry.isError
    ? updateEntry.variables?.id
    : deleteEntry.isError
      ? deleteEntry.variables
      : undefined;
  const failure = failedId ? (
    <InlineMessage className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span>
        {updateEntry.isError
          ? `Your changes were not saved: ${updateEntry.error.message}`
          : `The show was not removed: ${deleteEntry.error?.message}`}
      </span>
      <span className="flex gap-4">
        <Button
          type="button"
          variant="link"
          className="min-h-10 text-base"
          onClick={() => {
            if (updateEntry.isError && updateEntry.variables) {
              updateEntry.mutate(updateEntry.variables);
            } else if (deleteEntry.isError && deleteEntry.variables) {
              deleteEntry.mutate(deleteEntry.variables);
            }
          }}
        >
          Try again
        </Button>
        <Button
          type="button"
          variant="link"
          className="min-h-10 text-base"
          onClick={() => {
            updateEntry.reset();
            deleteEntry.reset();
          }}
        >
          Dismiss
        </Button>
      </span>
    </InlineMessage>
  ) : null;
  const failureShown = shown.some((e) => e.id === failedId);

  function save(entry: Entry, patch: EntryPatch) {
    deleteEntry.reset();
    updateEntry.mutate({ id: entry.id, patch });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    updateEntry.reset();
    deleteEntry.mutate(pendingDelete.id);
    setPendingDelete(null);
  }

  function rows(list: Entry[]) {
    return (
      <ul>
        {list.map((entry) => (
          <ListEntryRow
            key={entry.id}
            entry={entry}
            onSave={(patch) => save(entry, patch)}
            onRemove={() => setPendingDelete(entry)}
            message={entry.id === failedId ? failure : undefined}
          />
        ))}
      </ul>
    );
  }

  const tabs = [
    { value: "all", label: "All", count: all.length },
    ...STATUS_ORDER.map((s) => ({
      value: s,
      label: STATUS_LABEL[s],
      count: counts[s],
    })),
  ];

  return (
    <main className="page">
      <PageHeading title="Watch list" />

      {all.length === 0 ? (
        <EmptyState
          className="mt-6 md:mt-8"
          action={
            <Button asChild>
              <Link href="/search">Find a show</Link>
            </Button>
          }
        >
          Your watch list is empty.
        </EmptyState>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
          <div className="mt-6 flex flex-col-reverse gap-4 border-b border-foreground md:mt-8 md:flex-row md:items-end md:justify-between md:gap-8">
            <TabsList
              aria-label="Filter by status"
              className="-mb-px max-w-full overflow-x-auto scrollbar-none"
            >
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="min-h-10">
                  {t.label}
                  <span>{t.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-end gap-5 md:pb-2">
              <Input
                type="search"
                placeholder="Filter by title"
                aria-label="Filter by title"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 flex-1 md:w-[220px] md:flex-none"
              />
              <label className="flex items-center gap-2.5 text-muted-foreground">
                Sort
                <NativeSelect
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-10"
                >
                  <option value="updated">Last updated</option>
                  <option value="title">Title</option>
                  <option value="rating">Rating</option>
                </NativeSelect>
              </label>
            </div>
          </div>

          <TabsContent value={activeTab}>
            {failure && !failureShown && (
              <div className="mt-4">{failure}</div>
            )}

            {shown.length === 0 ? (
              query.trim() ? (
                <EmptyState
                  className="mt-2"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setQuery("")}
                    >
                      Clear the filter
                    </Button>
                  }
                >
                  No shows here match &ldquo;{query.trim()}&rdquo;.
                </EmptyState>
              ) : (
                <EmptyState
                  className="mt-2"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("all")}
                    >
                      Show all
                    </Button>
                  }
                >
                  {EMPTY_TAB[activeTab as WatchStatus]}
                </EmptyState>
              )
            ) : activeTab === "all" ? (
              STATUS_ORDER.map((s) => {
                const group = shown.filter((e) => e.status === s);
                if (group.length === 0) return null;
                return (
                  <section
                    key={s}
                    aria-labelledby={`group-${s}`}
                    className="mt-10"
                  >
                    <SectionHeading
                      id={`group-${s}`}
                      className="mb-1 items-center gap-2.5"
                    >
                      <span
                        className={cn(
                          "inline-flex",
                          s === "watching" && "text-vermilion",
                        )}
                      >
                        <StatusGlyph status={s} size="md" />
                      </span>
                      {STATUS_LABEL[s]}
                      <span className="text-lg font-normal text-muted-foreground">
                        {group.length}
                      </span>
                    </SectionHeading>
                    {rows(group)}
                  </section>
                );
              })
            ) : (
              <div className="mt-2">{rows(shown)}</div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from your watch list?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `${showTitle(pendingDelete.anime, pendingDelete.animeId)} will be removed, along with your progress, rating and review.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
