import { Skeleton } from "@/components/skeleton";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";

export const SEASON_DAYS = [
  { key: "monday", label: "Monday", short: "Mon", kanji: "月" },
  { key: "tuesday", label: "Tuesday", short: "Tue", kanji: "火" },
  { key: "wednesday", label: "Wednesday", short: "Wed", kanji: "水" },
  { key: "thursday", label: "Thursday", short: "Thu", kanji: "木" },
  { key: "friday", label: "Friday", short: "Fri", kanji: "金" },
  { key: "saturday", label: "Saturday", short: "Sat", kanji: "土" },
  { key: "sunday", label: "Sunday", short: "Sun", kanji: "日" },
] as const;

export type DayKey = (typeof SEASON_DAYS)[number]["key"];

export const SPREAD_CLASS =
  "lg:columns-2 lg:gap-12 lg:[column-rule:1px_solid_var(--rule)] xl:gap-20";

export const DAY_SECTION_CLASS = "mb-10 scroll-mt-14 break-inside-avoid";

export function SeasonDayJump({ today }: { today?: DayKey | null }) {
  return (
    <nav
      aria-label="Days"
      className="sticky top-0 z-10 -mx-[var(--gutter)] mb-6 border-b border-rule bg-background px-[var(--gutter)] lg:hidden"
    >
      <ul className="flex h-14 items-center justify-between">
        {SEASON_DAYS.map((day) => (
          <li key={day.key}>
            <a
              href={`#season-${day.key}`}
              aria-current={today === day.key ? "date" : undefined}
              className={cn(
                "flex min-h-11 min-w-10 flex-col items-center justify-center text-xs leading-none hover:no-underline",
                today === day.key ? "text-vermilion" : "text-muted-foreground",
              )}
            >
              <span
                lang="ja"
                aria-hidden="true"
                className={cn(
                  "text-[19px] font-bold leading-[1.2]",
                  today !== day.key && "text-foreground",
                )}
              >
                {day.kanji}
              </span>
              {day.short}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SeasonDayHeading({
  kanji,
  label,
  aside,
  today,
}: {
  kanji?: string;
  label: string;
  aside?: React.ReactNode;
  today?: boolean;
}) {
  return (
    <SectionHeading
      rule="below"
      aside={aside}
      className="sticky top-14 z-[5] bg-background pt-2 lg:static lg:pt-0"
    >
      {kanji && (
        <span
          lang="ja"
          aria-hidden="true"
          className="self-center text-[26px] font-bold leading-none md:text-[28px]"
        >
          {kanji}
        </span>
      )}
      {label}
      {today && (
        <span className="text-lg font-normal italic text-vermilion">today</span>
      )}
    </SectionHeading>
  );
}

export function SeasonRowSkeleton({ withTime = true }: { withTime?: boolean }) {
  return (
    <li
      className={cn(
        "grid items-center gap-x-2.5 border-b border-rule py-2.5 sm:gap-x-3.5",
        withTime
          ? "grid-cols-[44px_minmax(0,1fr)_auto] sm:grid-cols-[52px_30px_minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[30px_minmax(0,1fr)_auto]",
      )}
    >
      {withTime && <Skeleton className="h-4 w-10 self-start mt-1" />}
      <Skeleton className="hidden h-10 w-[30px] sm:block" />
      <div>
        <Skeleton className="h-4 w-3/4 max-w-60" />
        <Skeleton className="mt-2 h-3 w-1/2 max-w-36" />
      </div>
      <Skeleton className="h-4 w-16 self-start mt-1" />
    </li>
  );
}

const ROWS_PER_DAY = 4;

export function SeasonCalendarSkeleton() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading the schedule
      </p>
      <SeasonDayJump />
      <div className={SPREAD_CLASS}>
        {SEASON_DAYS.map((day) => (
          <section
            key={day.key}
            id={`season-${day.key}`}
            className={DAY_SECTION_CLASS}
          >
            <SeasonDayHeading
              kanji={day.kanji}
              label={day.label}
              aside={
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-14 animate-pulse rounded-sm bg-plate motion-reduce:animate-none"
                />
              }
            />
            <ol>
              {Array.from({ length: ROWS_PER_DAY }, (_, i) => (
                <SeasonRowSkeleton key={i} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
