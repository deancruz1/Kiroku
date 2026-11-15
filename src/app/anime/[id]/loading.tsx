const PULSE = "rounded bg-muted animate-pulse";

export default function AnimeLoading() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
        <p role="status" className="sr-only">
          Loading anime
        </p>
        <div className={`h-5 w-32 mb-6 ${PULSE}`} />

        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
          <div className="w-full max-w-64 sm:w-75 sm:h-112.5 aspect-[3/4] sm:aspect-auto shrink-0 mx-auto md:mx-0 rounded-lg bg-muted animate-pulse" />

          <div className="flex-1 space-y-4">
            <div>
              <div className={`h-8 sm:h-9 w-2/3 ${PULSE}`} />
              <div className={`h-5 sm:h-6 w-1/3 mt-1 ${PULSE}`} />
            </div>

            <div className="flex gap-2 flex-wrap">
              <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
              <div className="h-8 w-36 rounded-lg bg-muted animate-pulse" />
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {["w-16", "w-20", "w-14"].map((width) => (
                <div
                  key={width}
                  className={`h-5 ${width} rounded-4xl bg-muted animate-pulse`}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-3 sm:gap-4">
              {["w-12", "w-24", "w-28", "w-24"].map((width, i) => (
                <div key={i} className={`h-4 sm:h-5 ${width} ${PULSE}`} />
              ))}
            </div>

            <div className={`h-4 sm:h-5 w-40 ${PULSE}`} />

            <div className="h-px w-full bg-border" />

            <div>
              <div className={`h-5 sm:h-6 w-20 mb-2 ${PULSE}`} />
              <div className="space-y-2">
                {["w-full", "w-full", "w-full", "w-full", "w-2/3"].map(
                  (width, i) => (
                    <div key={i} className={`h-4 ${width} ${PULSE}`} />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
