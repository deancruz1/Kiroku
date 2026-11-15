import { getTopAnime } from "@/lib/jikan";
import { parsePage, parseTopFilter, uniqueByMalId } from "@/lib/params";
import { AnimeRow, AnimeRowHeader, type AnimeRowShow } from "@/components/anime-row";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { RankingTabs } from "./ranking-tabs";
import type { JikanTopResponse } from "@/types/anime";

const PAGE_SIZE = 20;

type TopResponse = JikanTopResponse & {
  data: AnimeRowShow[];
  pagination?: { items?: { per_page?: number } };
};

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[]; page?: string | string[] }>;
}) {
  const { filter, page } = await searchParams;
  const activeFilter = parseTopFilter(filter);
  const currentPage = parsePage(page);

  // Failures are thrown to top/error.tsx, which offers a retry.
  const response: TopResponse = await getTopAnime(currentPage, activeFilter);
  const rows = response.data || [];
  // Jikan lists are scraped from MAL and can repeat an entry; rows are keyed by id.
  const anime = uniqueByMalId(rows);
  const pagination = response.pagination;
  const perPage = pagination?.items?.per_page || PAGE_SIZE;
  const firstRank = (currentPage - 1) * perPage + 1;

  return (
    <main className="page">
      <PageHeading title="Top shows" />
      <RankingTabs active={activeFilter} />

      {anime.length === 0 ? (
        <EmptyState className="mt-6">No shows on this page.</EmptyState>
      ) : (
        <div className="mt-6 md:mt-8">
          <AnimeRowHeader ranked />
          <ol>
            {anime.map((show) => (
              <AnimeRow
                key={show.mal_id}
                anime={show}
                rank={firstRank + rows.indexOf(show)}
              />
            ))}
          </ol>
        </div>
      )}

      {pagination && (
        <Pagination
          currentPage={currentPage}
          lastPage={pagination.last_visible_page}
          baseUrl={`/top?filter=${activeFilter}`}
          paramName="page"
        />
      )}
    </main>
  );
}
