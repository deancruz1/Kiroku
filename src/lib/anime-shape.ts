import type { JikanAnime } from "@/types/anime";

export interface StoredShow {
  id: number;
  title: string;
  titleEnglish: string | null;
  titleJapanese: string | null;
  imageUrl: string | null;
  episodes: number | null;
  genres: string[];
  score: number | null;
  status: string | null;
  durationMinutes: number | null;
  season: string | null;
  year: number | null;
  fetchedAt: Date | string;
}

interface JikanImageSet {
  image_url?: string | null;
  large_image_url?: string | null;
}

export interface JikanAnimeData {
  mal_id: number;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  images?: { webp?: JikanImageSet; jpg?: JikanImageSet };
  episodes?: number | null;
  genres?: { name: string }[] | null;
  score?: number | null;
  status?: string | null;
  duration?: string | null;
  season?: string | null;
  year?: number | null;
}

export const AIRING_REFRESH_MS = 24 * 60 * 60 * 1000;
export const FINISHED_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

// Jikan formats: "24 min per ep", "1 hr 55 min", "1 hr", "45 sec per ep", "Unknown"
export function parseDurationMinutes(duration: string | null | undefined) {
  if (!duration) return null;
  const hours = /(\d+)\s*hr/.exec(duration);
  const minutes = /(\d+)\s*min/.exec(duration);
  const seconds = /(\d+)\s*sec/.exec(duration);
  if (!hours && !minutes && !seconds) return null;

  const total =
    (hours ? Number(hours[1]) * 60 : 0) +
    (minutes ? Number(minutes[1]) : 0) +
    (seconds ? Number(seconds[1]) / 60 : 0);

  if (total <= 0) return null;
  return Math.max(1, Math.round(total));
}

function nonNegativeInt(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function mapJikanAnime(data: JikanAnimeData, now: Date) {
  const images = data.images;
  return {
    id: data.mal_id,
    title: data.title || data.title_english || `Anime #${data.mal_id}`,
    titleEnglish: data.title_english || null,
    titleJapanese: data.title_japanese || null,
    imageUrl:
      images?.webp?.large_image_url ||
      images?.jpg?.large_image_url ||
      images?.webp?.image_url ||
      images?.jpg?.image_url ||
      null,
    episodes: nonNegativeInt(data.episodes) || null,
    genres: (data.genres ?? []).map((g) => g.name).filter(Boolean),
    score: typeof data.score === "number" ? data.score : null,
    status: data.status || null,
    durationMinutes: parseDurationMinutes(data.duration),
    season: data.season || null,
    year: nonNegativeInt(data.year),
    fetchedAt: now,
  };
}

export function isStale(
  show: Pick<StoredShow, "status" | "fetchedAt">,
  now: Date,
) {
  const age = now.getTime() - new Date(show.fetchedAt).getTime();
  const finished = show.status === "Finished Airing";
  return age > (finished ? FINISHED_REFRESH_MS : AIRING_REFRESH_MS);
}

export const FETCH_BUDGET = 6;

// Picks which ids to fetch this request: missing shows first, then the stalest stored ones
export function planFetches(
  ids: number[],
  stored: Map<number, Pick<StoredShow, "status" | "fetchedAt">>,
  now: Date,
  budget = FETCH_BUDGET,
) {
  const unique = [...new Set(ids)];
  const missing = unique.filter((id) => !stored.has(id));
  const stale = unique
    .filter((id) => {
      const show = stored.get(id);
      return show && isStale(show, now);
    })
    .sort(
      (a, b) =>
        new Date(stored.get(a)!.fetchedAt).getTime() -
        new Date(stored.get(b)!.fetchedAt).getTime(),
    );
  return [...missing, ...stale].slice(0, budget);
}

export function showTitle(show: StoredShow | null | undefined, animeId: number) {
  return show?.titleEnglish || show?.title || `Anime #${animeId}`;
}

// AnimeCard takes a JikanAnime, so stored rows are widened to that shape
export function toJikanAnime(show: StoredShow): JikanAnime {
  const image = show.imageUrl ?? "";
  return {
    mal_id: show.id,
    title: show.title,
    title_english: show.titleEnglish,
    title_japanese: show.titleJapanese,
    images: {
      jpg: {
        image_url: image,
        small_image_url: image,
        large_image_url: image,
      },
      webp: {
        image_url: image,
        small_image_url: image,
        large_image_url: image,
      },
    },
    synopsis: null,
    episodes: show.episodes,
    status: show.status ?? "",
    aired: { from: null, to: null },
    score: show.score,
    genres: show.genres.map((name, i) => ({ mal_id: i, name })),
    studios: [],
    season: show.season,
    year: show.year,
    broadcast: { day: null, time: null },
  };
}
