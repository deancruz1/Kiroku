const PULSE = "rounded bg-muted animate-pulse";

export default function TopLoading() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <p role="status" className="sr-only">
          Loading top anime
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center sm:text-left">
          Top Anime
        </h1>
        <div
          className={`h-5 sm:h-6 w-28 mb-4 sm:mb-6 mx-auto sm:mx-0 ${PULSE}`}
        />

        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 flex-wrap justify-center sm:justify-start">
          {["w-24", "w-14", "w-18", "w-28"].map((width) => (
            <div
              key={width}
              className={`h-5 ${width} rounded-4xl bg-muted animate-pulse`}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="rounded-lg overflow-hidden bg-card border">
              <div className="w-full aspect-3/4 bg-muted animate-pulse" />
              <div className="p-3 border-t">
                <div className={`h-5 w-3/4 ${PULSE}`} />
                <div className={`h-5 w-1/3 mt-1.5 ${PULSE}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
