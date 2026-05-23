"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Tv, Clock, Trophy, Heart, Hash, TrendingUp } from "lucide-react";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface TopGenre {
  name: string;
  count: number;
}

interface FavoriteShow {
  title: string;
  image: string;
  rating: number;
  episodes: number;
  mal_id: number;
  genre?: string;
}

interface MostWatched {
  title: string;
  image: string;
  episodes: number;
  totalEpisodes: number;
  mal_id: number;
  genre?: string;
}

interface Stats {
  totalEntries: number;
  totalEpisodesWatched: number;
  totalWatchTimeHours: number;
  watchTimeDays: number;
  watchTimeRemainingHours: number;
  averageRating: number;
  completionRate: number;
  topGenres: TopGenre[];
  topGenre: TopGenre | null;
  favoriteShow: FavoriteShow | null;
  mostWatched: MostWatched | null;
  statusCounts: Record<string, number>;
  heroImage: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  watching: "#3b82f6",
  completed: "#22c55e",
  plan_to_watch: "#a855f7",
  dropped: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  dropped: "Dropped",
};

const tooltipStyle = {
  backgroundColor: "#1e1e2e",
  border: "1px solid #2e2e3e",
  borderRadius: "8px",
  color: "#e0e0e0",
  fontSize: "13px",
  padding: "8px 12px",
};

const cardPalette = {
  topGenre: "from-blue-500/10 to-blue-500/20 border-blue-500/20",
  yourTaste: "from-purple-500/10 to-purple-500/20 border-purple-500/20",
  statusBreakdown: "from-green-500/10 to-green-500/20 border-green-500/20",
};

function getCompletionColor(rate: number): string {
  if (rate >= 80)
    return "from-emerald-500/10 to-emerald-500/20 border-emerald-500/20";
  if (rate >= 50) return "from-cyan-500/10 to-cyan-500/20 border-cyan-500/20";
  if (rate >= 30)
    return "from-yellow-500/10 to-yellow-500/20 border-yellow-500/20";
  return "from-gray-500/10 to-gray-500/20 border-gray-500/20";
}

function getRatingColor(rating: number): string {
  if (rating >= 8.5)
    return "from-violet-500/10 to-violet-500/20 border-violet-500/20";
  if (rating >= 7) return "from-blue-500/10 to-blue-500/20 border-blue-500/20";
  if (rating >= 5)
    return "from-orange-500/10 to-orange-500/20 border-orange-500/20";
  return "from-red-500/10 to-red-500/20 border-red-500/20";
}

function getWatchTimeFlavor(days: number): string {
  if (days >= 30)
    return "You could have learned a language. Instead you watched anime. Respect.";
  if (days >= 14) return "That is a whole vacation. Well spent.";
  if (days >= 7) return "A full week of your life. No regrets.";
  if (days >= 3) return "A long weekend binge. We have all been there.";
  if (days >= 1) return "A solid weekend marathon.";
  return "Just getting started. The rabbit hole awaits.";
}

function getCompletionFlavor(rate: number): string {
  if (rate >= 90)
    return "You do not start what you cannot finish. Commendable.";
  if (rate >= 70) return "You see things through. Mostly.";
  if (rate >= 50)
    return "You give shows a fair shot. Sometimes they do not deserve it.";
  if (rate > 0)
    return "You are not afraid to walk away. Life is too short for bad anime.";
  return "Finish something. Anything. We believe in you.";
}

function getRatingFlavor(rating: number): string {
  if (rating >= 9)
    return "Either you only watch masterpieces or you are very generous.";
  if (rating >= 8) return "You know what you like and you stick to it.";
  if (rating >= 7) return "Balanced. Critical. Fair.";
  if (rating >= 5) return "Hard to impress. We respect the standards.";
  if (rating > 0) return "Brutally honest. Anime has to earn your score.";
  return "Rate something. Let the world know how you feel.";
}

