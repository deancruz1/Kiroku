import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star, Tv, Clock, Calendar, ThumbsUp } from "lucide-react";
import {
  getAnimeById,
  getAnimeRecommendations,
  getAnimeReviews,
  getAnimeVideos,
  getAnimePictures,
  getAnimeRelations,
  getAnimeCharacters,
} from "@/lib/jikan";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { AddButton } from "./add-button";
import type {
  JikanRecommendation,
  JikanReview,
  JikanCharacter,
} from "@/types/anime";

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

  let anime, recommendations, reviews, videos, pictures, relations, characters;
  try {
    const [
      animeRes,
      recsRes,
      reviewsRes,
      videosRes,
      picturesRes,
      relationsRes,
      charactersRes,
    ] = await Promise.all([
      getAnimeById(malId),
      getAnimeRecommendations(malId),
      getAnimeReviews(malId),
      getAnimeVideos(malId),
      getAnimePictures(malId),
      getAnimeRelations(malId),
      getAnimeCharacters(malId),
    ]);
    anime = animeRes.data;
    recommendations = recsRes.data?.slice(0, 6) || [];
    reviews = reviewsRes.data || [];
    videos = videosRes.data?.promo || [];
    pictures = picturesRes.data?.slice(0, 8) || [];
    relations = relationsRes.data || [];
    characters = charactersRes.data?.slice(0, 12) || [];
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
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to home
        </Link>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="relative w-75 h-112.5 shrink-0">
            <Image
              src={anime.images.webp.large_image_url}
              alt={anime.title}
              fill
              sizes="300px"
              className="rounded-lg object-cover shadow-lg"
              priority
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">
                {anime.title_english || anime.title}
              </h1>
              {anime.title_japanese && (
                <p className="text-muted-foreground">{anime.title_japanese}</p>
              )}
            </div>

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

            {/* Trailer */}
            {videos.length > 0 && videos[0].trailer?.youtube_id && (
              <div>
                <h2 className="font-semibold mb-2">Trailer</h2>
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
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4">Recommendations</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {recommendations.map((rec: JikanRecommendation) => (
                <Link
                  key={rec.entry.mal_id}
                  href={`/anime/${rec.entry.mal_id}`}
                >
                  <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all h-full">
                    <div className="relative w-full aspect-3/4">
                      <Image
                        src={rec.entry.images.webp.large_image_url}
                        alt={rec.entry.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 16vw"
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium line-clamp-2">
                        {rec.entry.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <ThumbsUp className="h-3 w-3 inline mr-0.5" />
                        {rec.votes}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4">
              Characters & Voice Actors
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {characters.map((char: JikanCharacter) => (
                <Card key={char.character.mal_id} className="overflow-hidden">
                  <div className="relative w-full aspect-3/4">
                    <Image
                      src={
                        char.character.images.webp.image_url ||
                        char.character.images.jpg.image_url
                      }
                      alt={char.character.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 16vw"
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs font-medium line-clamp-1">
                      {char.character.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {char.role}
                    </p>
                    {char.voice_actors?.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        VA: {char.voice_actors[0].person.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {pictures.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pictures.map(
                (
                  pic: {
                    jpg: { image_url: string };
                    webp: { image_url: string };
                  },
                  i: number,
                ) => (
                  <div
                    key={i}
                    className="relative aspect-video rounded-lg overflow-hidden"
                  >
                    <Image
                      src={pic.webp.image_url || pic.jpg.image_url}
                      alt={`Image ${i + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Relations */}
        {relations.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4">Related Anime</h2>
            <div className="space-y-4">
              {relations.map(
                (rel: {
                  relation: string;
                  entry: { mal_id: number; name: string }[];
                }) => (
                  <div key={rel.relation}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {rel.relation}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {rel.entry.map((entry) => (
                        <Link
                          key={entry.mal_id}
                          href={`/anime/${entry.mal_id}`}
                        >
                          <Badge
                            variant="outline"
                            className="hover:bg-secondary transition-colors"
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
        {reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4">Reviews</h2>
            <div className="space-y-4">
              {reviews.map((review: JikanReview) => (
                <Card key={review.mal_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Image
                        src={review.user.images.jpg.image_url}
                        alt={review.user.username}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <span className="font-medium text-sm">
                        {review.user.username}
                      </span>
                      <span className="text-yellow-500 text-sm">
                        ★ {review.score}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {review.review}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {review.tags?.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
