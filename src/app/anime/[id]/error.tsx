"use client";

import { ErrorPanel } from "@/components/error-panel";

export default function AnimeError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorPanel
      title="Could not load this show"
      message="The anime data source may be down or busy."
      onRetry={unstable_retry}
    />
  );
}
