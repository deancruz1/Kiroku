"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Poster } from "@/components/poster";
import { ShowTitle } from "@/components/show-title";
import { InlineMessage } from "@/components/inline-message";
import { Skeleton } from "@/components/skeleton";
import { STATUS_LABEL, STATUS_ORDER } from "@/components/status-mark";
import type { Entry, EntryPatch } from "@/hooks/use-entries";
import { showTitle } from "@/lib/anime-shape";
import { cn } from "@/lib/utils";

const ROW =
  "grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-rule py-2.5 md:grid-cols-[36px_minmax(0,1fr)_200px_90px_84px] md:gap-x-5";

// Keeps the title link as wide as its text, with a 40px tall tap area.
export const TITLE = "w-fit max-w-full [&>a]:-my-2.5 [&>a]:py-2.5";

const fmt = (n: number) => n.toLocaleString("en-GB");

function Progress({
  watched,
  total,
  watching,
  bar,
}: {
  watched: number;
  total: number;
  watching: boolean;
  bar?: boolean;
}) {
  return (
    <span className="block">
      <span className="sr-only">
        {total > 0
          ? `${watched} of ${total} episodes watched`
          : `${watched} episodes watched`}
      </span>
      <span aria-hidden="true">
        {fmt(watched)}
        <span className="text-muted-foreground">
          {" "}
          / {total > 0 ? fmt(total) : "?"}
        </span>
      </span>
      {bar && total > 0 && (
        <span
          aria-hidden="true"
          className="mt-1.5 block h-0.5 w-[150px] bg-rule"
        >
          <span
            className={cn(
              "block h-full transition-[width] duration-300 motion-reduce:transition-none",
              watching ? "bg-vermilion" : "bg-foreground",
            )}
            style={{ width: `${Math.min(100, (100 * watched) / total)}%` }}
          />
        </span>
      )}
    </span>
  );
}

function Rating({ rating, large }: { rating: number | null; large?: boolean }) {
  if (!rating) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">–</span>
        <span className="sr-only">Not rated</span>
      </span>
    );
  }
  return (
    <span className={large ? "text-xl" : undefined}>
      <span className="sr-only">Rated {rating} out of 10</span>
      <span aria-hidden="true">
        {rating}
        <span className="text-sm text-muted-foreground"> /10</span>
      </span>
    </span>
  );
}

