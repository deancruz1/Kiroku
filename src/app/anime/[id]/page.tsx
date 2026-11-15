import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAnimeById,
  getAnimeRecommendations,
  getAnimeReviews,
  getAnimeVideos,
  getAnimeRelations,
  getAnimeCharacterPreview,
  isJikanNotFound,
} from "@/lib/jikan";
import { parseAnimeId } from "@/lib/params";
import { visibleGenres } from "@/lib/anime-shape";
import { Poster } from "@/components/poster";
import { Section } from "@/components/section-heading";
import { LeaderList, LeaderRow } from "@/components/leader-row";
import { AddButton } from "./add-button";
import { CollectionButton } from "./collection-button";
import { ReviewsSection } from "./reviews-section";
import { BackButton } from "./back-button";
import type {
  JikanAnime,
  JikanRecommendation,
  JikanCharacter,
} from "@/types/anime";

const MAX_REVIEWS = 10;

type FullAnime = JikanAnime & {
  type?: string | null;
  duration?: string | null;
  rating?: string | null;
  aired?: { string?: string | null };
  broadcast?: { string?: string | null };
};

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

function settledValue<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : null;
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function voiceActor(char: JikanCharacter) {
  return (
    char.voice_actors?.find((va) => va.language === "Japanese") ??
    char.voice_actors?.[0]
  );
}

// Shared by generateMetadata and the page so a cold load asks upstream once.
const getShow = cache((id: number) => getAnimeById(id));

