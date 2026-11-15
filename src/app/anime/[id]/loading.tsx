import { Skeleton } from "@/components/skeleton";

const FACT_WIDTHS = ["w-12", "w-10", "w-8", "w-28", "w-44", "w-24", "w-36", "w-16"];
const TEXT_WIDTHS = ["w-full", "w-full", "w-11/12", "w-full", "w-3/5"];

export default function AnimeLoading() {
  return (
    <main className="page" aria-busy="true">
      <p role="status" className="sr-only">
        Loading show
      </p>
      <Skeleton className="my-2.5 h-5 w-36" />

      <div className="mt-4 md:mt-6 md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-x-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-x-16">
        <Skeleton className="aspect-3/4 w-40 md:w-full" />

        <div className="mt-6 min-w-0 md:mt-0">
          <Skeleton className="h-[38px] w-4/5 md:h-[52px] md:w-3/5" />
          <Skeleton className="mt-4 h-6 w-2/5" />

          <div className="mt-6 flex flex-wrap gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-48" />
          </div>

          <div className="mt-8 max-w-xl border-t border-foreground pt-2">
            {FACT_WIDTHS.map((width, i) => (
              <div key={i} className="flex items-center justify-between py-[9px]">
                <Skeleton className="h-5 w-20" />
                <Skeleton className={`h-5 ${width}`} />
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-foreground pt-3">
            <Skeleton className="mb-5 h-7 w-28" />
            <div className="max-w-[65ch] space-y-2.5">
              {TEXT_WIDTHS.map((width, i) => (
                <Skeleton key={i} className={`h-4 ${width}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
