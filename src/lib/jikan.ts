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
