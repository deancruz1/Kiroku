"use client";

import { useEntries } from "@/hooks/use-entries";
import { AnimeCard } from "@/components/anime-card";
import type { JikanAnime } from "@/types/anime";

interface SeasonGridProps {
  allAnime: JikanAnime[];
  showTrackedOnly?: boolean;
}

export function SeasonGrid({ allAnime, showTrackedOnly }: SeasonGridProps) {
  const { data: entries } = useEntries();

  const trackedMap = new Map<number, { status: string }>();
  if (entries) {
    for (const entry of entries) {
      trackedMap.set(entry.animeId, { status: entry.status });
    }
  }

  const filteredAnime = showTrackedOnly
    ? allAnime.filter((a) => trackedMap.has(a.mal_id))
    : allAnime;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {filteredAnime.map((anime) => {
        const tracked = trackedMap.get(anime.mal_id);
        return (
          <AnimeCard
            key={anime.mal_id}
            anime={anime}
            isTracked={!!tracked}
            trackedStatus={tracked?.status}
          />
        );
      })}
    </div>
  );
}
