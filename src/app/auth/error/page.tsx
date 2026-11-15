"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";
import { Skeleton } from "@/components/skeleton";

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  OAuthAccountNotLinked: {
    title: "Discord is linked elsewhere",
    message:
      "This Discord account is already linked to a different Kiroku account, so it cannot be used for this one.",
  },
  AccessDenied: {
    title: "Sign-in refused",
    message: "You do not have permission to sign in.",
  },
  Configuration: {
    title: "Sign-in failed",
    message:
      "Kiroku could not finish signing you in because of a problem on the server.",
  },
  default: {
    title: "Sign-in failed",
    message: "Something went wrong while signing you in.",
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "default";
  const { title, message } = ERROR_MESSAGES[error] || ERROR_MESSAGES.default;

  return (
    <>
      <PageHeading title={title} />
      <p className="mt-6 text-xl">{message}</p>
      <Button variant="link" asChild className="mt-4 h-10">
        <Link href="/auth/signin">Back to sign in</Link>
      </Button>
    </>
  );
}

export default function AuthErrorPage() {
  return (
    <main className="page">
      <div className="max-w-xl md:pt-6">
        <Suspense
          fallback={
            <div role="status" aria-label="Loading">
              <Skeleton className="h-10 w-64 md:h-12" />
              <Skeleton className="mt-6 h-6 w-full" />
            </div>
          }
        >
          <ErrorContent />
        </Suspense>
      </div>
    </main>
  );
}
