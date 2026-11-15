import { searchAnime } from "@/lib/jikan";
import { getSearchQuery, parsePage, uniqueByMalId } from "@/lib/params";
import { AnimeCard } from "@/components/anime-card";
import { SearchBar } from "@/components/search-bar";
import { Pagination } from "@/components/pagination";

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page } = await searchParams;
  const query = getSearchQuery(q);
  const currentPage = parsePage(page);

  // Failures are thrown to search/error.tsx, which offers a retry.
  const results = query ? await searchAnime(query, currentPage) : null;
  const anime = results ? uniqueByMalId(results.data) : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-xl mx-auto mb-6 sm:mb-8">
          <SearchBar key={query} defaultQuery={query} />
        </div>

        {!query && (
          <p className="text-center text-muted-foreground text-sm sm:text-base">
            Enter a search term to find anime.
          </p>
        )}

        {results && anime.length === 0 && (
          <p className="text-center text-muted-foreground text-sm sm:text-base">
            No results found for &ldquo;{query}&rdquo;
          </p>
        )}

        {results && anime.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {anime.map((show) => (
                <AnimeCard key={show.mal_id} anime={show} />
              ))}
            </div>

            <div className="mt-6 sm:mt-8">
              <Pagination
                currentPage={currentPage}
                lastPage={results.pagination.last_visible_page}
                baseUrl={`/search?q=${encodeURIComponent(query)}`}
                paramName="page"
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
