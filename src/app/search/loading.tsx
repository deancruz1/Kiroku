import { AnimeRowSkeleton } from "@/components/anime-row-skeleton";
import { PageHeading } from "@/components/page-heading";
import { Skeleton } from "@/components/skeleton";

export default function SearchLoading() {
  return (
    <main className="page" aria-busy="true">
      <p role="status" className="sr-only">
        Loading search results
      </p>
      <PageHeading title="Search" />
      <div className="mt-6 h-14 max-w-3xl border-b border-control md:mt-8" />
      <Skeleton className="mt-8 h-5 w-44" />
      <div className="mt-4">
        <AnimeRowSkeleton />
      </div>
    </main>
  );
}
