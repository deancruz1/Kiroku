// v2 lists genres, themes and demographics in one array. Jikan keeps them
// apart, and the app only treats the genres list as genres. This split comes
// from Tenrai's /genres/anime lists (filters genres, explicit_genres, themes,
// demographics), fetched on 16 Nov 2026 by
// docs/research/mal-v2-probe/tenrai-genres.mjs. Tenrai's show records list the
// explicit genres (Ecchi, Hentai, Erotica) under genres, so they count as genres.
const GENRES = new Set([
  1, 2, 4, 5, 7, 8, 10, 14, 22, 24, 26, 28, 30, 36, 37, 41, 46, 47,
  9, 12, 49,
]);

const DEMOGRAPHICS = new Set([15, 25, 27, 42, 43]);

export const THEMES = new Set([
  3, 6, 11, 13, 17, 18, 19, 20, 21, 23, 29, 31, 32, 35, 38, 39, 40, 48, 50, 51,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
  71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83,
]);

export type GenreKind = "genres" | "themes" | "demographics";

// An id missing from the table is treated as a theme: the ids MyAnimeList
// added in recent years have all been themes.
export function genreKind(id: number): GenreKind {
  if (GENRES.has(id)) return "genres";
  if (DEMOGRAPHICS.has(id)) return "demographics";
  return "themes";
}

export function isKnownGenreId(id: number) {
  return GENRES.has(id) || DEMOGRAPHICS.has(id) || THEMES.has(id);
}
