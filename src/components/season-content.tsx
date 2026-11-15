"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEntries } from "@/hooks/use-entries";
import { SeasonCalendar } from "@/components/season-calendar";
import { SeasonGrid } from "@/components/season-grid";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import type { SeasonAnime } from "@/lib/season";

const SEASONS = ["winter", "spring", "summer", "fall"];
const SEASON_LABELS: Record<string, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
};

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
  isCurrentSeason,
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
      [
        ...new Set(
          uniqueAnime.flatMap((a) => a.genres?.map((g) => g.name) || []),
        ),
      ].sort(),
    [uniqueAnime],
  );

  const trackedIds = useMemo(
    () => new Set((entries ?? []).map((e) => e.animeId)),
    [entries],
  );

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
      result = result.filter((a) => trackedIds.has(a.mal_id));
    }

    return result;
  }, [uniqueAnime, search, selectedGenres, trackedOnly, trackedIds]);

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

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center sm:text-left">
          Seasonal Anime
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 text-center sm:text-left">
          {showCalendar
            ? isCurrentSeason
              ? "Current season anime schedule. Tracked shows are highlighted."
              : `${SEASON_LABELS[season]} ${year} anime schedule. Tracked shows are highlighted.`
            : `${SEASON_LABELS[season]} ${year}`}
        </p>

        {!complete && (
          <p className="text-xs text-destructive mb-4 text-center sm:text-left">
            Some shows could not be loaded. Showing the {uniqueAnime.length}{" "}
            that did.
          </p>
        )}

        <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <select
            aria-label="Year"
            value={year}
            onChange={(e) => handleChange(e.target.value, season)}
            className="px-2 sm:px-3 py-2 rounded-md bg-secondary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            aria-label="Season"
            value={season}
            onChange={(e) => handleChange(year.toString(), e.target.value)}
            className="px-2 sm:px-3 py-2 rounded-md bg-secondary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {SEASON_LABELS[s]}
              </option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search anime"
              placeholder="Search anime..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs sm:text-sm"
            />
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div
              role="group"
              aria-label="Genres"
              className="flex flex-wrap gap-1 sm:gap-1.5 flex-1"
            >
              {allGenres.map((genre) => {
                const selected = selectedGenres.includes(genre);
                return (
                  <Badge
                    key={genre}
                    asChild
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer text-[10px] sm:text-xs"
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                    </button>
                  </Badge>
                );
              })}
            </div>

            {signedIn && (
              <button
                type="button"
                aria-pressed={showTrackedOnly}
                onClick={() => setShowTrackedOnly(!showTrackedOnly)}
                className={`shrink-0 px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                  showTrackedOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                In Your List
              </button>
            )}
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {filteredAnime.length} of {uniqueAnime.length} shows
                {showCalendar ? "" : " on this page"}
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            </div>
          )}
        </div>

        {uniqueAnime.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No shows found for {SEASON_LABELS[season]} {year}.
          </p>
        ) : filteredAnime.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No shows match your filters.
          </p>
        ) : showCalendar ? (
          <SeasonCalendar allAnime={filteredAnime} />
        ) : (
          <SeasonGrid allAnime={filteredAnime} />
        )}

        {!showCalendar && !hasFilters && lastPage > 1 && (
          <div className="mt-6 sm:mt-8">
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              baseUrl={`/season?year=${year}&season=${season}`}
              paramName="page"
            />
          </div>
        )}
      </div>
    </main>
  );
}
