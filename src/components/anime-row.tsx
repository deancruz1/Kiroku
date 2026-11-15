import { Poster } from "@/components/poster";
import { ShowTitle } from "@/components/show-title";
import { cn } from "@/lib/utils";
import type { JikanAnime } from "@/types/anime";

export type AnimeRowShow = JikanAnime & { type?: string | null };

const GRID = {
  ranked:
    "grid-cols-[4ch_36px_minmax(0,1fr)_auto] md:grid-cols-[5ch_36px_minmax(0,1fr)_5rem_6rem_6rem]",
  plain:
    "grid-cols-[36px_minmax(0,1fr)_auto] md:grid-cols-[36px_minmax(0,1fr)_5rem_6rem_6rem]",
} as const;

function Unknown() {
  return <span className="text-muted-foreground">Unknown</span>;
}

function episodeCount(episodes: number | null) {
  if (!episodes) return null;
  return `${episodes} ${episodes === 1 ? "episode" : "episodes"}`;
}

export function AnimeRowHeader({ ranked = false }: { ranked?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "hidden items-end gap-x-6 border-b border-foreground pb-2 text-[15px] text-muted-foreground md:grid",
        ranked ? GRID.ranked : GRID.plain,
      )}
    >
      {ranked && <span />}
      <span />
      <span>Title</span>
      <span className="text-right">Score</span>
      <span>Type</span>
      <span className="text-right">Episodes</span>
    </div>
  );
}

export function AnimeRow({
  anime,
  rank,
}: {
  anime: AnimeRowShow;
  rank?: number;
}) {
  const title = anime.title_english || anime.title;
  const meta = [anime.type, episodeCount(anime.episodes)].filter(Boolean);

  return (
    <li
      className={cn(
        "relative grid items-center gap-x-4 border-b border-rule py-2.5 md:gap-x-6",
        rank !== undefined ? GRID.ranked : GRID.plain,
      )}
    >
      {rank !== undefined && (
        <span className="text-right text-lg">
          <span className="sr-only">Rank </span>
          {rank}
        </span>
      )}
      <Poster src={anime.images?.webp?.large_image_url} title={title} />
      <div className="min-w-0">
        <ShowTitle
          title={title}
          japanese={anime.title_japanese}
          href={`/anime/${anime.mal_id}`}
          className="[&_a]:after:absolute [&_a]:after:inset-0"
        />
        {meta.length > 0 && (
          <p className="mt-0.5 text-[15px] text-muted-foreground md:hidden">
            {meta.join(", ")}
          </p>
        )}
      </div>
      <span className="text-right text-lg">
        {anime.score ? (
          <>
            <span className="sr-only">Score </span>
            {anime.score.toFixed(2)}
          </>
        ) : (
          <>
            <span className="sr-only">Score </span>
            <span className="text-[15px] text-muted-foreground md:text-lg">
              Unknown
            </span>
          </>
        )}
      </span>
      <span className="hidden text-muted-foreground md:block">
        <span className="sr-only">Type </span>
        {anime.type || "Unknown"}
      </span>
      <span className="hidden text-right md:block">
        {anime.episodes ? (
          <>
            {anime.episodes}
            <span className="sr-only"> episodes</span>
          </>
        ) : (
          <>
            <span className="sr-only">Episodes </span>
            <Unknown />
          </>
        )}
      </span>
    </li>
  );
}
