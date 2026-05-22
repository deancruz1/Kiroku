import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { JikanAnime } from "@/types/anime";

const STATUS_LABELS: Record<string, string> = {
  watching: "Watching",
  completed: "Done",
  plan_to_watch: "PTW",
  dropped: "Dropped",
};

interface AnimeCardProps {
  anime: JikanAnime;
  isTracked?: boolean;
  trackedStatus?: string;
  reason?: string;
}

export function AnimeCard({
  anime,
  isTracked,
  trackedStatus,
  reason,
}: AnimeCardProps) {
  return (
    <Link href={`/anime/${anime.mal_id}`} className="block h-full">
      <div
        className={`rounded-lg overflow-hidden bg-card border transition-all h-full ${
          isTracked ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary"
        }`}
      >
        <div className="relative w-full aspect-3/4">
          <Image
            src={anime.images.webp.large_image_url}
            alt={anime.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
          {isTracked && trackedStatus && (
            <div className="absolute top-1 left-1">
              <Badge className="text-[10px] px-1 py-0 h-4">
                {STATUS_LABELS[trackedStatus]}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3 border-t">
          <h3 className="font-medium text-sm truncate">
            {anime.title_english || anime.title}
          </h3>
          <div className="flex items-center justify-between mt-1.5">
            {anime.score ? (
              <span className="flex items-center gap-0.5 text-yellow-500 text-sm font-medium">
                <Star className="h-3.5 w-3.5 fill-current" />
                {anime.score.toFixed(1)}
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-1">
              {anime.genres?.slice(0, 2).map((genre) => (
                <Badge
                  key={genre.mal_id}
                  variant="secondary"
                  className="text-[10px] px-1 py-0 h-4"
                >
                  {genre.name}
                </Badge>
              ))}
            </div>
          </div>
          {reason && (
            <p className="text-[10px] text-muted-foreground mt-4 line-clamp-1">
              {reason}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
