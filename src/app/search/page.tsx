import { searchAnime } from "@/lib/jikan";
import { AnimeCard } from "@/components/anime-card";
import { SearchBar } from "@/components/search-bar";
import { Pagination } from "@/components/pagination";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page } = await searchParams;
  const query = q || "";
  const currentPage = parseInt(page || "1", 10);

  let results = null;
  let error = null;

  if (query) {
    try {
      results = await searchAnime(query, currentPage);
    } catch {
      error = "Failed to fetch results. Please try again.";
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-xl mx-auto mb-6 sm:mb-8">
          <SearchBar />
        </div>

        {!query && (
          <p className="text-center text-muted-foreground text-sm sm:text-base">
            Enter a search term to find anime.
          </p>
        )}

        {error && (
          <p className="text-center text-destructive text-sm sm:text-base">
            {error}
          </p>
        )}

        {results && results.data.length === 0 && (
          <p className="text-center text-muted-foreground text-sm sm:text-base">
            No results found for &ldquo;{query}&rdquo;
          </p>
        )}

        {results && results.data.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {results.data
                .filter(
                  (anime, index, self) =>
                    self.findIndex((a) => a.mal_id === anime.mal_id) === index,
                )
                .map((anime) => (
                  <AnimeCard key={anime.mal_id} anime={anime} />
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
