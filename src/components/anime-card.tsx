import Link from "next/link";
import { Poster } from "@/components/poster";
import { StatusMark, STATUS_LABEL, type WatchStatus } from "@/components/status-mark";
import type { JikanAnime } from "@/types/anime";

interface AnimeCardProps {
  anime: JikanAnime;
  isTracked?: boolean;
  trackedStatus?: string;
  reason?: string;
}

function isWatchStatus(value: string | undefined): value is WatchStatus {
  return !!value && Object.hasOwn(STATUS_LABEL, value);
}

export function AnimeCard({
  anime,
  isTracked,
  trackedStatus,
  reason,
}: AnimeCardProps) {
  const title = anime.title_english || anime.title;
  const genres = anime.genres?.slice(0, 2).map((genre) => genre.name) ?? [];

  return (
    <Link
      href={`/anime/${anime.mal_id}`}
      className="group block h-full hover:no-underline"
    >
      <Poster
        src={anime.images?.webp?.large_image_url}
        title={title}
        size="fluid"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
      />
      <h3 className="mt-2.5 line-clamp-2 text-[17px] leading-[1.25] decoration-1 underline-offset-3 group-hover:underline">
        {title}
      </h3>
      {(anime.score || genres.length > 0) && (
        <p className="mt-1 flex min-w-0 gap-2 text-[15px] text-muted-foreground">
          {anime.score ? (
            <span className="shrink-0 text-foreground">
              <span className="sr-only">Score </span>
              {anime.score.toFixed(2)}
            </span>
          ) : null}
          {genres.length > 0 && (
            <span className="truncate">{genres.join(", ")}</span>
          )}
        </p>
      )}
      {isTracked && isWatchStatus(trackedStatus) && (
        <StatusMark status={trackedStatus} className="mt-1 text-[15px]" />
      )}
      {reason && (
        <p className="mt-1.5 line-clamp-2 text-[15px] italic text-muted-foreground">
          {reason}
        </p>
      )}
    </Link>
  );
}
