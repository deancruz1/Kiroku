"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";

export function ErrorPanel({
  title,
  message,
  onRetry,
  children,
}: {
  title?: string;
  message: string;
  // A returned promise keeps the button pending until it settles.
  onRetry?: () => unknown;
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <main className="page">
      {title && <PageHeading title={title} />}
      {children}
      <div role="alert" className={title || children ? "mt-6 md:mt-8" : undefined}>
        <p className="max-w-[65ch] text-xl">{message}</p>
        {onRetry && (
          <Button
            type="button"
            className="mt-5"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await onRetry();
              })
            }
          >
            {pending ? "Trying again..." : "Try again"}
          </Button>
        )}
      </div>
    </main>
  );
}