export async function generateMetadata({
  params,
}: AnimePageProps): Promise<Metadata> {
  const malId = parseAnimeId((await params).id);
  if (malId === null) return { title: "Show not found" };
  try {
    const { data } = await getShow(malId);
    return { title: data.title_english || data.title };
  } catch (error) {
    return { title: isJikanNotFound(error) ? "Show not found" : "Show" };
  }
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id } = await params;
  const malId = parseAnimeId(id);
  if (malId === null) notFound();

  // The show is requested first so it takes the first rate-limit slot. The
  // other sections are optional: a failure there only hides that section.
  const animeRequest = getShow(malId);
  const secondary = Promise.allSettled([
    getAnimeRecommendations(malId),
    getAnimeReviews(malId),
    getAnimeVideos(malId),
    getAnimeRelations(malId),
    getAnimeCharacterPreview(malId, 12),
  ]);

  // Only a 404 means the show does not exist. Any other failure is thrown to
  // error.tsx so the visitor gets a retry instead of a false "not found".
  const animeRes = await animeRequest.catch((error) => {
    if (isJikanNotFound(error)) return null;
    throw error;
  });
  if (!animeRes?.data) notFound();
  const anime: FullAnime = animeRes.data;

  const [recsRes, reviewsRes, videosRes, relationsRes, charactersRes] = (
    await secondary
  ).map(settledValue);
  const recommendations: JikanRecommendation[] =
    recsRes?.data?.slice(0, 6) || [];
  const reviews = reviewsRes?.data?.slice(0, MAX_REVIEWS) || [];
  const videos = videosRes?.data?.promo || [];
  const relations: {
    relation: string;
    entry: { mal_id: number; name: string }[];
  }[] = relationsRes?.data || [];
  const characters: JikanCharacter[] = charactersRes?.data || [];
  const displayTitle = anime.title_english || anime.title;
  const trailerId: string | undefined = videos[0]?.trailer?.youtube_id;

  const genres = visibleGenres((anime.genres ?? []).map((g) => g.name));
  const studios = (anime.studios ?? []).map((s) => s.name);

  return (
    <main className="page">
      <BackButton />

      <div className="mt-4 md:mt-6 md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-x-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-x-16">
        <Poster
          src={anime.images?.webp?.large_image_url}
          title={displayTitle}
          size="fluid"
          priority
          sizes="(max-width: 767px) 160px, 260px"
          className="w-40 md:w-full"
        />

        <div className="mt-6 min-w-0 md:mt-0">
          <h1 className="type-display-sm break-words md:type-display">
            {displayTitle}
          </h1>
          {anime.title_japanese && anime.title_japanese !== displayTitle && (
            <p lang="ja" className="mt-3 text-xl text-muted-foreground">
              {anime.title_japanese}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-start gap-3">
            <AddButton animeId={malId} />
            <CollectionButton animeId={malId} />
          </div>

          <LeaderList className="mt-8 max-w-xl border-t border-foreground pt-2">
            {anime.title_english && anime.title !== anime.title_english && (
              <LeaderRow label="Also called" value={anime.title} />
            )}
            <LeaderRow
              label="Score"
              value={anime.score ? anime.score.toFixed(2) : "Unknown"}
            />
            {anime.type && <LeaderRow label="Type" value={anime.type} />}
            <LeaderRow label="Episodes" value={anime.episodes || "Unknown"} />
            {anime.status && <LeaderRow label="Status" value={anime.status} />}
            {anime.aired?.string && (
              <LeaderRow label="Aired" value={anime.aired.string} />
            )}
            {anime.season && anime.year && (
              <LeaderRow
                label="Season"
                value={`${capitalise(anime.season)} ${anime.year}`}
              />
            )}
            {anime.broadcast?.string && (
              <LeaderRow label="Broadcast" value={anime.broadcast.string} />
            )}
            {anime.duration && (
              <LeaderRow label="Duration" value={anime.duration} />
            )}
            {studios.length > 0 && (
              <LeaderRow
                label={studios.length === 1 ? "Studio" : "Studios"}
                value={studios.join(", ")}
              />
            )}
            {genres.length > 0 && (
              <LeaderRow
                label={genres.length === 1 ? "Genre" : "Genres"}
                value={genres.join(", ")}
              />
            )}
            {anime.rating && <LeaderRow label="Rating" value={anime.rating} />}
          </LeaderList>

          <Section title="Synopsis" className="mt-12 mb-0">
            {anime.synopsis ? (
              <p className="max-w-[65ch] whitespace-pre-line">
                {anime.synopsis}
              </p>
            ) : (
              <p className="italic text-muted-foreground">
                No synopsis available.
              </p>
            )}
          </Section>
        </div>
      </div>

      <div className="mt-14 md:mt-16">
        {trailerId && (
          <Section title="Trailer">
            <div className="aspect-video max-w-3xl overflow-hidden bg-plate">
              <iframe
                src={`https://www.youtube.com/embed/${trailerId}`}
                title={`${displayTitle} trailer`}
                allowFullScreen
                className="size-full"
              />
            </div>
          </Section>
        )}

        {characters.length > 0 && (
          <Section title="Characters">
            <ul className="grid lg:grid-cols-2 lg:gap-x-14">
              {characters.map((char) => {
                const va = voiceActor(char);
                return (
                  <li
                    key={char.character.mal_id}
                    className="flex items-center gap-4 border-b border-rule py-2.5"
                  >
                    <Poster
                      src={
                        char.character.images?.webp?.image_url ||
                        char.character.images?.jpg?.image_url
                      }
                      title={char.character.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="leading-[1.25]">{char.character.name}</p>
                      <p className="mt-0.5 text-[15px] text-muted-foreground">
                        {char.role}
                      </p>
                    </div>
                    {va && (
                      <div className="min-w-0 flex-1 text-right">
                        <p className="leading-[1.25]">{va.person.name}</p>
                        <p className="mt-0.5 text-[15px] text-muted-foreground">
                          {va.language}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {relations.length > 0 && (
          <Section title="Related">
            <dl>
              {relations.map((rel) => (
                <div
                  key={rel.relation}
                  className="grid gap-x-8 border-b border-rule py-1.5 md:grid-cols-[12rem_minmax(0,1fr)]"
                >
                  <dt className="pt-2 text-muted-foreground md:pt-[9px]">
                    {rel.relation}
                  </dt>
                  <dd>
                    <ul>
                      {rel.entry.map((entry) => (
                        <li key={entry.mal_id}>
                          <Link
                            href={`/anime/${entry.mal_id}`}
                            className="inline-flex min-h-10 items-center"
                          >
                            {entry.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {recommendations.length > 0 && (
          <Section title="Recommendations">
            <ul className="grid grid-cols-3 gap-x-4 gap-y-6 md:grid-cols-6 md:gap-x-6">
              {recommendations.map((rec) => (
                <li key={rec.entry.mal_id}>
                  <Link
                    href={`/anime/${rec.entry.mal_id}`}
                    className="group block hover:no-underline"
                  >
                    <Poster
                      src={rec.entry.images?.webp?.large_image_url}
                      title={rec.entry.title}
                      size="fluid"
                      sizes="(max-width: 767px) 33vw, 200px"
                    />
                    <span className="mt-2 line-clamp-2 text-[15px] leading-[1.25] decoration-1 underline-offset-3 group-hover:underline md:text-[17px]">
                      {rec.entry.title}
                    </span>
                    <span className="mt-0.5 block text-[15px] text-muted-foreground">
                      {rec.votes} {rec.votes === 1 ? "vote" : "votes"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <ReviewsSection reviews={reviews} />
      </div>
    </main>
  );
}
