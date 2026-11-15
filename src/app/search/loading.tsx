const PULSE = "rounded bg-muted animate-pulse";

export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <p role="status" className="sr-only">
          Loading search results
        </p>
        <div className="max-w-xl mx-auto mb-6 sm:mb-8">
          <div className="h-14 w-full rounded-lg border border-input bg-muted/40 animate-pulse" />
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
