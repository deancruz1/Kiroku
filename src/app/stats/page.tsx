"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";
import { Section } from "@/components/section-heading";
import { LeaderList, LeaderRow } from "@/components/leader-row";
import { Poster } from "@/components/poster";
import { ShowTitle } from "@/components/show-title";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { ErrorPanel } from "@/components/error-panel";
import { STATUS_LABEL } from "@/components/status-mark";
import {
  GenreBars,
  RatingColumns,
  StatusBreakdown,
  STATS_STATUS_ORDER,
} from "@/components/stats-charts";
import type { Stats } from "@/lib/stats";

const STATEMENT = "text-[28px] leading-[1.3] md:type-statement";
const COLUMNS = "mt-12 grid gap-x-20 md:mt-14 lg:grid-cols-[7fr_5fr]";

function count(n: number, word: string) {
  return `${n.toLocaleString("en-GB")} ${n === 1 ? word : `${word}s`}`;
}

function watchTime(stats: Stats) {
  const { watchTimeDays: days, watchTimeRemainingHours: hours } = stats;
  if (days > 0 && hours > 0) return `${count(days, "day")} and ${count(hours, "hour")}`;
  if (days > 0) return count(days, "day");
  if (hours > 0) return count(hours, "hour");
  return count(stats.totalWatchTimeMinutes, "minute");
}

function Statement({ stats }: { stats: Stats }) {
  return (
    <p className={`${STATEMENT} mt-8 max-w-[980px] md:mt-9`}>
      You have logged <b className="font-semibold">{count(stats.totalEntries, "show")}</b>
      {stats.totalEpisodesWatched > 0 ? (
        <>
          {" "}and watched{" "}
          <b className="font-semibold">{count(stats.totalEpisodesWatched, "episode")}</b>, about{" "}
          <b className="font-semibold">{watchTime(stats)}</b>.
        </>
      ) : (
        " and have not watched any episodes yet."
      )}
    </p>
  );
}

function Footnotes({ stats }: { stats: Stats }) {
  const fallback = stats.watchTimeFallbackShows;
  const unstored = stats.unstoredShows;
  return (
    <div className="mt-3 space-y-1 text-[15px] text-muted-foreground">
      {stats.totalEpisodesWatched > 0 && (
        <p>
          {fallback > 0
            ? `Watch time uses each show's episode length, and counts ${stats.fallbackEpisodeMinutes} minutes an episode for ${count(fallback, "show")} without a known length.`
            : "Watch time uses each show's episode length."}
        </p>
      )}
      {unstored > 0 && (
        <p>
          Details for {count(unstored, "show")} have not loaded yet, so genres
          and the favourite leave {unstored === 1 ? "it" : "them"} out.
        </p>
      )}
    </div>
  );
}

function ShowEntry({
  show,
  children,
}: {
  show: { title: string; image: string; mal_id: number };
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-5">
      <Poster src={show.image} title={show.title} size="lg" />
      <div>
        <ShowTitle title={show.title} href={`/anime/${show.mal_id}`} size="lg" />
        {children}
      </div>
    </div>
  );
}

function Shows({ stats }: { stats: Stats }) {
  const fav = stats.favoriteShow;
  const most = stats.mostWatched && stats.mostWatched.episodes > 0 ? stats.mostWatched : null;
  const tied = fav ? (stats.ratingDistribution[fav.rating - 1]?.count ?? 1) - 1 : 0;
  const tieNote =
    tied > 0 ? (
      <p className="mt-2 text-base text-muted-foreground">
        {count(tied, "other show")} {tied === 1 ? "is" : "are"} also rated{" "}
        {fav!.rating}; this one has the most episodes watched.
      </p>
    ) : null;
  const progress = (m: NonNullable<Stats["mostWatched"]>) =>
    m.totalEpisodes > 0
      ? `${m.episodes.toLocaleString("en-GB")} of ${count(m.totalEpisodes, "episode")}.`
      : `${count(m.episodes, "episode")} so far.`;

  if (fav && most && fav.mal_id === most.mal_id) {
    return (
      <Section title="Favourite and most watched">
        <ShowEntry show={fav}>
          <p className="mt-3">
            Rated {fav.rating} out of 10. {progress(most)}
          </p>
          {tieNote}
        </ShowEntry>
      </Section>
    );
  }

  return (
    <>
      {fav && (
        <Section title="Favourite">
          <ShowEntry show={fav}>
            <p className="mt-3">
              Rated {fav.rating} out of 10, {count(fav.episodes, "episode")} watched.
            </p>
            {tieNote}
          </ShowEntry>
        </Section>
      )}
      {most && (
        <Section title="Most watched">
          <ShowEntry show={most}>
            <p className="mt-3">{progress(most)}</p>
          </ShowEntry>
        </Section>
      )}
    </>
  );
}

