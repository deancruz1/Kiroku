"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";
import { Poster } from "@/components/poster";
import { ShowTitle } from "@/components/show-title";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { ErrorPanel } from "@/components/error-panel";
import { MIN_SCORE, type Recommendation } from "@/lib/recommend";

interface RecommendationsResponse {
  recommendations: Recommendation[];
  basedOn: string[];
  message?: string;
}

const ROW =
  "grid grid-cols-[66px_minmax(0,1fr)_auto] gap-x-4 border-b border-rule py-3.5 md:gap-x-6";

function listWords(words: string[]) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function RecommendationRow({
  rec,
  basedOn,
}: {
  rec: Recommendation;
  basedOn: string[];
}) {
  const reason = basedOn.includes(rec.becauseOf)
    ? `From your interest in ${rec.becauseOf}`
    : `Shares a genre with ${rec.becauseOf}`;

  return (
    <li className={ROW}>
      <Poster
        src={rec.image}
        title={rec.title}
        size="sm"
        sizes="66px"
        className="h-[88px] w-[66px]"
      />
      <div className="min-w-0">
        <ShowTitle title={rec.title} href={`/anime/${rec.mal_id}`} />
        {rec.genres.length > 0 && (
          <p className="mt-1 text-[15px] text-muted-foreground">
            {rec.genres.join(", ")}
          </p>
        )}
        <p className="mt-1 text-[15px]">{reason}</p>
      </div>
      {rec.score !== null && (
        <p className="text-right text-lg leading-[1.25]">
          {rec.score.toFixed(2)}
          <span className="block text-[15px] text-muted-foreground">Score</span>
        </p>
      )}
    </li>
  );
}

function RecommendationsSkeleton() {
  return (
    <div role="status" aria-label="Loading recommendations">
      <Skeleton className="mt-2.5 h-5 w-[min(520px,100%)]" />
      <ul className="mt-6 border-t border-foreground md:mt-8">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className={ROW}>
            <Skeleton className="h-[88px] w-[66px]" />
            <div className="space-y-2 pt-0.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RecommendationsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ["user-recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/user/recommendations");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<RecommendationsResponse>;
    },
    enabled: !!session,
    retry: 1,
  });

  if (sessionStatus === "unauthenticated") {
    return <SignInPrompt title="For you" subject="recommendations" />;
  }

  if (!data && isError && !isFetching) {
    return (
      <ErrorPanel
        title="For you"
        message="Could not load your recommendations."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <main className="page">
        <PageHeading title="For you" />
        <RecommendationsSkeleton />
      </main>
    );
  }

  const { recommendations, basedOn } = data;

  if (recommendations.length === 0) {
    return (
      <main className="page">
        <PageHeading title="For you" />
        <EmptyState
          className="mt-6 md:mt-8"
          action={
            basedOn.length > 0 ? (
              <Button type="button" onClick={() => refetch()} disabled={isFetching}>
                Try again
              </Button>
            ) : (
              <Button asChild>
                <Link href="/top">Browse top shows</Link>
              </Button>
            )
          }
        >
          {data.message ?? "Not enough data for recommendations."}
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="page">
      <PageHeading
        title="For you"
        description={
          basedOn.length > 0
            ? `Shows scored ${MIN_SCORE} or higher from your top genres: ${listWords(basedOn)}. Shows already on your watch list are left out.`
            : undefined
        }
      />
      <ul className="mt-6 border-t border-foreground md:mt-8">
        {recommendations.map((rec) => (
          <RecommendationRow key={rec.mal_id} rec={rec} basedOn={basedOn} />
        ))}
      </ul>
    </main>
  );
}
