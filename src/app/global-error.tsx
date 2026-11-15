"use client";

import "./globals.css";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <title>Something went wrong | Kiroku</title>
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
          <div role="alert" className="text-center space-y-4">
            <p className="text-sm sm:text-base">Could not load Kiroku.</p>
            <Button onClick={() => unstable_retry()}>Try again</Button>
          </div>
        </main>
      </body>
    </html>
  );
}