function getGenreFlavor(genre: string): string {
  const flavors: Record<string, string> = {
    Action: "You are here for the hype and the fight scenes.",
    Adventure: "You love a good journey. The destination is optional.",
    Comedy: "You just want to laugh. We get it.",
    Drama: "You are here for the emotional damage.",
    Fantasy: "Reality is overrated. You live in other worlds.",
    Horror: "You enjoy being scared. Respect the dark side.",
    "Slice of Life": "You find meaning in the mundane. That is deep.",
    Romance: "You are a hopeless romantic. Or just love the drama.",
    "Sci-Fi": "The future is now. You are already living in 3026.",
    Sports: "You love the grind. The training arc is your arc.",
    Shounen:
      "Friendship. Effort. Victory. You know the formula and you love it.",
    Seinen:
      "Mature stories for mature tastes. You are sophisticated like that.",
    Isekai:
      "You have been hit by a truck and reincarnated as a stats page viewer.",
    Mecha: "Giant robots. Need we say more.",
    Mystery: "You love a good puzzle. The twist is your favorite part.",
    Supernatural: "Ghosts, demons, powers. The weirder the better.",
  };
  return flavors[genre] || `You have a thing for ${genre}. Own it.`;
}

export default function StatsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Stats>;
    },
    enabled: !!session && sessionStatus === "authenticated",
  });

  if (sessionStatus === "loading" || isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm sm:text-base">
          Crunching your numbers...
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to see your stats. We promise it is worth it.
          </p>
          <Link href="/auth/signin">
            <Button>Sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!stats || stats.totalEntries === 0) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Tv className="h-12 sm:h-16 w-12 sm:w-16 text-muted-foreground mx-auto" />
          <p className="text-base sm:text-lg text-muted-foreground">
            Your stats page is empty. Like a fresh notebook. Or an unwatched
            Crunchyroll queue.
          </p>
          <Link href="/search">
            <Button>Go fix that</Button>
          </Link>
        </div>
      </main>
    );
  }

  const statusData = Object.entries(stats.statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status],
      value: count,
      color: STATUS_COLORS[status],
    }));

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center sm:text-left">
          By the Numbers
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8 text-center sm:text-left">
          The numbers do not lie. But we will make them fun anyway.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Hero */}
          <Card className="col-span-1 md:col-span-4 relative overflow-hidden">
            {stats.heroImage && (
              <Image
                src={stats.heroImage}
                alt=""
                fill
                className="object-cover blur-sm scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            <CardContent className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 sm:h-5 w-4 sm:w-5 text-amber-400" />
                <p className="text-xs sm:text-sm font-medium text-white/80">
                  Total Anime
                </p>
              </div>
              <p className="text-3xl sm:text-5xl font-bold mb-2 text-white">
                {stats.totalEntries} shows
              </p>
              <p className="text-sm sm:text-lg text-white/70 mb-1">
                {stats.totalEpisodesWatched} episodes
                {" • "}
                {stats.watchTimeDays > 0 && `${stats.watchTimeDays}d `}
                {stats.watchTimeRemainingHours > 0 &&
                  `${stats.watchTimeRemainingHours}h`}
                {" of watch time"}
              </p>
              <p className="text-xs sm:text-sm text-white/60 italic">
                {getWatchTimeFlavor(stats.watchTimeDays)}
              </p>
            </CardContent>
          </Card>

          {/* Favorite Show */}
          <Card className="col-span-1 md:col-span-2 relative overflow-hidden min-h-40">
            {stats.favoriteShow?.image && (
              <Image
                src={stats.favoriteShow.image}
                alt=""
                fill
                className="object-cover blur-sm scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            <CardContent className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 sm:h-5 w-4 sm:w-5 text-rose-400" />
                <p className="text-xs sm:text-sm font-medium text-white/80">
                  Favorite Show
                </p>
              </div>
              {stats.favoriteShow ? (
                <Link
                  href={`/anime/${stats.favoriteShow.mal_id}`}
                  className="block"
                >
                  <p className="font-semibold text-sm sm:text-base line-clamp-2 hover:underline text-white">
                    {stats.favoriteShow.title}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-medium text-white/90">
                      {stats.favoriteShow.rating}/10
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    You sat through {stats.favoriteShow.episodes} episodes and
                    still loved it.
                  </p>
                </Link>
              ) : (
                <p className="text-white/70 text-xs sm:text-sm">
                  Rate some shows. Find your goat.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top Genre */}
          <Card className={`bg-gradient-to-br ${cardPalette.topGenre}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Tv className="h-4 sm:h-5 w-4 sm:w-5 text-blue-400" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Top Genre
                </p>
              </div>
              {stats.topGenre ? (
                <>
                  <p className="text-xl sm:text-2xl font-bold mb-1">
                    {stats.topGenre.name}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    {stats.topGenre.count} show
                    {stats.topGenre.count !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    {getGenreFlavor(stats.topGenre.name)}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Watch more to find out.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Your Taste */}
          <Card className={`bg-gradient-to-br ${cardPalette.yourTaste}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 sm:h-5 w-4 sm:w-5 text-purple-400" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Your Taste
                </p>
              </div>
              {stats.topGenre ? (
                <>
                  <p className="text-base sm:text-lg font-bold mb-2">
                    {stats.topGenre.name}-heavy
                  </p>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {stats.topGenres.map((genre) => (
                      <Badge
                        key={genre.name}
                        variant="secondary"
                        className="text-[10px] sm:text-xs"
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Watch more to discover your taste.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Most Watched */}
          <Card className="col-span-1 md:col-span-2 relative overflow-hidden min-h-40">
            {stats.mostWatched?.image && (
              <Image
                src={stats.mostWatched.image}
                alt=""
                fill
                className="object-cover blur-sm scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            <CardContent className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 sm:h-5 w-4 sm:w-5 text-orange-400" />
                <p className="text-xs sm:text-sm font-medium text-white/80">
                  Most Watched
                </p>
              </div>
              {stats.mostWatched ? (
                <Link
                  href={`/anime/${stats.mostWatched.mal_id}`}
                  className="block"
                >
                  <p className="font-semibold text-sm sm:text-base line-clamp-2 hover:underline text-white">
                    {stats.mostWatched.title}
                  </p>
                  <p className="text-xs sm:text-sm text-white/70 mt-1">
                    {stats.mostWatched.episodes} /{" "}
                    {stats.mostWatched.totalEpisodes || "?"} episodes
                  </p>
                  <p className="text-xs text-white/60 mt-0.5 italic">
                    {stats.mostWatched.episodes > 100
                      ? "That is commitment. We respect the grind."
                      : stats.mostWatched.episodes > 50
                        ? "A serious time investment. Worth every minute?"
                        : "Short and sweet. Or maybe you just started."}
                  </p>
                </Link>
              ) : (
                <p className="text-white/70 text-xs sm:text-sm">
                  Watch more to see your most watched.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card
            className={`col-span-1 md:col-span-2 md:row-span-2 bg-gradient-to-br ${cardPalette.statusBreakdown}`}
          >
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Tv className="h-4 sm:h-5 w-4 sm:w-5 text-green-400" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Status Breakdown
                </p>
              </div>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: unknown, name: unknown) => [
                        `${Number(value ?? 0)} shows`,
                        String(name ?? ""),
                      ]}
                      itemStyle={{ color: "#e0e0e0" }}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span style={{ color: "#e0e0e0", fontSize: "11px" }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-xs sm:text-sm">
                  No data yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Completion Rate */}
          <Card
            className={`bg-gradient-to-br ${getCompletionColor(stats.completionRate)}`}
          >
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Completion Rate
                </p>
              </div>
              <p className="text-3xl sm:text-4xl font-bold mb-1">
                {stats.completionRate}%
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground italic">
                {getCompletionFlavor(stats.completionRate)}
              </p>
            </CardContent>
          </Card>

          {/* Average Rating */}
          <Card
            className={`bg-gradient-to-br ${getRatingColor(stats.averageRating)}`}
          >
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-4 sm:h-5 w-4 sm:w-5" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Average Rating
                </p>
              </div>
              <p className="text-3xl sm:text-4xl font-bold mb-1">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground italic">
                {getRatingFlavor(stats.averageRating)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
