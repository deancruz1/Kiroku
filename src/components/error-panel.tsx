"use client";

import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";

export function ErrorPanel({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main className="page">
      {title && <PageHeading title={title} />}
      <div role="alert" className={title ? "mt-9" : undefined}>
        <p className="text-xl">{message}</p>
        {onRetry && (
          <Button type="button" className="mt-5" onClick={() => onRetry()}>
            Try again
          </Button>
        )}
      </div>
    </main>
  );
}
