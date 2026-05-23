"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SeasonCalendar } from "@/components/season-calendar";
import { SeasonGrid } from "@/components/season-grid";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import type { JikanAnime } from "@/types/anime";

const SEASONS = ["winter", "spring", "summer", "fall"];
const SEASON_LABELS: Record<string, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
};

function getCurrentSeason() {
  const month = new Date().getMonth();
  return SEASONS[Math.floor(month / 3)];
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function isCurrentOrFuture(year: number, s: string): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const seasonOrder = ["winter", "spring", "summer", "fall"];
  const currentSeasonIndex = Math.floor(currentMonth / 3);
  const targetSeasonIndex = seasonOrder.indexOf(s);

  if (year > currentYear) return true;
  if (year === currentYear && targetSeasonIndex >= currentSeasonIndex)
    return true;
  return false;
}

interface PaginationData {
  last_visible_page: number;
  has_next_page: boolean;
}

interface SeasonContentProps {
  allAnime: JikanAnime[];
  years: number[];
  activeYear: number | null;
  activeSeason: string | null;
  currentPage: number;
  pagination: PaginationData | null;
}

export function SeasonContent({
  allAnime,
  years,
  activeYear,
  activeSeason,
  currentPage,
  pagination,
}: SeasonContentProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);

  const defaultYear = activeYear ?? getCurrentYear();
  const defaultSeason = activeSeason ?? getCurrentSeason();

  function handleChange(year: string, season: string) {
    router.push(`/season?year=${year}&season=${season}`);
  }

  const showCalendar =
    !activeYear || isCurrentOrFuture(defaultYear, defaultSeason);

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

  const filteredAnime = useMemo(() => {
    let result = uniqueAnime;

    if (search.trim()) {
      const q = search.toLowerCase();
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

    return result;
  }, [uniqueAnime, search, selectedGenres]);

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

  const hasFilters = search || selectedGenres.length > 0 || showTrackedOnly;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center sm:text-left">
          Seasonal Anime
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 text-center sm:text-left">
          {showCalendar
            ? "Current season anime schedule. Tracked shows are highlighted."
            : `${SEASON_LABELS[defaultSeason]} ${defaultYear}`}
        </p>

        <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <select
            value={defaultYear}
            onChange={(e) => handleChange(e.target.value, defaultSeason)}
            className="px-2 sm:px-3 py-2 rounded-md bg-secondary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={defaultSeason}
            onChange={(e) =>
              handleChange(defaultYear.toString(), e.target.value)
            }
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
              placeholder="Search anime..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs sm:text-sm"
            />
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap gap-1 sm:gap-1.5 flex-1">
              {allGenres.map((genre) => (
                <Badge
                  key={genre}
                  variant={
                    selectedGenres.includes(genre) ? "default" : "outline"
                  }
                  className="cursor-pointer text-[10px] sm:text-xs"
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                </Badge>
              ))}
            </div>

            <button
              onClick={() => setShowTrackedOnly(!showTrackedOnly)}
              className={`shrink-0 px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                showTrackedOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              In Your List
            </button>
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {filteredAnime.length} of {uniqueAnime.length} shows
              </span>
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            </div>
          )}
        </div>

        {showCalendar ? (
          <SeasonCalendar
            allAnime={filteredAnime}
            showTrackedOnly={showTrackedOnly}
          />
        ) : (
          <>
            <SeasonGrid
              allAnime={filteredAnime}
              showTrackedOnly={showTrackedOnly}
            />
            {pagination && !hasFilters && (
              <div className="mt-6 sm:mt-8">
                <Pagination
                  currentPage={currentPage}
                  lastPage={pagination.last_visible_page}
                  baseUrl={`/season?year=${defaultYear}&season=${defaultSeason}`}
                  paramName="page"
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
