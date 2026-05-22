import { SearchBar } from "@/components/search-bar";

export default function HomePage() {
  return (
    <main className="bg-background flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
      <div className="w-full max-w-4xl px-8 py-16 text-center">
        <h1 className="text-6xl font-bold tracking-tight mb-3">Kiroku.</h1>
        <p className="text-2xl text-muted-foreground mb-10">
          Track your anime, discover seasonal shows
        </p>

        <div className="w-full">
          <SearchBar />
        </div>

        <div className="mt-8">
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
