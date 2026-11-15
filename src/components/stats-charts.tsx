import type { CSSProperties } from "react";
import { LeaderList, LeaderRow } from "@/components/leader-row";
import { STATUS_LABEL, type WatchStatus } from "@/components/status-mark";

export const STATS_STATUS_ORDER: WatchStatus[] = [
  "completed",
  "watching",
  "plan_to_watch",
  "dropped",
];

const HATCH =
  "repeating-linear-gradient(135deg, var(--hatch) 0 1.5px, transparent 1.5px 5px)";
const OUTLINE = "inset 0 0 0 1px var(--hatch)";

const STATUS_FILL: Record<WatchStatus, CSSProperties> = {
  completed: { background: "var(--chart-1)" },
  watching: { background: "var(--chart-2)" },
  plan_to_watch: { background: HATCH, boxShadow: OUTLINE },
  dropped: { boxShadow: OUTLINE },
};

export function percent(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "";
}

export function StatusBreakdown({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const label = STATS_STATUS_ORDER.map(
    (s) => `${STATUS_LABEL[s]} ${counts[s] ?? 0}`,
  ).join(", ");

  return (
    <>
      <div role="img" aria-label={label} className="mb-5 flex h-4 gap-0.5">
        {STATS_STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
          <span
            key={s}
            className="block h-full"
            style={{ flex: counts[s], ...STATUS_FILL[s] }}
          />
        ))}
      </div>
      <LeaderList>
        {STATS_STATUS_ORDER.map((s) => {
          const count = counts[s] ?? 0;
          return (
            <LeaderRow
              key={s}
              muted={count === 0}
              label={
                <>
                  <span
                    aria-hidden="true"
                    className="inline-block size-3.5"
                    style={STATUS_FILL[s]}
                  />
                  {STATUS_LABEL[s]}
                </>
              }
              value={count}
              share={percent(count, total)}
            />
          );
        })}
      </LeaderList>
    </>
  );
}

export function GenreBars({
  genres,
  base,
}: {
  genres: { name: string; count: number }[];
  base: number;
}) {
  const max = Math.max(1, ...genres.map((g) => g.count));

  return (
    <ul className="m-0 list-none p-0">
      {genres.map((g) => (
        <li
          key={g.name}
          className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_3ch_4.5ch] items-center gap-x-2.5 py-[7px] text-lg leading-[1.45] md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3ch_4.5ch]"
        >
          <span className="truncate">{g.name}</span>
          <span aria-hidden="true" className="relative h-1.5 border-b border-rule">
            <span
              className="absolute bottom-0 left-0 h-1.5 bg-chart-1"
              style={{ width: `${(g.count / max) * 100}%` }}
            />
          </span>
          <span className="text-right">{g.count}</span>
          <span className="text-right text-base text-muted-foreground">
            {percent(g.count, base)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RatingColumns({
  distribution,
}: {
  distribution: { rating: number; count: number }[];
}) {
  const max = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <ol aria-label="Shows by rating" className="m-0 grid list-none grid-cols-10 p-0">
      {distribution.map(({ rating, count }) => (
        <li key={rating}>
          <span className="sr-only">
            Rated {rating}: {count} {count === 1 ? "show" : "shows"}
          </span>
          <div
            aria-hidden="true"
            className="flex h-[140px] flex-col items-center justify-end border-b border-foreground px-[3px] md:px-1.5"
          >
            <span
              className={
                count === 0
                  ? "mb-1 text-[15px] text-muted-foreground"
                  : "mb-1 text-[15px]"
              }
            >
              {count}
            </span>
            {count > 0 && (
              <span
                className="block w-full bg-chart-1"
                style={{ height: `${(count / max) * 100}px` }}
              />
            )}
          </div>
          <span
            aria-hidden="true"
            className="mt-1.5 block text-center text-[15px] text-muted-foreground"
          >
            {rating}
          </span>
        </li>
      ))}
    </ol>
  );
}
