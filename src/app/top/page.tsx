import Link from "next/link";
import { getTopAnime } from "@/lib/jikan";
import { AnimeCard } from "@/components/anime-card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import type { JikanAnime } from "@/types/anime";

const FILTERS = [
  { value: "bypopularity", label: "Most Popular" },
  { value: "airing", label: "Airing" },
  { value: "upcoming", label: "Upcoming" },
  { value: "favorite", label: "Most Favorited" },
];

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { filter, page } = await searchParams;
  const activeFilter = filter || "bypopularity";
  const currentPage = parseInt(page || "1", 10);

  let anime: JikanAnime[] = [];
  let pagination = null;
  let error = null;

  try {
    const response = await getTopAnime(
      currentPage,
      activeFilter as "airing" | "upcoming" | "bypopularity" | "favorite",
    );
    anime = response.data || [];
    pagination = response.pagination;
  } catch {
    error = "Failed to load top anime.";
    anime = [];
  }

  const activeLabel = FILTERS.find((f) => f.value === activeFilter)?.label;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center sm:text-left">
          Top Anime
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 text-center sm:text-left">
          {activeLabel}
        </p>

        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 flex-wrap justify-center sm:justify-start">
          {FILTERS.map((f) => (
            <Link key={f.value} href={`/top?filter=${f.value}`}>
              <Badge
                variant={activeFilter === f.value ? "default" : "secondary"}
                className="cursor-pointer text-xs sm:text-sm"
              >
                {f.label}
              </Badge>
            </Link>
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm sm:text-base">{error}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {anime.map((show) => (
            <AnimeCard key={show.mal_id} anime={show} />
          ))}
        </div>

        {pagination && (
          <div className="mt-6 sm:mt-8">
            <Pagination
              currentPage={currentPage}
              lastPage={pagination.last_visible_page}
              baseUrl={`/top?filter=${activeFilter}`}
              paramName="page"
            />
          </div>
        )}
      </div>
    </main>
  );
}
