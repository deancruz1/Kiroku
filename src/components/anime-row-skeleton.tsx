import { Skeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

const TITLE_WIDTHS = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3"];

export function AnimeRowSkeleton({
  rows = 12,
  ranked = false,
}: {
  rows?: number;
  ranked?: boolean;
}) {
  return (
    <div>
      <div className="hidden border-b border-foreground pb-2 md:block">
        <Skeleton className="h-5 w-12" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={cn(
            "grid items-center gap-x-4 border-b border-rule py-2.5 md:gap-x-6",
            ranked
              ? "grid-cols-[4ch_36px_minmax(0,1fr)_3rem] md:grid-cols-[5ch_36px_minmax(0,1fr)_5rem_6rem_6rem]"
              : "grid-cols-[36px_minmax(0,1fr)_3rem] md:grid-cols-[36px_minmax(0,1fr)_5rem_6rem_6rem]",
          )}
        >
          {ranked && <Skeleton className="ml-auto h-5 w-5" />}
          <Skeleton className="h-12 w-9" />
          <div>
            <Skeleton className={cn("h-5", TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
            <Skeleton className="mt-1.5 h-3.5 w-1/4" />
          </div>
          <Skeleton className="ml-auto h-5 w-10" />
          <Skeleton className="hidden h-5 w-10 md:block" />
          <Skeleton className="ml-auto hidden h-5 w-8 md:block" />
        </div>
      ))}
    </div>
  );
}
