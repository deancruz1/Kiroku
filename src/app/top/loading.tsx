import { AnimeRowSkeleton } from "@/components/anime-row-skeleton";
import { PageHeading } from "@/components/page-heading";
import { RankingTabs } from "./ranking-tabs";

export default function TopLoading() {
  return (
    <main className="page" aria-busy="true">
      <p role="status" className="sr-only">
        Loading top shows
      </p>
      <PageHeading title="Top shows" />
      <RankingTabs />
      <div className="mt-6 md:mt-8">
        <AnimeRowSkeleton ranked />
      </div>
    </main>
  );
}
