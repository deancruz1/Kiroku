import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star, Tv, Clock, Calendar } from "lucide-react";
import { getAnimeById } from "@/lib/jikan";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddButton } from "./add-button";

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id } = await params;
  const malId = parseInt(id, 10);

  if (isNaN(malId)) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Invalid anime ID.</p>
      </main>
    );
  }

  let anime;
  try {
    const response = await getAnimeById(malId);
    anime = response.data;
  } catch {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Anime not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          href="/search"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to search
        </Link>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="relative w-75 h-112.5 shrink-0">
            <Image
              src={anime.images.webp.large_image_url}
              alt={anime.title}
              width={300}
              height={450}
              className="rounded-lg object-cover shadow-lg"
              priority
            />
          </div>

          <div className="flex-1 space-y-4">
            <h1 className="text-3xl font-bold">
              {anime.title_english || anime.title}
            </h1>
            {anime.title_japanese && (
              <p className="text-muted-foreground">{anime.title_japanese}</p>
            )}
            <AddButton animeId={malId} />
            <div className="flex flex-wrap gap-2">
              {anime.genres?.map((genre: { mal_id: number; name: string }) => (
                <Badge key={genre.mal_id} variant="secondary">
                  {genre.name}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {anime.score && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {anime.score.toFixed(1)}
                </span>
              )}
              {anime.episodes && (
                <span className="flex items-center gap-1">
                  <Tv className="h-4 w-4" />
                  {anime.episodes} episodes
                </span>
              )}
              {anime.status && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {anime.status}
                </span>
              )}
              {anime.season && anime.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {anime.season} {anime.year}
                </span>
              )}
            </div>

            {anime.studios?.length > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">Studio: </span>
                {anime.studios.map((s: { name: string }) => s.name).join(", ")}
              </p>
            )}

            <Separator />

            <div>
              <h2 className="font-semibold mb-2">Synopsis</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {anime.synopsis || "No synopsis available."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
