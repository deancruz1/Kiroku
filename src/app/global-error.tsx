"use client";

import { useLayoutEffect } from "react";
import "./globals.css";
import { fontVariables } from "@/components/fonts";
import { syncTheme } from "@/components/theme-toggle";
import { ErrorPanel } from "@/components/error-panel";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useLayoutEffect(() => syncTheme(), []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontVariables}>
        <title>Something went wrong | Kiroku</title>
        <ErrorPanel message="Could not load Kiroku." onRetry={unstable_retry} />
      </body>
    </html>
  );
}
