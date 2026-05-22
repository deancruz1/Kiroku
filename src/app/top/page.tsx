import Link from "next/link";
import Image from "next/image";
import { getTopAnime } from "@/lib/jikan";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { JikanAnime } from "@/types/anime";

const FILTERS = [
  { value: "bypopularity", label: "Most Popular" },
  { value: "airing", label: "Airing" },
  { value: "upcoming", label: "Upcoming" },
  { value: "favorite", label: "Most Favorited" },
];

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const activeFilter = filter || "bypopularity";

  let anime: JikanAnime[] = [];
  let error = null;

  try {
    const response = await getTopAnime(
      1,
      activeFilter as "airing" | "upcoming" | "bypopularity" | "favorite",
    );
    anime = response.data || [];
  } catch {
    error = "Failed to load top anime.";
    anime = [];
  }

  const activeLabel = FILTERS.find((f) => f.value === activeFilter)?.label;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Top Anime</h1>
        <p className="text-muted-foreground mb-6">{activeLabel}</p>

        <div className="flex gap-2 mb-8 flex-wrap">
          {FILTERS.map((f) => (
            <Link key={f.value} href={`/top?filter=${f.value}`}>
              <Badge
                variant={activeFilter === f.value ? "default" : "secondary"}
                className="cursor-pointer"
              >
                {f.label}
              </Badge>
            </Link>
          ))}
        </div>

        {error && <p className="text-destructive">{error}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {anime.map((show) => (
            <Link key={show.mal_id} href={`/anime/${show.mal_id}`}>
              <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all h-full">
                <div className="relative w-full aspect-3/4">
                  <Image
                    src={show.images.webp.large_image_url}
                    alt={show.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 20vw"
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2">
                    {show.title_english || show.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {show.score && (
                      <span className="text-xs text-yellow-500">
                        ★ {show.score.toFixed(1)}
                      </span>
                    )}
                    {show.episodes && (
                      <span className="text-xs text-muted-foreground">
                        {show.episodes} ep
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
