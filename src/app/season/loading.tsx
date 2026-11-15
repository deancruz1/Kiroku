const PULSE = "rounded bg-muted animate-pulse";
const DAYS = 7;

function CardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-card border">
      <div className="w-full aspect-3/4 bg-muted animate-pulse" />
      <div className="p-3 border-t">
        <div className={`h-5 w-3/4 ${PULSE}`} />
        <div className={`h-5 w-1/3 mt-1.5 ${PULSE}`} />
      </div>
    </div>
  );
}

export default function SeasonLoading() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <p role="status" className="sr-only">
          Loading seasonal anime
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center sm:text-left">
          Seasonal Anime
        </h1>
        <div
          className={`h-5 sm:h-6 w-72 max-w-full mb-4 sm:mb-6 mx-auto sm:mx-0 ${PULSE}`}
        />

        <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <div className="h-8 sm:h-9 w-20 rounded-md bg-muted animate-pulse" />
          <div className="h-8 sm:h-9 w-24 rounded-md bg-muted animate-pulse" />
          <div className="h-9 flex-1 min-w-[150px] max-w-xs rounded-lg bg-muted animate-pulse" />
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="h-5 w-16 rounded-4xl bg-muted animate-pulse"
            />
          ))}
        </div>

        <div className="hidden lg:grid grid-cols-7 gap-5">
          {Array.from({ length: DAYS }, (_, day) => (
            <div key={day}>
              <div className={`h-5 w-16 mx-auto mb-3 ${PULSE}`} />
              <div className="space-y-4">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>
          ))}
        </div>

        <div className="lg:hidden space-y-6">
          {Array.from({ length: 3 }, (_, day) => (
            <div key={day}>
              <div className={`h-5 w-20 mb-2 ${PULSE}`} />
              <div className="flex gap-3 overflow-hidden pb-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="w-36 shrink-0">
                    <CardSkeleton />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
