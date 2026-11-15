"use client";

import { ErrorPanel } from "@/components/error-panel";
import { SearchBar } from "@/components/search-bar";

// The search field stays because the navbar hides its own search on this page.
export default function SearchError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorPanel
      title="Search"
      message="Could not load the search results. The show data service may be down or busy."
      onRetry={unstable_retry}
    >
      <div className="mt-6 max-w-3xl md:mt-8">
        <SearchBar />
      </div>
    </ErrorPanel>
  );
}
