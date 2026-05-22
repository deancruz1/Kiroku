import { searchAnime } from "@/lib/jikan";
import { AnimeCard } from "@/components/anime-card";
import { SearchBar } from "@/components/search-bar";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q || "";

  let results = null;
  let error = null;

  if (query) {
    try {
      results = await searchAnime(query);
    } catch {
      error = "Failed to fetch results. Please try again.";
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto mb-8">
          <SearchBar />
        </div>

        {!query && (
          <p className="text-center text-muted-foreground">
            Enter a search term to find anime.
          </p>
        )}

        {error && <p className="text-center text-destructive">{error}</p>}

        {results && results.data.length === 0 && (
          <p className="text-center text-muted-foreground">
            No results found for &ldquo;{query}&rdquo;
          </p>
        )}

        {results && results.data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.data
              .filter(
                (anime, index, self) =>
                  self.findIndex((a) => a.mal_id === anime.mal_id) === index,
              )
              .map((anime) => (
                <AnimeCard key={anime.mal_id} anime={anime} />
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
