import Link from "next/link";
import { getTopAnime } from "@/lib/jikan";
import { parsePage, parseTopFilter, uniqueByMalId } from "@/lib/params";
import { AnimeCard } from "@/components/anime-card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import type { JikanTopResponse } from "@/types/anime";

const FILTERS = [
  { value: "bypopularity", label: "Most Popular" },
  { value: "airing", label: "Airing" },
  { value: "upcoming", label: "Upcoming" },
  { value: "favorite", label: "Most Favorited" },
];

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[]; page?: string | string[] }>;
}) {
  const { filter, page } = await searchParams;
  const activeFilter = parseTopFilter(filter);
  const currentPage = parsePage(page);

  // Failures are thrown to top/error.tsx, which offers a retry.
  const response: JikanTopResponse = await getTopAnime(
    currentPage,
    activeFilter,
  );
  // Jikan lists are scraped from MAL and can repeat an entry; cards are keyed by id.
  const anime = uniqueByMalId(response.data || []);
  const pagination = response.pagination;

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
            <Link
              key={f.value}
              href={`/top?filter=${f.value}`}
              aria-current={activeFilter === f.value ? "page" : undefined}
            >
              <Badge
                variant={activeFilter === f.value ? "default" : "secondary"}
                className="cursor-pointer text-xs sm:text-sm"
              >
                {f.label}
              </Badge>
            </Link>
          ))}
        </div>

        {anime.length === 0 && (
          <p className="text-muted-foreground text-sm sm:text-base">
            No anime on this page.
          </p>
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
