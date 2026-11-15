"use client";

import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";

export default function SearchError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-xl mx-auto mb-6 sm:mb-8">
          <SearchBar />
        </div>
        <div role="alert" className="text-center space-y-4">
          <p className="text-sm sm:text-base">
            Could not load search results. The anime data source may be down
            or busy.
          </p>
          <Button onClick={() => unstable_retry()}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
