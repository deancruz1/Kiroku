import { searchAnime } from "@/lib/jikan";
import { getSearchQuery, parsePage, uniqueByMalId } from "@/lib/params";
import { AnimeRow, AnimeRowHeader, type AnimeRowShow } from "@/components/anime-row";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
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
  const anime: AnimeRowShow[] = results ? uniqueByMalId(results.data) : [];
  const total = results?.pagination?.items?.total;

  return (
    <main className="page">
      <PageHeading title="Search" />
      <div className="mt-6 max-w-3xl md:mt-8">
        <SearchBar key={query} defaultQuery={query} />
      </div>

      {!query && (
        <EmptyState className="mt-8">Enter a title to search for a show.</EmptyState>
      )}

      {results && anime.length === 0 && (
        <EmptyState className="mt-8">
          No shows found for &ldquo;{query}&rdquo;.
        </EmptyState>
      )}

      {results && anime.length > 0 && (
        <>
          {typeof total === "number" && (
            <p className="mt-8 text-muted-foreground">
              {total.toLocaleString("en-GB")} {total === 1 ? "result" : "results"}{" "}
              for &ldquo;{query}&rdquo;
            </p>
          )}
          <div className="mt-4">
            <AnimeRowHeader />
            <ul>
              {anime.map((show) => (
                <AnimeRow key={show.mal_id} anime={show} />
              ))}
            </ul>
          </div>

          <Pagination
            currentPage={currentPage}
            lastPage={results.pagination.last_visible_page}
            baseUrl={`/search?q=${encodeURIComponent(query)}`}
            paramName="page"
          />
        </>
      )}
    </main>
  );
}
