"use client";

import { Button } from "@/components/ui/button";

export default function RootError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div role="alert" className="text-center space-y-4">
        <p className="text-sm sm:text-base">Could not load this page.</p>
        <Button onClick={() => unstable_retry()}>Try again</Button>
      </div>
    </main>
  );
}
