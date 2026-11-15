import Link from "next/link";

export default function AnimeNotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold">Anime not found</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          There is no anime with this ID.
        </p>
        <Link
          href="/search"
          className="inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Search for an anime
        </Link>
      </div>
    </main>
  );
}
