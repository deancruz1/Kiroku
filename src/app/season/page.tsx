import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SeasonContent } from "@/components/season-content";
import {
  FIRST_SEASON_YEAR,
  compareSeasons,
  getArchiveSeasonPage,
  getCalendarSeason,
  getSeasonAt,
  getSeasonYears,
  parseSeasonQuery,
  type SeasonAnime,
} from "@/lib/season";

// A cold calendar load fetches every page of the season one after another.
// 60 seconds fits Vercel Hobby with or without Fluid compute, and season.ts
// stops loading early enough to return a partial season inside it.
export const maxDuration = 60;

interface SeasonPageProps {
  searchParams: Promise<{
    year?: string | string[];
    season?: string | string[];
    page?: string | string[];
  }>;
}

export async function generateMetadata({
  searchParams,
}: SeasonPageProps): Promise<Metadata> {
  const query = parseSeasonQuery(await searchParams);
  const { year, season } =
    query.kind === "season" ? query : getSeasonAt(new Date());
  return { title: `${season[0].toUpperCase()}${season.slice(1)} ${year}` };
}

export default async function SeasonPage({ searchParams }: SeasonPageProps) {
  const query = parseSeasonQuery(await searchParams);
  if (query.kind === "redirect") redirect(query.to);

  const current = getSeasonAt(new Date());

  let years: number[] = [];
  try {
    years = await getSeasonYears();
  } catch {
    years = [];
  }

  const maxYear = Math.max(current.year + 1, years[0] ?? 0);
  if (query.kind === "season") {
    const known =
      years.length > 0
        ? years.includes(query.year)
        : query.year >= FIRST_SEASON_YEAR && query.year <= maxYear;
    if (!known) redirect("/season");
  }

  const selected =
    query.kind === "season"
      ? { year: query.year, season: query.season }
      : current;
  const isCurrent = compareSeasons(selected, current) === 0;
  const mode = compareSeasons(selected, current) >= 0 ? "calendar" : "grid";
  const currentPage = query.kind === "season" ? query.page : 1;

  let allAnime: SeasonAnime[] = [];
  let lastPage = 1;
  let complete = true;

  // A total failure is thrown to season/error.tsx, which offers a retry. A
  // partial calendar load comes back with complete set to false.
  if (mode === "calendar") {
    ({ anime: allAnime, complete } = await getCalendarSeason(
      selected.year,
      selected.season,
      isCurrent,
    ));
  } else {
    ({ anime: allAnime, lastPage } = await getArchiveSeasonPage(
      selected.year,
      selected.season,
      currentPage,
    ));
  }

  if (mode === "grid" && currentPage > lastPage) {
    redirect(
      `/season?year=${selected.year}&season=${selected.season}&page=${lastPage}`,
    );
  }

  const yearOptions =
    years.length > 0
      ? [...years]
      : Array.from(
          { length: maxYear - FIRST_SEASON_YEAR + 1 },
          (_, i) => maxYear - i,
        );
  if (!yearOptions.includes(selected.year)) {
    yearOptions.push(selected.year);
    yearOptions.sort((a, b) => b - a);
  }

  return (
    <SeasonContent
      allAnime={allAnime}
      years={yearOptions}
      year={selected.year}
      season={selected.season}
      isCurrentSeason={isCurrent}
      mode={mode}
      currentPage={currentPage}
      lastPage={lastPage}
      complete={complete}
    />
  );
}
