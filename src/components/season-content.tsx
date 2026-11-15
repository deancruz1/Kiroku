"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEntries } from "@/hooks/use-entries";
import { SeasonCalendar, getViewerTimeZone } from "@/components/season-calendar";
import { SeasonGrid } from "@/components/season-grid";
import type { TrackedEntry } from "@/components/season-anime-card";
import { Pagination } from "@/components/pagination";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { InlineMessage } from "@/components/inline-message";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import type { SeasonAnime } from "@/lib/season";
import { visibleGenres } from "@/lib/anime-shape";

const SEASONS = ["winter", "spring", "summer", "fall"];
const SEASON_LABELS: Record<string, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
};

function subscribeNever() {
  return () => {};
}

function getServerTimeZone() {
  return null;
}

function countLabel(n: number) {
  return `${n} ${n === 1 ? "show" : "shows"}`;
}

interface SeasonContentProps {
  allAnime: SeasonAnime[];
  years: number[];
  year: number;
  season: string;
  isCurrentSeason: boolean;
  mode: "calendar" | "grid";
  currentPage: number;
  lastPage: number;
  complete: boolean;
}

export function SeasonContent({
  allAnime,
  years,
  year,
  season,
  mode,
  currentPage,
  lastPage,
  complete,
}: SeasonContentProps) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { data: entries } = useEntries();
  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);
  const timeZone = useSyncExternalStore(
    subscribeNever,
    getViewerTimeZone,
    getServerTimeZone,
  );

  const signedIn = sessionStatus === "authenticated";
  const trackedOnly = signedIn && showTrackedOnly;

  function handleChange(year: string, season: string) {
    router.push(`/season?year=${year}&season=${season}`);
  }

  const showCalendar = mode === "calendar";

  const uniqueAnime = useMemo(
    () =>
      allAnime.filter(
        (anime, index, self) =>
          self.findIndex((a) => a.mal_id === anime.mal_id) === index,
      ),
    [allAnime],
  );

  const allGenres = useMemo(
    () =>
      visibleGenres([
        ...new Set(
          uniqueAnime.flatMap((a) => a.genres?.map((g) => g.name) || []),
        ),
      ]).sort(),
    [uniqueAnime],
  );

  const trackedMap = useMemo(() => {
    const map = new Map<number, TrackedEntry>();
    for (const e of entries ?? []) {
      map.set(e.animeId, { status: e.status, episodes: e.episodes });
    }
    return map;
  }, [entries]);

  const filteredAnime = useMemo(() => {
    let result = uniqueAnime;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.title_english?.toLowerCase().includes(q) ||
          a.title_japanese?.toLowerCase().includes(q),
      );
    }

    if (selectedGenres.length > 0) {
      result = result.filter((a) =>
        selectedGenres.every((g) =>
          a.genres?.some((genre) => genre.name === g),
        ),
      );
    }

    if (trackedOnly) {
      result = result.filter((a) => trackedMap.has(a.mal_id));
    }

    return result;
  }, [uniqueAnime, search, selectedGenres, trackedOnly, trackedMap]);

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  }

  function clearFilters() {
    setSearch("");
    setSelectedGenres([]);
    setShowTrackedOnly(false);
  }

  const hasFilters =
    search.trim() !== "" || selectedGenres.length > 0 || trackedOnly;

  const description = showCalendar
    ? `${countLabel(uniqueAnime.length)}. Times are in your time zone${
        timeZone ? `, ${timeZone.replace(/_/g, " ")}` : ""
      }.`
    : lastPage > 1
      ? `Page ${currentPage} of ${lastPage}.`
      : `${countLabel(uniqueAnime.length)}.`;

  return (
    <main className="page">
      <PageHeading
        rule
        title={`${SEASON_LABELS[season]} ${year}`}
        description={description}
      >
        <NativeSelect
          aria-label="Season"
          value={season}
          onChange={(e) => handleChange(year.toString(), e.target.value)}
          className="h-10"
        >
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {SEASON_LABELS[s]}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Year"
          value={year}
          onChange={(e) => handleChange(e.target.value, season)}
          className="h-10"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </NativeSelect>

        <Input
          type="search"
          aria-label="Filter this season"
          placeholder="Filter this season"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 md:w-[200px]"
        />

        {signedIn && (
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-base">
            <input
              type="checkbox"
              checked={showTrackedOnly}
              onChange={(e) => setShowTrackedOnly(e.target.checked)}
              className="size-4 cursor-pointer accent-vermilion"
            />
            On my watch list
          </label>
        )}
      </PageHeading>

      {!complete && (
        <InlineMessage className="mt-3">
          Some shows could not be loaded. Showing the {uniqueAnime.length} that
          did.
        </InlineMessage>
      )}

      {allGenres.length > 0 && (
        <div
          role="group"
          aria-label="Genres"
          className="scrollbar-none -mx-[var(--gutter)] mt-2 flex gap-x-[18px] overflow-x-auto px-[var(--gutter)] py-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {allGenres.map((genre) => (
            <button
              key={genre}
              type="button"
              aria-pressed={selectedGenres.includes(genre)}
              onClick={() => toggleGenre(genre)}
              className="inline-flex min-h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap text-[15px] text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none aria-pressed:text-vermilion aria-pressed:underline aria-pressed:decoration-1 aria-pressed:underline-offset-[5px] md:min-h-8"
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {hasFilters && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4">
          <span className="text-muted-foreground" aria-live="polite">
            {filteredAnime.length} of {countLabel(uniqueAnime.length)}
            {showCalendar ? "" : " on this page"}
          </span>
          <Button
            type="button"
            variant="link"
            onClick={clearFilters}
            className="min-h-10"
          >
            Clear filters
          </Button>
        </div>
      )}

      <div className="mt-6 md:mt-9">
        {uniqueAnime.length === 0 ? (
          <EmptyState>
            No shows found for {SEASON_LABELS[season]} {year}.
          </EmptyState>
        ) : filteredAnime.length === 0 ? (
          <EmptyState>No shows match your filters.</EmptyState>
        ) : showCalendar ? (
          <SeasonCalendar allAnime={filteredAnime} entries={trackedMap} />
        ) : (
          <SeasonGrid allAnime={filteredAnime} entries={trackedMap} />
        )}
      </div>

      {!showCalendar && !hasFilters && lastPage > 1 && (
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          baseUrl={`/season?year=${year}&season=${season}`}
          paramName="page"
        />
      )}
    </main>
  );
}
