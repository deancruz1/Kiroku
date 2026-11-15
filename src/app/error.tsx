"use client";

import { ErrorPanel } from "@/components/error-panel";

export default function RootError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorPanel message="Could not load this page." onRetry={unstable_retry} />
  );
}
