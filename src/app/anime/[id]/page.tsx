import Image from "next/image";
import Link from "next/link";
import { Star, Tv, Clock, Calendar, ThumbsUp } from "lucide-react";
import {
  getAnimeById,
  getAnimeRecommendations,
  getAnimeReviews,
  getAnimeVideos,
  getAnimeRelations,
  getAnimeCharacters,
} from "@/lib/jikan";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddButton } from "./add-button";
import { CollectionButton } from "./collection-button";
import { ReviewsSection } from "./reviews-section";
import type { JikanRecommendation, JikanCharacter } from "@/types/anime";
import { BackButton } from "./back-button";

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id } = await params;
  const malId = parseInt(id, 10);

  if (isNaN(malId)) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm sm:text-base">
          Invalid anime ID.
        </p>
      </main>
    );
  }

  let anime, recommendations, reviews, videos, relations, characters;
  try {
    const [
      animeRes,
      recsRes,
      reviewsRes,
      videosRes,
      relationsRes,
      charactersRes,
    ] = await Promise.all([
      getAnimeById(malId),
      getAnimeRecommendations(malId),
      getAnimeReviews(malId),
      getAnimeVideos(malId),
      getAnimeRelations(malId),
      getAnimeCharacters(malId),
    ]);
    anime = animeRes.data;
    recommendations = recsRes.data?.slice(0, 6) || [];
    reviews = reviewsRes.data || [];
    videos = videosRes.data?.promo || [];
    relations = relationsRes.data || [];
    characters = charactersRes.data?.slice(0, 12) || [];
  } catch {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm sm:text-base">
          Anime not found.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
        <BackButton />

        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
          <div className="relative w-full max-w-64 sm:w-75 sm:h-112.5 aspect-[3/4] sm:aspect-auto shrink-0 mx-auto md:mx-0">
            <Image
              src={anime.images.webp.large_image_url}
              alt={anime.title}
              fill
              sizes="(max-width: 640px) 256px, 300px"
              className="rounded-lg object-cover shadow-lg"
              priority
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {anime.title_english || anime.title}
              </h1>
              {anime.title_japanese && (
                <p className="text-muted-foreground text-sm sm:text-base">
                  {anime.title_japanese}
                </p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <AddButton animeId={malId} />
              <CollectionButton animeId={malId} />
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {anime.genres?.map((genre: { mal_id: number; name: string }) => (
                <Badge
                  key={genre.mal_id}
                  variant="secondary"
                  className="text-xs"
                >
                  {genre.name}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
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
              <p className="text-xs sm:text-sm">
                <span className="text-muted-foreground">Studio: </span>
                {anime.studios.map((s: { name: string }) => s.name).join(", ")}
              </p>
            )}

            <Separator />

            <div>
              <h2 className="font-semibold text-sm sm:text-base mb-2">
                Synopsis
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {anime.synopsis || "No synopsis available."}
              </p>
            </div>

            {/* Trailer */}
            {videos.length > 0 && videos[0].trailer?.youtube_id && (
              <div>
                <h2 className="font-semibold text-sm sm:text-base mb-2">
                  Trailer
                </h2>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${videos[0].trailer.youtube_id}`}
                    title="Trailer"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
              Recommendations
            </h2>
            {/* Mobile/Tablet: horizontal scroll */}
            <div className="flex lg:hidden gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
              {recommendations.map((rec: JikanRecommendation) => (
                <Link
                  key={rec.entry.mal_id}
                  href={`/anime/${rec.entry.mal_id}`}
                  className="w-36 shrink-0 snap-start"
                >
                  <div className="rounded-lg overflow-hidden bg-card border transition-all h-full hover:ring-2 hover:ring-primary">
                    <div className="relative w-full aspect-3/4">
                      <Image
                        src={rec.entry.images.webp.large_image_url}
                        alt={rec.entry.title}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2 border-t">
                      <p className="text-xs font-medium line-clamp-2 h-8">
                        {rec.entry.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <ThumbsUp className="h-3 w-3 inline mr-0.5" />
                        {rec.votes}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden lg:grid grid-cols-6 gap-4">
              {recommendations.map((rec: JikanRecommendation) => (
                <Link
                  key={rec.entry.mal_id}
                  href={`/anime/${rec.entry.mal_id}`}
                  className="block h-full"
                >
                  <div className="rounded-lg overflow-hidden bg-card border transition-all h-full hover:ring-2 hover:ring-primary">
                    <div className="relative w-full aspect-3/4">
                      <Image
                        src={rec.entry.images.webp.large_image_url}
                        alt={rec.entry.title}
                        fill
                        sizes="16vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2 border-t">
                      <p className="text-xs font-medium line-clamp-2 h-8">
                        {rec.entry.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <ThumbsUp className="h-3 w-3 inline mr-0.5" />
                        {rec.votes}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
              Characters & Voice Actors
            </h2>
            {/* Mobile/Tablet: horizontal scroll - 2 rows */}
            <div className="flex lg:hidden flex-col gap-3">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {characters
                  .slice(0, Math.ceil(characters.length / 2))
                  .map((char: JikanCharacter) => (
                    <div
                      key={char.character.mal_id}
                      className="w-36 shrink-0 snap-start"
                    >
                      <div className="rounded-lg overflow-hidden bg-card border transition-all h-full">
                        <div className="relative w-full aspect-4/5">
                          <Image
                            src={
                              char.character.images.webp.image_url ||
                              char.character.images.jpg.image_url
                            }
                            alt={char.character.name}
                            fill
                            sizes="144px"
                            className="object-cover"
                          />
                        </div>
                        <div className="p-2 border-t">
                          <p className="text-xs font-medium line-clamp-1 h-4">
                            {char.character.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground h-3">
                            {char.role}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 h-3">
                            {char.voice_actors?.length > 0
                              ? `VA: ${char.voice_actors[0].person.name}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {characters
                  .slice(Math.ceil(characters.length / 2))
                  .map((char: JikanCharacter) => (
                    <div
                      key={char.character.mal_id}
                      className="w-36 shrink-0 snap-start"
                    >
                      <div className="rounded-lg overflow-hidden bg-card border transition-all h-full">
                        <div className="relative w-full aspect-4/5">
                          <Image
                            src={
                              char.character.images.webp.image_url ||
                              char.character.images.jpg.image_url
                            }
                            alt={char.character.name}
                            fill
                            sizes="144px"
                            className="object-cover"
                          />
                        </div>
                        <div className="p-2 border-t">
                          <p className="text-xs font-medium line-clamp-1 h-4">
                            {char.character.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground h-3">
                            {char.role}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 h-3">
                            {char.voice_actors?.length > 0
                              ? `VA: ${char.voice_actors[0].person.name}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            {/* Desktop: grid */}
            <div className="hidden lg:grid grid-cols-6 gap-3">
              {characters.map((char: JikanCharacter) => (
                <div
                  key={char.character.mal_id}
                  className="rounded-lg overflow-hidden bg-card border transition-all h-full"
                >
                  <div className="relative w-full aspect-4/5">
                    <Image
                      src={
                        char.character.images.webp.image_url ||
                        char.character.images.jpg.image_url
                      }
                      alt={char.character.name}
                      fill
                      sizes="16vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2 border-t">
                    <p className="text-xs font-medium line-clamp-1 h-4">
                      {char.character.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground h-3">
                      {char.role}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 h-3">
                      {char.voice_actors?.length > 0
                        ? `VA: ${char.voice_actors[0].person.name}`
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relations */}
        {relations.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
              Related Anime
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {relations.map(
                (rel: {
                  relation: string;
                  entry: { mal_id: number; name: string }[];
                }) => (
                  <div key={rel.relation}>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
                      {rel.relation}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {rel.entry.map((entry) => (
                        <Link
                          key={entry.mal_id}
                          href={`/anime/${entry.mal_id}`}
                        >
                          <Badge
                            variant="outline"
                            className="hover:bg-secondary transition-colors text-xs"
                          >
                            {entry.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Reviews */}
        <ReviewsSection reviews={reviews} />
      </div>
    </main>
  );
}
