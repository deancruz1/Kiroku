"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEntries } from "@/hooks/use-entries";
import type { JikanAnime } from "@/types/anime";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function getDayKey(anime: JikanAnime): string | null {
  const day = anime.broadcast?.day;
  if (!day) return null;
  const lower = day.toLowerCase();
  // Handle both "Friday" and "Fridays" formats from Jikan
  for (const d of DAYS) {
    if (lower.startsWith(d)) return d;
  }
  return null;
}
function getCountdown(anime: JikanAnime): string | null {
  const day = anime.broadcast?.day;
  const time = anime.broadcast?.time;
  if (!day || !time) return null;

  const daysMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const dayIndex = daysMap[day.toLowerCase()];
  if (dayIndex === undefined) return null;

  const now = new Date();
  const currentDay = now.getDay();
  const [hours, minutes] = time.split(":").map(Number);

  let daysUntil = dayIndex - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && now.getHours() >= hours)) {
    daysUntil += 7;
  }

  const nextEpisode = new Date(now);
  nextEpisode.setDate(now.getDate() + daysUntil);
  nextEpisode.setHours(hours, minutes, 0, 0);

  const diffMs = nextEpisode.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  if (diffDays === 0) return `${diffHours}h`;
  return `${diffDays}d ${diffHours}h`;
}

function AnimeCard({
  anime,
  isTracked,
  status,
}: {
  anime: JikanAnime;
  isTracked: boolean;
  status?: string;
}) {
  const countdown = getCountdown(anime);

  return (
    <Link href={`/anime/${anime.mal_id}`}>
      <Card
        className={`overflow-hidden hover:ring-2 transition-all h-full ${
          isTracked ? "ring-2 ring-primary" : "hover:ring-primary"
        }`}
      >
        <div className="relative w-full aspect-3/4">
          <Image
            src={anime.images.webp.large_image_url}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 50vw, 150px"
            className="object-cover"
          />
          {isTracked && status && (
            <div className="absolute top-1 left-1">
              <Badge className="text-[10px] px-1 py-0 h-4">
                {status === "watching"
                  ? "Watching"
                  : status === "completed"
                    ? "Done"
                    : status === "plan_to_watch"
                      ? "PTW"
                      : "Dropped"}
              </Badge>
            </div>
          )}
          {countdown && (
            <div className="absolute bottom-1 right-1">
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {countdown}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-2">
          <p className="text-xs font-medium line-clamp-2">
            {anime.title_english || anime.title}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SeasonCalendar({ allAnime }: { allAnime: JikanAnime[] }) {
  const { data: entries } = useEntries();

  const trackedMap = new Map<number, { status: string }>();
  if (entries) {
    for (const entry of entries) {
      trackedMap.set(entry.animeId, { status: entry.status });
    }
  }

  const byDay: Record<string, JikanAnime[]> = {};
  const unknown: JikanAnime[] = [];

  for (const anime of allAnime) {
    const day = getDayKey(anime);
    if (day) {
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(anime);
    } else {
      unknown.push(anime);
    }
  }

  console.log(
    "Days with data:",
    Object.keys(byDay).map((d) => `${d}: ${byDay[d].length}`),
  );
  console.log("Unknown count:", unknown.length);
  console.log(
    "Unknown shows:",
    unknown.map((a) => ({
      title: a.title_english || a.title,
      broadcast: a.broadcast,
      status: a.status,
    })),
  );
  console.log(
    "Sample broadcast:",
    allAnime.slice(0, 5).map((a) => ({
      title: a.title_english || a.title,
      broadcast: a.broadcast,
    })),
  );

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {DAYS.map((day) => (
          <div key={day}>
            <h2 className="font-semibold text-sm mb-3 text-center">
              {DAY_LABELS[day]}
            </h2>
            <div className="space-y-3">
              {(byDay[day] || []).map((anime) => {
                const tracked = trackedMap.get(anime.mal_id);
                return (
                  <AnimeCard
                    key={anime.mal_id}
                    anime={anime}
                    isTracked={!!tracked}
                    status={tracked?.status}
                  />
                );
              })}
              {(!byDay[day] || byDay[day].length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nothing scheduled
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {unknown.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-sm mb-3">
            Unknown Schedule ({unknown.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
            {unknown.map((anime) => {
              const tracked = trackedMap.get(anime.mal_id);
              return (
                <AnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  isTracked={!!tracked}
                  status={tracked?.status}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
