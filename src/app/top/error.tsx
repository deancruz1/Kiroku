"use client";

import { ErrorPanel } from "@/components/error-panel";

export default function TopError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorPanel
      title="Top shows"
      message="Could not load the top shows. The anime data source may be down or busy."
      onRetry={unstable_retry}
    />
  );
}
