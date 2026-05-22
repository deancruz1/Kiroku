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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Top Anime</h1>
        <p className="text-muted-foreground mb-6">{activeLabel}</p>

        <div className="flex gap-2 mb-8 flex-wrap">
          {FILTERS.map((f) => (
            <Link key={f.value} href={`/top?filter=${f.value}`}>
              <Badge
                variant={activeFilter === f.value ? "default" : "secondary"}
                className="cursor-pointer"
              >
                {f.label}
              </Badge>
            </Link>
          ))}
        </div>

        {error && <p className="text-destructive">{error}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {anime.map((show) => (
            <AnimeCard key={show.mal_id} anime={show} />
          ))}
        </div>

        {pagination && (
          <Pagination
            currentPage={currentPage}
            lastPage={pagination.last_visible_page}
            baseUrl={`/top?filter=${activeFilter}`}
            paramName="page"
          />
        )}
      </div>
    </main>
  );
}
