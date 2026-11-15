"use client";

import { useMemo, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/empty-state";
import {
  SeasonAnimeCard,
  type TrackedEntry,
} from "@/components/season-anime-card";
import {
  DAY_SECTION_CLASS,
  SEASON_DAYS,
  SPREAD_CLASS,
  SeasonCalendarSkeleton,
  SeasonDayHeading,
  SeasonDayJump,
  type DayKey,
} from "@/components/season-skeleton";
import {
  formatCountdown,
  getLocalSchedule,
  isFinishedAiring,
} from "@/lib/broadcast";
import type { SeasonAnime } from "@/lib/season";

const DAY_BY_INDEX: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

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

export function getViewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getToday(now: number, timeZone: string): DayKey | null {
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone,
    })
      .format(now)
      .toLowerCase();
    return SEASON_DAYS.find((d) => d.key === name)?.key ?? null;
  } catch {
    return null;
  }
}

function countLabel(n: number) {
  return `${n} ${n === 1 ? "show" : "shows"}`;
}

interface ScheduledAnime {
  anime: SeasonAnime;
  time: string;
  minutes: number;
  countdown: string | null;
}

interface SeasonCalendarProps {
  allAnime: SeasonAnime[];
  entries: Map<number, TrackedEntry>;
}

export function SeasonCalendar({ allAnime, entries }: SeasonCalendarProps) {
  const now = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot,
  );
  const timeZone = now === null ? null : getViewerTimeZone();

  const schedule = useMemo(() => {
    if (now === null || timeZone === null) return null;
    const date = new Date(now);
    const byDay = Object.fromEntries(
      SEASON_DAYS.map((d) => [d.key, [] as ScheduledAnime[]]),
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

    for (const day of SEASON_DAYS) {
      byDay[day.key].sort(
        (a, b) =>
          a.minutes - b.minutes ||
          (a.anime.title_english || a.anime.title).localeCompare(
            b.anime.title_english || b.anime.title,
          ),
      );
    }

    return { byDay, unknown, finished, today: getToday(now, timeZone) };
  }, [allAnime, now, timeZone]);

  if (!schedule) return <SeasonCalendarSkeleton />;

  const { byDay, unknown, finished, today } = schedule;

  function renderUnscheduled(id: string, title: string, list: SeasonAnime[]) {
    if (list.length === 0) return null;
    return (
      <section id={id} className="mb-10 scroll-mt-14">
        <SeasonDayHeading label={title} aside={countLabel(list.length)} />
        <ol>
          {list.map((anime) => (
            <SeasonAnimeCard
              key={anime.mal_id}
              anime={anime}
              entry={entries.get(anime.mal_id)}
            />
          ))}
        </ol>
      </section>
    );
  }

  return (
    <div>
      <SeasonDayJump today={today} />
      <div className={SPREAD_CLASS}>
        {SEASON_DAYS.map((day) => {
          const list = byDay[day.key];
          return (
            <section
              key={day.key}
              id={`season-${day.key}`}
              className={DAY_SECTION_CLASS}
            >
              <SeasonDayHeading
                kanji={day.kanji}
                label={day.label}
                today={today === day.key}
                aside={list.length > 0 ? countLabel(list.length) : undefined}
              />
              {list.length === 0 ? (
                <EmptyState>Nothing scheduled</EmptyState>
              ) : (
                <ol>
                  {list.map((item) => (
                    <SeasonAnimeCard
                      key={item.anime.mal_id}
                      anime={item.anime}
                      entry={entries.get(item.anime.mal_id)}
                      time={item.time}
                      note={
                        item.countdown && (
                          <>
                            <span className="sr-only">Next episode </span>in{" "}
                            {item.countdown}
                          </>
                        )
                      }
                    />
                  ))}
                </ol>
              )}
            </section>
          );
        })}
        {renderUnscheduled("season-unknown", "Unknown schedule", unknown)}
        {renderUnscheduled("season-finished", "Finished airing", finished)}
      </div>
    </div>
  );
}
