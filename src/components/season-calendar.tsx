"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEntries } from "@/hooks/use-entries";
import { SeasonAnimeCard } from "@/components/season-anime-card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
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

const INITIAL_SHOW = 3;
const EXPAND_BY = 3;

function getDayKey(anime: JikanAnime): string | null {
  const day = anime.broadcast?.day;
  if (!day) return null;
  const lower = day.toLowerCase();
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

interface SeasonCalendarProps {
  allAnime: JikanAnime[];
  showTrackedOnly?: boolean;
}

export function SeasonCalendar({
  allAnime,
  showTrackedOnly,
}: SeasonCalendarProps) {
  const { data: entries } = useEntries();
  const [expandedDays, setExpandedDays] = useState<Record<string, number>>({});

  const trackedMap = new Map<number, { status: string }>();
  if (entries) {
    for (const entry of entries) {
      trackedMap.set(entry.animeId, { status: entry.status });
    }
  }

  const filteredAnime = showTrackedOnly
    ? allAnime.filter((a) => trackedMap.has(a.mal_id))
    : allAnime;

  const byDay: Record<string, JikanAnime[]> = {};
  const unknown: JikanAnime[] = [];

  for (const anime of filteredAnime) {
    const day = getDayKey(anime);
    if (day) {
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(anime);
    } else {
      unknown.push(anime);
    }
  }

  for (const day of DAYS) {
    if (byDay[day]) {
      byDay[day].sort((a, b) => {
        const timeA = a.broadcast?.time || "99:99";
        const timeB = b.broadcast?.time || "99:99";
        return timeA.localeCompare(timeB);
      });
    }
  }

  function getVisibleCount(day: string, total: number) {
    return expandedDays[day] || Math.min(INITIAL_SHOW, total);
  }

  function canExpand(day: string, total: number) {
    return (expandedDays[day] || INITIAL_SHOW) < total;
  }

  function handleExpand(day: string, total: number) {
    setExpandedDays((prev) => {
      const current = prev[day] || INITIAL_SHOW;
      return { ...prev, [day]: Math.min(current + EXPAND_BY, total) };
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
        {DAYS.map((day) => {
          const dayAnime = byDay[day] || [];
          const visibleCount = getVisibleCount(day, dayAnime.length);

          return (
            <div key={day}>
              <h2 className="font-semibold text-sm mb-3 text-center">
                {DAY_LABELS[day]}
              </h2>
              <div className="space-y-4">
                {dayAnime.slice(0, INITIAL_SHOW).map((anime, index) => {
                  const tracked = trackedMap.get(anime.mal_id);
                  return (
                    <motion.div
                      key={anime.mal_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <SeasonAnimeCard
                        anime={anime}
                        isTracked={!!tracked}
                        trackedStatus={tracked?.status}
                        countdown={getCountdown(anime)}
                      />
                    </motion.div>
                  );
                })}

                <AnimatePresence initial={false}>
                  {visibleCount > INITIAL_SHOW && (
                    <motion.div
                      key={`${day}-expanded`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pt-4 px-0.5">
                        {dayAnime
                          .slice(INITIAL_SHOW, visibleCount)
                          .map((anime, index) => {
                            const tracked = trackedMap.get(anime.mal_id);
                            return (
                              <motion.div
                                key={anime.mal_id}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.3,
                                  delay: index * 0.05,
                                }}
                              >
                                <SeasonAnimeCard
                                  anime={anime}
                                  isTracked={!!tracked}
                                  trackedStatus={tracked?.status}
                                  countdown={getCountdown(anime)}
                                />
                              </motion.div>
                            );
                          })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {dayAnime.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nothing scheduled
                  </p>
                )}

                {dayAnime.length > INITIAL_SHOW && (
                  <div className="hidden lg:block">
                    {canExpand(day, dayAnime.length) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => handleExpand(day, dayAnime.length)}
                      >
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show more ({dayAnime.length - visibleCount} left)
                      </Button>
                    )}
                    {visibleCount > INITIAL_SHOW && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() =>
                          setExpandedDays((prev) => ({
                            ...prev,
                            [day]: INITIAL_SHOW,
                          }))
                        }
                      >
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Show less
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
                <SeasonAnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  isTracked={!!tracked}
                  trackedStatus={tracked?.status}
                  countdown={getCountdown(anime)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
