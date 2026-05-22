import { getCurrentSeason, getSeasonList, getSeasonAnime } from "@/lib/jikan";
import { SeasonContent } from "@/components/season-content";
import type { JikanAnime } from "@/types/anime";

interface SeasonPageProps {
  searchParams: Promise<{ year?: string; season?: string; page?: string }>;
}

export default async function SeasonPage({ searchParams }: SeasonPageProps) {
  const { year, season, page } = await searchParams;
  const activeYear = year ? parseInt(year, 10) : null;
  const activeSeason = season || null;
  const currentPage = parseInt(page || "1", 10);

  let allAnime: JikanAnime[] = [];
  let availableSeasons: { year: number; seasons: string[] }[] = [];
  let pagination = null;
  let error = null;

  try {
    const seasonListData = await getSeasonList();
    availableSeasons = seasonListData.data || [];

    if (activeYear && activeSeason) {
      const response = await getSeasonAnime(
        activeYear,
        activeSeason,
        currentPage,
      );
      allAnime = response.data || [];
      pagination = response.pagination;
    } else {
      const page1 = await getCurrentSeason(1);
      allAnime = [...page1.data];

      if (page1.pagination.has_next_page) {
        const page2 = await getCurrentSeason(2);
        allAnime = [...allAnime, ...page2.data];
      }

      allAnime = allAnime.filter(
        (anime, index, self) =>
          self.findIndex((a) => a.mal_id === anime.mal_id) === index,
      );
    }
  } catch {
    error = "Failed to load seasonal anime. Please try again.";
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  const years = [...new Set(availableSeasons.map((s) => s.year))].sort(
    (a, b) => b - a,
  );

  return (
    <SeasonContent
      allAnime={allAnime}
      years={years}
      activeYear={activeYear}
      activeSeason={activeSeason}
      currentPage={currentPage}
      pagination={pagination}
    />
  );
}
