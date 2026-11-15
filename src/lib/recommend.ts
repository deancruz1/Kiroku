import type { StoredShow } from "@/lib/anime-shape";

export const GENRE_IDS: Record<string, number> = {
  Action: 1,
  Adventure: 2,
  Comedy: 4,
  Drama: 8,
  Fantasy: 10,
  Horror: 14,
  Mystery: 7,
  Romance: 22,
  "Sci-Fi": 24,
  "Slice of Life": 36,
  Sports: 30,
  Supernatural: 37,
  Thriller: 41,
  Mecha: 18,
  Music: 19,
  School: 23,
  Shounen: 27,
  Seinen: 42,
  Josei: 43,
  Shoujo: 25,
  Isekai: 62,
  Psychological: 40,
};

export const MIN_SCORE = 7;
export const MAX_RECOMMENDATIONS = 10;

export interface RecommendEntry {
  animeId: number;
  status: string;
  rating: number | null;
}

type RecommendShow = Pick<StoredShow, "title" | "titleEnglish" | "genres">;

export interface Candidate {
  mal_id: number;
  title: string;
  image: string;
  score: number | null;
  genres: string[];
}

export interface Recommendation extends Candidate {
  becauseOf: string;
}

// 6 counts a little, 10 counts most, 5 and below is not treated as liking the genre
export function ratingWeight(rating: number) {
  return Math.max(0, rating - 5);
}

// Entries that count as taste signals. Rated entries when there are liked ones,
// otherwise unrated entries that were not dropped.
export function tasteEntries(entries: RecommendEntry[]) {
  const liked = entries
    .filter((e) => e.rating !== null && ratingWeight(e.rating) > 0)
    .map((e) => ({ entry: e, weight: ratingWeight(e.rating!) }));
  if (liked.length > 0) return liked;

  return entries
    .filter((e) => e.rating === null && e.status !== "dropped")
    .map((e) => ({ entry: e, weight: 1 }));
}

export function scoreGenres(
  entries: RecommendEntry[],
  shows: Map<number, RecommendShow>,
) {
  const weights: Record<string, number> = {};
  for (const { entry, weight } of tasteEntries(entries)) {
    const show = shows.get(entry.animeId);
    if (!show) continue;
    for (const genre of new Set(show.genres)) {
      weights[genre] = (weights[genre] || 0) + weight;
    }
  }
  return weights;
}

export function pickGenres(weights: Record<string, number>, limit = 3) {
  return Object.entries(weights)
    .filter(([name, weight]) => GENRE_IDS[name] && weight > 0)
    .sort(([a, wa], [b, wb]) => wb - wa || a.localeCompare(b))
    .slice(0, limit)
    .map(([name]) => name);
}

// The user's best-rated show with this genre; on a tie, the one earlier in the list
export function becauseOf(
  genre: string,
  entries: RecommendEntry[],
  shows: Map<number, RecommendShow>,
) {
  let best: { title: string; rating: number } | null = null;
  for (const { entry } of tasteEntries(entries)) {
    const show = shows.get(entry.animeId);
    if (!show || !show.genres.includes(genre)) continue;
    const rating = entry.rating ?? 0;
    if (!best || rating > best.rating) {
      best = { title: show.titleEnglish || show.title, rating };
    }
  }
  return best ? best.title : genre;
}

// Takes one candidate from each genre in turn so the top genre does not fill every slot
export function buildRecommendations(
  results: { genre: string; candidates: Candidate[] }[],
  excludeIds: Set<number>,
  reasons: Record<string, string>,
  limit = MAX_RECOMMENDATIONS,
) {
  const queues = results.map(({ genre, candidates }) => ({
    genre,
    items: candidates.filter(
      (a) => !excludeIds.has(a.mal_id) && !!a.score && a.score >= MIN_SCORE,
    ),
  }));
  const picked: Recommendation[] = [];
  const seen = new Set<number>();
  const longest = Math.max(0, ...queues.map((q) => q.items.length));

  for (let i = 0; i < longest; i++) {
    for (const { genre, items } of queues) {
      if (picked.length >= limit) return picked;
      const anime = items[i];
      if (!anime || seen.has(anime.mal_id)) continue;
      seen.add(anime.mal_id);
      picked.push({ ...anime, becauseOf: reasons[genre] ?? genre });
    }
  }

  return picked;
}
