import { SearchBar } from "@/components/search-bar";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center gap-2 mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Kiroku</h1>
          <p className="text-muted-foreground text-lg">
            Track your anime, discover seasonal shows
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <SearchBar />
        </div>
      </div>
    </main>
  );
}