function StatsView({ stats }: { stats: Stats }) {
  const genreBase = stats.totalEntries - stats.unstoredShows;
  const unrated = stats.totalEntries - stats.ratedCount;

  return (
    <>
      <Statement stats={stats} />
      <Footnotes stats={stats} />

      <div className={COLUMNS}>
        <div>
          <Section title="Status">
            <StatusBreakdown counts={stats.statusCounts} total={stats.totalEntries} />
          </Section>

          <Section title="Genres">
            {stats.genres.length > 0 ? (
              <>
                <GenreBars genres={stats.genres} base={genreBase} />
                <p className="mt-3.5 text-base text-muted-foreground">
                  Percentages are of your {count(genreBase, "show")}
                  {stats.unstoredShows > 0 ? " with details loaded" : ""}. A show
                  can count towards more than one genre.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No genres are known for your shows yet.</p>
            )}
          </Section>
        </div>

        <div>
          <Section title="Ratings">
            {stats.ratedCount > 0 ? (
              <>
                <p className="mt-1 mb-8">
                  <span className="type-figure">{stats.averageRating.toFixed(1)}</span>
                  <span className="mt-2 block text-lg text-muted-foreground md:mt-0 md:ml-2.5 md:inline">
                    average from {count(stats.ratedCount, "rated show")}
                    {unrated > 0 ? `; ${unrated.toLocaleString("en-GB")} not rated` : ""}
                  </span>
                </p>
                <RatingColumns distribution={stats.ratingDistribution} />
              </>
            ) : (
              <p className="text-muted-foreground">You have not rated any shows yet.</p>
            )}
          </Section>

          <Section title="Episodes">
            <LeaderList>
              {STATS_STATUS_ORDER.map((s) => {
                const n = stats.episodesByStatus[s] ?? 0;
                return (
                  <LeaderRow
                    key={s}
                    muted={n === 0}
                    label={STATUS_LABEL[s]}
                    value={n.toLocaleString("en-GB")}
                  />
                );
              })}
            </LeaderList>
          </Section>

          <Shows stats={stats} />
        </div>
      </div>
    </>
  );
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="space-y-3.5">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-5" />
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div role="status" aria-label="Loading your stats">
      <div className="mt-8 max-w-[980px] space-y-3 md:mt-9">
        <Skeleton className="h-8 md:h-10" />
        <Skeleton className="h-8 w-2/3 md:h-10" />
      </div>
      <Skeleton className="mt-4 h-4 w-72 max-w-full" />
      <div className={COLUMNS}>
        <div>
          <Section title="Status">
            <Skeleton className="mb-5 h-4" />
            <SkeletonRows rows={4} />
          </Section>
          <Section title="Genres">
            <SkeletonRows rows={6} />
          </Section>
        </div>
        <div>
          <Section title="Ratings">
            <Skeleton className="mb-8 h-11 w-48" />
            <Skeleton className="h-[140px]" />
          </Section>
          <Section title="Episodes">
            <SkeletonRows rows={4} />
          </Section>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const { data: stats, isError, isFetching, refetch } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Stats>;
    },
    enabled: !!session && sessionStatus === "authenticated",
    retry: 1,
  });

  if (sessionStatus === "unauthenticated") {
    return <SignInPrompt title="Stats" subject="your stats" />;
  }

  if (!stats && isError && !isFetching) {
    return (
      <ErrorPanel
        title="Stats"
        message="Your stats could not be loaded."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <main className="page">
      <PageHeading title="Stats" />
      {!stats ? (
        <StatsSkeleton />
      ) : stats.totalEntries === 0 ? (
        <EmptyState
          className="mt-9"
          action={
            <Button asChild>
              <Link href="/season">Browse the current season</Link>
            </Button>
          }
        >
          You have not added any shows yet.
        </EmptyState>
      ) : (
        <StatsView stats={stats} />
      )}
    </main>
  );
}
