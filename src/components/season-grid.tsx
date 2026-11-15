import {
  SeasonAnimeCard,
  type TrackedEntry,
} from "@/components/season-anime-card";
import { SPREAD_CLASS } from "@/components/season-skeleton";
import type { SeasonAnime } from "@/lib/season";

interface SeasonGridProps {
  allAnime: SeasonAnime[];
  entries: Map<number, TrackedEntry>;
}

function describe(anime: SeasonAnime) {
  const episodes = anime.episodes
    ? `${anime.episodes} ${anime.episodes === 1 ? "episode" : "episodes"}`
    : null;
  return [anime.type, episodes].filter(Boolean).join(", ") || null;
}

export function SeasonGrid({ allAnime, entries }: SeasonGridProps) {
  return (
    <ol className={`border-t border-foreground ${SPREAD_CLASS}`}>
      {allAnime.map((anime) => (
        <SeasonAnimeCard
          key={anime.mal_id}
          anime={anime}
          entry={entries.get(anime.mal_id)}
          note={describe(anime)}
          className="break-inside-avoid"
        />
      ))}
    </ol>
  );
}
