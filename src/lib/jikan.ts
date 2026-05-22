import { jikanApi } from "@/lib/axios";
import type {
  JikanSearchResponse,
  JikanSeasonResponse,
  JikanScheduleResponse,
} from "@/types/anime";

export async function searchAnime(query: string, page = 1) {
  const { data } = await jikanApi.get<JikanSearchResponse>("/anime", {
    params: { q: query, page, limit: 20 },
  });
  return data;
}

export async function getCurrentSeason(page = 1) {
  const { data } = await jikanApi.get<JikanSeasonResponse>("/seasons/now", {
    params: { page, limit: 20 },
  });
  return data;
}

export async function getSeason(year: number, season: string, page = 1) {
  const { data } = await jikanApi.get<JikanSeasonResponse>(
    `/seasons/${year}/${season}`,
    { params: { page, limit: 20 } },
  );
  return data;
}

export async function getAnimeById(id: number) {
  const { data } = await jikanApi.get(`/anime/${id}/full`);
  return data;
}

export async function getSchedule(day: string, page = 1) {
  const { data } = await jikanApi.get<JikanScheduleResponse>("/schedules", {
    params: { filter: day, page, limit: 20 },
  });
  return data;
}

export async function getTopAnime(
  page = 1,
  filter: "airing" | "upcoming" | "bypopularity" | "favorite" = "bypopularity",
) {
  const { data } = await jikanApi.get("/top/anime", {
    params: { page, limit: 20, filter },
  });
  return data;
}

export async function getAnimeRecommendations(id: number) {
  const { data } = await jikanApi.get(`/anime/${id}/recommendations`);
  return data;
}

export async function getAnimeVideos(id: number) {
  const { data } = await jikanApi.get(`/anime/${id}/videos`);
  return data;
}

export async function getAnimePictures(id: number) {
  const { data } = await jikanApi.get(`/anime/${id}/pictures`);
  return data;
}

export async function getAnimeRelations(id: number) {
  const { data } = await jikanApi.get(`/anime/${id}/relations`);
  return data;
}

export async function getAnimeCharacters(id: number) {
  const { data } = await jikanApi.get(`/anime/${id}/characters`);
  return data;
}

export async function getSeasonList() {
  const { data } = await jikanApi.get("/seasons");
  return data;
}

export async function getSeasonAnime(year: number, season: string, page = 1) {
  const { data } = await jikanApi.get(`/seasons/${year}/${season}`, {
    params: { page, limit: 25 },
  });
  return data;
}

export async function getAnimeReviews(id: number, page = 1) {
  const { data } = await jikanApi.get(`/anime/${id}/reviews`, {
    params: { page, limit: 3 },
  });
  return data;
}
