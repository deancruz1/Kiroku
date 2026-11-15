"use client";

import { PageHeading } from "@/components/page-heading";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";

// Laid out like ErrorPanel, with the search field kept because the navbar
// hides its own search on this page.
export default function SearchError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="page">
      <PageHeading title="Search" />
      <div className="mt-6 max-w-3xl md:mt-8">
        <SearchBar />
      </div>
      <div role="alert" className="mt-9">
        <p className="text-xl">
          Could not load the search results. The anime data source may be down
          or busy.
        </p>
        <Button type="button" size="lg" className="mt-5"onClick={() => unstable_retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
