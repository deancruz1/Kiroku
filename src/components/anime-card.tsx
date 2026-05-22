import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { JikanAnime } from "@/types/anime";

interface AnimeCardProps {
  anime: JikanAnime;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <Link href={`/anime/${anime.mal_id}`}>
      <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all h-full">
        <div className="relative w-full h-56">
          <Image
            src={anime.images.webp.large_image_url}
            alt={anime.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm line-clamp-2">
            {anime.title_english || anime.title}
          </h3>
          {anime.score && (
            <p className="text-xs text-muted-foreground mt-1">
              ★ {anime.score.toFixed(1)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
