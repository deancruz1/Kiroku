"use client";

import { Button } from "@/components/ui/button";
import { BackButton } from "./back-button";

export default function AnimeError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
        <BackButton />
        <div role="alert" className="text-center space-y-4 py-16">
          <p className="text-sm sm:text-base">
            Could not load this anime. The anime data source may be down or
            busy.
          </p>
          <Button onClick={() => unstable_retry()}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
