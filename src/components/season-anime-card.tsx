import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { JikanAnime } from "@/types/anime";

const STATUS_LABELS: Record<string, string> = {
  watching: "Watching",
  completed: "Done",
  plan_to_watch: "PTW",
  dropped: "Dropped",
};

interface SeasonAnimeCardProps {
  anime: JikanAnime;
  isTracked: boolean;
  trackedStatus?: string;
  countdown: string | null;
}

export function SeasonAnimeCard({
  anime,
  isTracked,
  trackedStatus,
  countdown,
}: SeasonAnimeCardProps) {
  const broadcastTime = anime.broadcast?.time || null;

  return (
    <Link href={`/anime/${anime.mal_id}`} className="block h-full">
      <div
        className={`rounded-lg overflow-hidden bg-card border transition-all h-full ${
          isTracked
            ? "ring-2 ring-primary"
            : "hover:brightness-110 hover:scale-[1.02]"
        }`}
      >
        <div className="relative w-full aspect-3/4">
          <Image
            src={anime.images.webp.large_image_url}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 50vw, 150px"
            className="object-cover"
          />
          {isTracked && trackedStatus && (
            <div className="absolute top-1 left-1">
              <Badge className="text-[10px] px-1 py-0 h-4">
                {STATUS_LABELS[trackedStatus]}
              </Badge>
            </div>
          )}
          <div className="absolute bottom-1 right-1 flex items-center gap-1">
            {broadcastTime && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {broadcastTime}
              </Badge>
            )}
            {countdown && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {countdown}
              </Badge>
            )}
          </div>
        </div>
        <div className="p-3 pt-3 border-t">
          <p className="text-xs font-medium line-clamp-2 h-8">
            {anime.title_english || anime.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
