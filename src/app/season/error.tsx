"use client";

import { ErrorPanel } from "@/components/error-panel";

export default function SeasonError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorPanel
      title="Season"
      message="Could not load the season. The show data service may be down or busy."
      onRetry={unstable_retry}
    />
  );
}
