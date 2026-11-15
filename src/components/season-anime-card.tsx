import { Poster } from "@/components/poster";
import { ShowTitle } from "@/components/show-title";
import {
  STATUS_LABEL,
  StatusMark,
  type WatchStatus,
} from "@/components/status-mark";
import { cn } from "@/lib/utils";
import type { SeasonAnime } from "@/lib/season";

export interface TrackedEntry {
  status: string;
  episodes: number;
}

interface SeasonAnimeCardProps {
  anime: SeasonAnime;
  entry?: TrackedEntry;
  // undefined leaves out the time column; null keeps it empty.
  time?: string | null;
  note?: React.ReactNode;
  className?: string;
}

function isWatchStatus(status: string): status is WatchStatus {
  return status in STATUS_LABEL;
}

function EntryMark({
  entry,
  total,
}: {
  entry: TrackedEntry;
  total: number | null;
}) {
  if (!isWatchStatus(entry.status)) return null;
  let label = STATUS_LABEL[entry.status];
  if (entry.status === "watching") {
    label += total
      ? `, ${entry.episodes}/${total}`
      : `, ${entry.episodes} ${entry.episodes === 1 ? "episode" : "episodes"}`;
  }
  return (
    <StatusMark status={entry.status} label={false}>
      {label}
    </StatusMark>
  );
}

export function SeasonAnimeCard({
  anime,
  entry,
  time,
  note,
  className,
}: SeasonAnimeCardProps) {
  const withTime = time !== undefined;
  const title = anime.title_english || anime.title;

  return (
    <li
      className={cn(
        "relative grid items-center gap-x-2.5 border-b border-rule py-2.5 sm:gap-x-3.5",
        withTime
          ? "grid-cols-[44px_minmax(0,1fr)_auto] sm:grid-cols-[52px_30px_minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[30px_minmax(0,1fr)_auto]",
        className,
      )}
    >
      {withTime &&
        (time ? (
          <time className="self-start pt-0.5 text-base">
            <span className="sr-only">Airs at </span>
            {time}
          </time>
        ) : (
          <span />
        ))}
      <Poster
        src={anime.images.webp.image_url || anime.images.jpg.image_url}
        title={title}
        size="xs"
        className="hidden sm:block"
      />
      <ShowTitle
        title={title}
        japanese={anime.title_japanese}
        href={`/anime/${anime.mal_id}`}
        size="sm"
        className="[&_a]:after:absolute [&_a]:after:inset-0"
      />
      <div className="flex flex-col items-end gap-0.5 self-start pt-0.5 text-right text-sm sm:text-[15px]">
        {entry && <EntryMark entry={entry} total={anime.episodes} />}
        {note && <span className="italic text-muted-foreground">{note}</span>}
      </div>
    </li>
  );
}
