"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEntries } from "@/hooks/use-entries";
import { SeasonAnimeCard } from "@/components/season-anime-card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  formatCountdown,
  getLocalSchedule,
  isFinishedAiring,
} from "@/lib/broadcast";
import type { SeasonAnime } from "@/lib/season";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
type DayKey = (typeof DAYS)[number];
const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};
const DAY_BY_INDEX: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const INITIAL_SHOW = 3;
const EXPAND_BY = 3;
const MINUTE = 60 * 1000;

// One shared clock for the whole calendar. The server snapshot is null because the
// server knows neither the viewer's time zone nor their clock.
let clockSnapshot: number | null = null;

function subscribeToClock(onTick: () => void) {
  if (clockSnapshot === null || Date.now() - clockSnapshot >= MINUTE) {
    clockSnapshot = Date.now();
  }
  let interval: ReturnType<typeof setInterval> | undefined;
  const tick = () => {
    clockSnapshot = Date.now();
    onTick();
  };
  const timeout = setTimeout(() => {
    tick();
    interval = setInterval(tick, MINUTE);
  }, MINUTE - (Date.now() % MINUTE));
  return () => {
    clearTimeout(timeout);
    clearInterval(interval);
  };
}

function getClockSnapshot() {
  if (clockSnapshot === null) clockSnapshot = Date.now();
  return clockSnapshot;
}

function getServerClockSnapshot() {
  return null;
}

function getViewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

interface ScheduledAnime {
  anime: SeasonAnime;
  time: string;
  minutes: number;
  countdown: string | null;
}

interface SeasonCalendarProps {
  allAnime: SeasonAnime[];
}

export function SeasonCalendar({ allAnime }: SeasonCalendarProps) {
  const { data: entries } = useEntries();
  const [expandedDays, setExpandedDays] = useState<
    Partial<Record<DayKey, number>>
  >({});
  const now = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot,
  );
  const timeZone = now === null ? null : getViewerTimeZone();

  const trackedMap = new Map<number, { status: string }>();
  if (entries) {
    for (const entry of entries) {
      trackedMap.set(entry.animeId, { status: entry.status });
    }
  }

  const schedule = useMemo(() => {
    if (now === null || timeZone === null) return null;
    const date = new Date(now);
    const byDay = Object.fromEntries(
      DAYS.map((d) => [d, [] as ScheduledAnime[]]),
    ) as Record<DayKey, ScheduledAnime[]>;
    const unknown: SeasonAnime[] = [];
    const finished: SeasonAnime[] = [];

    for (const anime of allAnime) {
      if (isFinishedAiring(anime, date)) {
        finished.push(anime);
        continue;
      }
      const local = getLocalSchedule(anime, date, timeZone);
      if (!local) {
        unknown.push(anime);
        continue;
      }
      byDay[DAY_BY_INDEX[local.day]].push({
        anime,
        time: local.time,
        minutes: local.minutes,
        countdown: local.next
          ? formatCountdown(local.next.getTime() - now)
          : null,
      });
    }

    for (const day of DAYS) {
      byDay[day].sort(
        (a, b) =>
          a.minutes - b.minutes ||
          (a.anime.title_english || a.anime.title).localeCompare(
            b.anime.title_english || b.anime.title,
          ),
      );
    }

    return { byDay, unknown, finished };
  }, [allAnime, now, timeZone]);

  if (!schedule) {
    return (
      <p
        role="status"
        className="text-sm text-muted-foreground text-center py-12"
      >
        Loading schedule...
      </p>
    );
  }

  const { byDay, unknown, finished } = schedule;

  function getVisibleCount(day: DayKey, total: number) {
    return Math.min(expandedDays[day] ?? INITIAL_SHOW, total);
  }

  function handleExpand(day: DayKey, total: number) {
    setExpandedDays((prev) => {
      const current = Math.min(prev[day] ?? INITIAL_SHOW, total);
      return { ...prev, [day]: Math.min(current + EXPAND_BY, total) };
    });
  }

  function renderCard(item: ScheduledAnime) {
    const tracked = trackedMap.get(item.anime.mal_id);
    return (
      <SeasonAnimeCard
        anime={item.anime}
        isTracked={!!tracked}
        trackedStatus={tracked?.status}
        broadcastTime={item.time}
        countdown={item.countdown}
      />
    );
  }

  function renderUnscheduled(title: string, list: SeasonAnime[]) {
    if (list.length === 0) return null;
    return (
      <div className="mt-8">
        <h2 className="font-semibold text-sm mb-3">
          {title} ({list.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3 sm:gap-4">
          {list.map((anime) => {
            const tracked = trackedMap.get(anime.mal_id);
            return (
              <SeasonAnimeCard
                key={anime.mal_id}
                anime={anime}
                isTracked={!!tracked}
                trackedStatus={tracked?.status}
                broadcastTime={null}
                countdown={null}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">
        Times are in your time zone ({timeZone}).
      </p>

      {/* Desktop: 7-column grid */}
      <div className="hidden lg:grid grid-cols-7 gap-5">
        {DAYS.map((day) => {
          const dayAnime = byDay[day];
          const visibleCount = getVisibleCount(day, dayAnime.length);

          return (
            <div key={day}>
              <h2 className="font-semibold text-sm mb-3 text-center">
                {DAY_LABELS[day]}
              </h2>
              <div className="space-y-4">
                {dayAnime.slice(0, INITIAL_SHOW).map((item, index) => (
                  <motion.div
                    key={item.anime.mal_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {renderCard(item)}
                  </motion.div>
                ))}

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
                          .map((item, index) => (
                            <motion.div
                              key={item.anime.mal_id}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.3,
                                delay: index * 0.05,
                              }}
                            >
                              {renderCard(item)}
                            </motion.div>
                          ))}
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
                  <div>
                    {visibleCount < dayAnime.length && (
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

      {/* Mobile/Tablet: Horizontal scroll rows per day */}
      <div className="lg:hidden space-y-6">
        {DAYS.map((day) => {
          const dayAnime = byDay[day];
          if (dayAnime.length === 0) return null;

          return (
            <div key={day}>
              <h2 className="font-semibold text-sm mb-2">
                {DAY_LABELS[day]} ({dayAnime.length})
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {dayAnime.map((item) => (
                  <div
                    key={item.anime.mal_id}
                    className="w-36 shrink-0 snap-start"
                  >
                    {renderCard(item)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {renderUnscheduled("Unknown Schedule", unknown)}
      {renderUnscheduled("Finished Airing", finished)}
    </div>
  );
}
