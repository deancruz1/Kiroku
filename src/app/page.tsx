import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="page">
      <div className="max-w-3xl md:pt-12">
        <div className="border-b border-foreground pb-5">
          <h1 className="flex items-baseline gap-4 md:gap-6">
            <span
              lang="ja"
              className="text-[56px] leading-none font-bold tracking-[.04em] md:text-[88px]"
            >
              記録
            </span>
            <span className="type-display-sm md:type-display">Kiroku</span>
          </h1>
          <p className="mt-4 text-xl text-muted-foreground md:text-2xl">
            Track your anime, discover seasonal shows.
          </p>
        </div>

        <div className="mt-10 md:mt-12">
          <SearchBar />
        </div>

        <Button variant="link" asChild className="mt-6">
          <Link href="/season">Browse the current season</Link>
        </Button>
      </div>
    </main>
  );
}
