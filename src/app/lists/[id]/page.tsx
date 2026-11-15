"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ShowTitle } from "@/components/show-title";
import { TITLE } from "@/components/list-entry-row";
import { LISTS_KEY, type CollectionDetail } from "@/hooks/use-lists";
import { responseError } from "@/lib/fetch-json";
import { showTitle, type StoredShow } from "@/lib/anime-shape";

class HttpError extends Error {
  status: number;

  constructor(status: number) {
    super(`Request failed with ${status}`);
    this.status = status;
  }
}

const ROW =
  "grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-rule py-2.5 md:grid-cols-[36px_minmax(0,1fr)_240px_auto] md:gap-x-5";

const showCount = (n: number) => `${n} ${n === 1 ? "show" : "shows"}`;

function details(anime: StoredShow | null) {
  if (!anime) return "";
  const season =
    anime.season && anime.year
      ? `${anime.season[0].toUpperCase()}${anime.season.slice(1)} ${anime.year}`
      : anime.year
        ? String(anime.year)
        : null;
  const episodes = anime.episodes
    ? `${anime.episodes} ${anime.episodes === 1 ? "episode" : "episodes"}`
    : null;
  return [season, episodes].filter(Boolean).join(" · ");
}

function BackLink() {
  return (
    <Link
      href="/lists"
      className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-muted-foreground hover:text-foreground md:mb-5"
    >
      <ArrowLeft aria-hidden="true" className="size-4 stroke-[1.75]" />
      Collections
    </Link>
  );
}

function PageSkeleton() {
  return (
    <main className="page" aria-busy="true">
      <BackLink />
      <Skeleton className="h-[38px] w-64 max-w-full md:h-[52px]" />
      <Skeleton className="mt-3 h-4 w-20" />
      <ul aria-hidden="true" className="mt-6 border-t border-foreground md:mt-7">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className={ROW}>
            <Skeleton className="h-12 w-9" />
            <div>
              <Skeleton className="h-[18px] w-3/5 max-w-[260px]" />
              <Skeleton className="mt-2 h-3 w-2/5 max-w-[160px]" />
            </div>
            <Skeleton className="hidden h-4 w-32 md:block" />
            <Skeleton className="size-8 rounded-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const listKey = ["list", id];
  const [pendingRemove, setPendingRemove] = useState<{
    animeId: number;
    title: string;
  } | null>(null);

  const { data: list, isLoading, error, refetch } = useQuery({
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

  function confirmRemove() {
    if (!pendingRemove) return;
    removeAnime.mutate(pendingRemove.animeId);
    setPendingRemove(null);
  }

  if (sessionStatus === "loading" || (session && isLoading)) {
    return <PageSkeleton />;
  }

  if (!session) {
    return <SignInPrompt title="Collection" subject="this collection" />;
  }

  if (error && !(error instanceof HttpError && error.status === 404)) {
    return (
      <ErrorPanel
        title="Collection"
        message="This collection could not be loaded."
        onRetry={() => refetch()}
      />
    );
  }

  if (!list) {
    return (
      <main className="page">
        <BackLink />
        <PageHeading title="Collection not found" />
        <p className="mt-9 text-xl">
          It may have been deleted, or the link is wrong.
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <BackLink />
      <PageHeading
        title={list.name}
        description={list.count > 0 ? showCount(list.count) : undefined}
        rule
      />

      {removeAnime.isError && (
        <InlineMessage className="mt-4 flex flex-wrap items-baseline gap-x-4">
          <span>The show was not removed: {removeAnime.error.message}</span>
          <Button
            type="button"
            variant="link"
            className="min-h-10 text-base"
            onClick={() => {
              if (removeAnime.variables !== undefined) {
                removeAnime.mutate(removeAnime.variables);
              }
            }}
          >
            Try again
          </Button>
        </InlineMessage>
      )}

      {list.animes.length === 0 ? (
        <EmptyState
          className="mt-2"
          action={
            <Button variant="outline" asChild>
              <Link href="/search">Find a show</Link>
            </Button>
          }
        >
          This collection is empty. Shows are added from their own page.
        </EmptyState>
      ) : (
        <ul className="mt-2">
          {list.animes.map(({ id: rowId, animeId, anime }) => {
            const title = showTitle(anime, animeId);
            const href = `/anime/${animeId}`;
            const info = details(anime);
            return (
              <li key={rowId} className={ROW}>
                <Link
                  href={href}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="self-start"
                >
                  <Poster src={anime?.imageUrl} title={title} size="sm" />
                </Link>
                <div className="min-w-0">
                  <ShowTitle
                    title={title}
                    japanese={anime?.titleJapanese}
                    href={href}
                    className={TITLE}
                  />
                  {info && (
                    <p className="mt-1 text-[15px] text-muted-foreground md:hidden">
                      {info}
                    </p>
                  )}
                </div>
                <p className="hidden text-muted-foreground md:block">{info}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Remove ${title} from ${list.name}`}
                  onClick={() => setPendingRemove({ animeId, title })}
                >
                  <Trash2 aria-hidden="true" className="size-[17px]" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={!!pendingRemove}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from this collection?</DialogTitle>
            <DialogDescription>
              {pendingRemove
                ? `${pendingRemove.title} will be removed from ${list.name}. Your watch list is not affected.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