export function ListEntryRow({
  entry,
  onSave,
  onRemove,
  message,
}: {
  entry: Entry;
  onSave: (patch: EntryPatch) => void;
  onRemove: () => void;
  message?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(entry.status);
  const [episodes, setEpisodes] = useState(String(entry.episodes));
  const [rating, setRating] = useState(entry.rating ?? 0);
  const [episodeError, setEpisodeError] = useState<string | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const statusSelect = useRef<HTMLSelectElement>(null);
  const returnFocus = useRef(false);
  const id = useId();

  const anime = entry.anime;
  const title = showTitle(anime, entry.animeId);
  const total = anime?.episodes || 0;
  const href = `/anime/${entry.animeId}`;
  const watching = entry.status === "watching";
  const count = Number(episodes);

  useEffect(() => {
    if (editing) {
      statusSelect.current?.focus();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  function startEditing() {
    setStatus(entry.status);
    setEpisodes(String(entry.episodes));
    setRating(entry.rating ?? 0);
    setEpisodeError(null);
    setEditing(true);
  }

  function close() {
    returnFocus.current = true;
    setEditing(false);
  }

  function step(by: number) {
    const current = Number.isInteger(count) && count >= 0 ? count : 0;
    const next = Math.max(0, current + by);
    setEpisodes(String(total > 0 ? Math.min(total, next) : next));
    setEpisodeError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (episodes.trim() === "" || !Number.isInteger(count) || count < 0) {
      setEpisodeError("Enter a whole number of episodes.");
      return;
    }
    if (total > 0 && count > total) {
      setEpisodeError(`This show has ${total} episodes.`);
      return;
    }
    onSave({ status, episodes: count, rating: rating || null });
    close();
  }

  const poster = (
    <Link href={href} prefetch={false} tabIndex={-1} aria-hidden="true" className="self-start">
      <Poster src={anime?.imageUrl} title={title} size="sm" />
    </Link>
  );

  const name = (
    <ShowTitle
      title={title}
      japanese={anime?.titleJapanese}
      href={href}
      size="md"
      className={TITLE}
    />
  );

  if (editing) {
    return (
      <li className="-mx-4 grid grid-cols-[36px_minmax(0,1fr)] gap-x-3 gap-y-4 border-b border-rule bg-raised px-4 pt-4 pb-5 md:gap-x-5">
        {poster}
        <div className="self-center">{name}</div>
        <form
          noValidate
          onSubmit={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          aria-label={`Edit ${title}`}
          className="col-span-2 flex flex-wrap items-end gap-x-7 gap-y-5 md:col-span-1 md:col-start-2"
        >
          <div className="flex flex-col">
            <label
              htmlFor={`${id}-status`}
              className="mb-1.5 text-sm text-muted-foreground"
            >
              Status
            </label>
            <NativeSelect
              ref={statusSelect}
              id={`${id}-status`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 min-w-[150px]"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col">
            <label
              htmlFor={`${id}-episodes`}
              className="mb-1.5 text-sm text-muted-foreground"
            >
              Episodes watched
            </label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label={`One episode fewer of ${title}`}
                disabled={count <= 0}
                onClick={() => step(-1)}
              >
                <Minus aria-hidden="true" />
              </Button>
              <Input
                id={`${id}-episodes`}
                type="number"
                inputMode="numeric"
                min={0}
                max={total > 0 ? total : undefined}
                value={episodes}
                onChange={(e) => {
                  setEpisodes(e.target.value);
                  setEpisodeError(null);
                }}
                aria-invalid={episodeError ? true : undefined}
                aria-describedby={
                  episodeError ? `${id}-episodes-error` : `${id}-episodes-of`
                }
                className="h-10 w-16 text-center text-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label={`One episode more of ${title}`}
                disabled={total > 0 && count >= total}
                onClick={() => step(1)}
              >
                <Plus aria-hidden="true" />
              </Button>
              <span
                id={`${id}-episodes-of`}
                className="ml-1 text-muted-foreground"
              >
                of {total > 0 ? fmt(total) : "?"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span
              id={`${id}-rating`}
              className="mb-1.5 text-sm text-muted-foreground"
            >
              Rating
            </span>
            <div
              role="group"
              aria-labelledby={`${id}-rating`}
              className="grid grid-cols-5 gap-1 sm:grid-cols-10 md:gap-0.5 md:py-1"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} out of 10`}
                  aria-pressed={n === rating}
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className={cn(
                    "size-10 cursor-pointer rounded-sm border text-[15px] transition-colors md:h-8 md:w-[30px]",
                    n === rating
                      ? "border-foreground bg-foreground text-background"
                      : "border-control hover:bg-plate",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full gap-2 md:ml-auto md:w-auto">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 md:flex-none"
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-10 flex-1 md:flex-none">
              Save
            </Button>
          </div>

          {episodeError && (
            <InlineMessage id={`${id}-episodes-error`} className="w-full">
              {episodeError}
            </InlineMessage>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className={ROW}>
      {poster}
      <div className="min-w-0">
        {name}
        <div className="mt-1 flex gap-5 text-[15px] md:hidden">
          <Progress watched={entry.episodes} total={total} watching={watching} />
          <Rating rating={entry.rating} />
        </div>
      </div>
      <div className="hidden md:block">
        <Progress
          watched={entry.episodes}
          total={total}
          watching={watching}
          bar
        />
      </div>
      <div className="hidden md:block">
        <Rating rating={entry.rating} large />
      </div>
      <div className="flex justify-end">
        <Button
          ref={editButton}
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={`Edit ${title}`}
          onClick={startEditing}
        >
          <Pencil aria-hidden="true" className="size-[17px]" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={`Remove ${title} from your watch list`}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" className="size-[17px]" />
        </Button>
      </div>
      {message && <div className="col-span-full pt-1">{message}</div>}
    </li>
  );
}

export function ListRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={ROW}>
          <Skeleton className="h-12 w-9" />
          <div>
            <Skeleton className="h-[18px] w-3/5 max-w-[260px]" />
            <Skeleton className="mt-2 h-3 w-2/5 max-w-[160px]" />
          </div>
          <div className="hidden md:block">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-0.5 w-[150px]" />
          </div>
          <Skeleton className="hidden h-5 w-10 md:block" />
          <div className="flex justify-end">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
