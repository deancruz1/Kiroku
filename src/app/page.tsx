import { SearchBar } from "@/components/search-bar";

export default function HomePage() {
  return (
    <main className="bg-background flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
      <div className="w-full max-w-4xl px-4 sm:px-8 py-8 sm:py-16 text-center">
        <h1 className="font-bold tracking-tight mb-3">
          <span className="block sm:hidden text-3xl text-muted-foreground mb-1">
            記録
          </span>
          <span className="hidden sm:inline text-5xl md:text-6xl">
            Kiroku |{" "}
          </span>
          <span className="sm:hidden text-5xl">Kiroku</span>
          <span className="hidden sm:inline text-5xl md:text-6xl">記録</span>
        </h1>
        <p className="text-sm sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10">
          Track your anime, discover seasonal shows
        </p>

        <div className="w-full">
          <SearchBar />
        </div>

        <div className="mt-6 sm:mt-8">
          <a
            href="/season"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse current season →
          </a>
        </div>
      </div>
    </main>
  );
}
