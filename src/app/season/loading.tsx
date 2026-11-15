import { Skeleton } from "@/components/skeleton";
import { SeasonCalendarSkeleton } from "@/components/season-skeleton";

export default function SeasonLoading() {
  return (
    <main className="page" aria-busy="true">
      <div className="flex flex-col gap-4 border-b border-foreground pb-3.5 md:flex-row md:items-end md:justify-between md:gap-8 md:pb-5">
        <div>
          <Skeleton className="h-[38px] w-52 md:h-[52px] md:w-72" />
          <Skeleton className="mt-3 h-5 w-80 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:gap-[18px]">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-full md:w-[200px]" />
        </div>
      </div>
      <div className="mt-2 flex gap-x-[18px] overflow-hidden py-1 md:flex-wrap">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="flex min-h-10 shrink-0 items-center md:min-h-8">
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-6 md:mt-9">
        <SeasonCalendarSkeleton />
      </div>
    </main>
  );
}
