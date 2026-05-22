import { getCurrentSeason } from "@/lib/jikan";
import { SeasonCalendar } from "@/components/season-calendar";
import type { JikanAnime } from "@/types/anime";

export default async function SeasonPage() {
  let allAnime: JikanAnime[] = [];
  let error = null;

  try {
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

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Seasonal Anime</h1>
        <p className="text-muted-foreground mb-8">
          Current season anime schedule. Tracked shows are highlighted.
        </p>
        <SeasonCalendar allAnime={allAnime} />
      </div>
    </main>
  );
}
