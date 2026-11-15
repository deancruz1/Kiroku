import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import batch from "@/lib/fixtures/tenrai/batch-16-search-ids.json";
import genreAction from "@/lib/fixtures/tenrai/genre-action-by-score-sfw.json";
import relations from "@/lib/fixtures/tenrai/fmab-5114-relations.json";
import characters from "@/lib/fixtures/tenrai/fmab-5114-characters.json";
import fmab from "@/lib/fixtures/tenrai/fmab-5114-full.json";
import notFoundBody from "@/lib/fixtures/tenrai/not-found-99999999.json";

const { get, store } = vi.hoisted(() => ({
  get: vi.fn(),
  store: new Map<string, unknown>(),
}));

vi.mock("next/cache", () => ({
  unstable_cache:
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>, keyParts: string[]) =>
    async (...args: A) => {
      const key = `${keyParts.join(",")}-${JSON.stringify(args)}`;
      if (store.has(key)) return store.get(key) as R;
      const result = await fn(...args);
      store.set(key, result);
      return result;
    },
}));
vi.mock("@/lib/axios", () => ({ jikanApi: { get } }));

import {
  animeRelationsOnly,
  getAnimeById,
  getAnimeByIds,
  getAnimeCharacterPreview,
  getAnimeRelations,
  getTopAnime,
  getTopByGenre,
  isJikanNotFound,
  searchAnime,
} from "@/lib/jikan";

const DEMO_IDS = [
  52991, 5114, 9253, 16498, 1535, 11061, 30276, 38000, 40748, 20583, 33352,
  44511, 50265, 47917, 1, 54492,
];

function reply<T>(data: T) {
  return { data };
}

function notFoundError() {
  const config = { headers: new AxiosHeaders() };
  const response = {
    data: notFoundBody,
    status: 404,
    statusText: "Not Found",
    headers: {},
    config,
  } as AxiosResponse;
  return new AxiosError("Not Found", "ERR_BAD_REQUEST", config, null, response);
}

beforeEach(() => {
  get.mockReset();
  store.clear();
});

describe("getAnimeByIds", () => {
  it("sends one request and returns every show, sorted by id as Tenrai does", async () => {
    get.mockResolvedValueOnce(reply(batch));
    const shows = await getAnimeByIds(DEMO_IDS);

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/anime", {
      params: { ids: DEMO_IDS.join(","), limit: 16 },
    });
    expect(shows).toHaveLength(16);
    expect(new Set(shows.map((s) => s.mal_id))).toEqual(new Set(DEMO_IDS));
    expect(shows[0].mal_id).toBe(1);
    expect(shows.map((s) => s.mal_id)).not.toEqual(DEMO_IDS);
  });

  it("drops shows that were not asked for and skips duplicates", async () => {
    get.mockResolvedValueOnce(reply(batch));
    const shows = await getAnimeByIds([5114, 5114, 1]);
    expect(get.mock.calls[0][1].params).toEqual({ ids: "5114,1", limit: 2 });
    expect(shows.map((s) => s.mal_id).sort((a, b) => a - b)).toEqual([1, 5114]);
  });

  it("does not call upstream for an empty or oversized batch", async () => {
    expect(await getAnimeByIds([])).toEqual([]);
    const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
    await expect(getAnimeByIds(tooMany)).rejects.toThrow("At most 100");
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects an error body", async () => {
    get.mockResolvedValueOnce(reply(notFoundBody));
    await expect(getAnimeByIds([1])).rejects.toThrow("Unexpected response from Tenrai");
  });
});

describe("getAnimeById", () => {
  it("returns the full record", async () => {
    get.mockResolvedValueOnce(reply(fmab));
    const result = await getAnimeById(5114);
    expect(get).toHaveBeenCalledWith("/anime/5114/full");
    expect(result.data.title).toBe("Fullmetal Alchemist: Brotherhood");
  });

  it("treats Tenrai's 404 as not found", async () => {
    get.mockRejectedValueOnce(notFoundError());
    const error = await getAnimeById(99999999).catch((e) => e);
    expect(isJikanNotFound(error)).toBe(true);
    expect(error.response.data.type).toBe("ResourceNotFoundException");
  });

  it("does not cache a body without data", async () => {
    get.mockResolvedValueOnce(reply({ data: null })).mockResolvedValueOnce(reply(fmab));
    await expect(getAnimeById(5114)).rejects.toThrow("Unexpected response");
    expect((await getAnimeById(5114)).data.mal_id).toBe(5114);
  });
});

describe("getTopByGenre", () => {
  it("maps the genre list to recommendation candidates", async () => {
    get.mockResolvedValueOnce(reply(genreAction));
    const candidates = await getTopByGenre(1);

    expect(get).toHaveBeenCalledWith("/anime", {
      params: { genres: 1, order_by: "score", sort: "desc", limit: 25, sfw: true },
    });
    expect(candidates).toHaveLength(genreAction.data.length);
    expect(candidates[0]).toEqual({
      mal_id: 5114,
      title: "Fullmetal Alchemist: Brotherhood",
      image: genreAction.data[0].images.webp.large_image_url,
      score: genreAction.data[0].score,
      genres: genreAction.data[0].genres.map((g) => g.name),
    });
    expect(candidates.every((c) => c.image.startsWith("https://cdn.myanimelist.net/"))).toBe(true);
  });

  it("falls back to the default title when the English one is null", async () => {
    const spy = batch.data.find((a) => a.mal_id === 50265)!;
    expect(spy.title_english).toBeNull();
    get.mockResolvedValueOnce(reply({ ...batch, data: [spy] }));
    const [candidate] = await getTopByGenre(4);
    expect(candidate.title).toBe("Spy x Family");
  });

  it("does not cache an empty or failed list", async () => {
    get
      .mockResolvedValueOnce(reply({ data: [] }))
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(reply(genreAction));

    expect(await getTopByGenre(1)).toEqual([]);
    await expect(getTopByGenre(1)).rejects.toThrow("down");
    expect(await getTopByGenre(1)).toHaveLength(genreAction.data.length);
    expect(await getTopByGenre(1)).toHaveLength(genreAction.data.length);
    expect(get).toHaveBeenCalledTimes(3);
  });
});

describe("getTopAnime", () => {
  it("does not cache an empty page", async () => {
    const empty = { data: [], pagination: { last_visible_page: 1539, has_next_page: false } };
    get.mockResolvedValueOnce(reply(empty)).mockResolvedValueOnce(reply(genreAction));

    expect((await getTopAnime(9999)).data).toEqual([]);
    expect((await getTopAnime(9999)).data).toHaveLength(5);
    expect((await getTopAnime(9999)).data).toHaveLength(5);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith("/top/anime", {
      params: { page: 9999, limit: 20, filter: "bypopularity", sfw: true },
    });
  });
});

describe("relations and characters", () => {
  it("keeps only anime relations", async () => {
    expect(relations.data.some((g) => g.entry.some((e) => e.type === "manga"))).toBe(true);
    get.mockResolvedValueOnce(reply(relations));
    const result = await getAnimeRelations(5114);

    expect(result.data.map((g) => g.relation)).toEqual([
      "Side Story",
      "Spin-Off",
      "Alternative Version",
    ]);
    expect(result.data.flatMap((g) => g.entry).every((e) => e.type === "anime")).toBe(true);
  });

  it("keeps entries without a type", () => {
    expect(
      animeRelationsOnly([{ relation: "Sequel", entry: [{ mal_id: 2, name: "Two" }] }]),
    ).toEqual([{ relation: "Sequel", entry: [{ mal_id: 2, name: "Two" }] }]);
  });

  it("stores only the character slice the page shows", async () => {
    get.mockResolvedValueOnce(reply(characters));
    const result = await getAnimeCharacterPreview(5114, 12);
    expect(result.data).toHaveLength(12);
    expect(result.data[0].character.name).toBe("Elric, Alphonse");
    expect(result.data[0].voice_actors[0].person.name).toBe("Kugimiya, Rie");
  });
});

describe("searchAnime", () => {
  it("normalises the query and asks for 20 per page", async () => {
    get.mockResolvedValueOnce(reply({ data: [], pagination: {} }));
    await searchAnime("  Frieren  ", 1);
    expect(get).toHaveBeenCalledWith("/anime", {
      params: { q: "frieren", page: 1, limit: 20, sfw: true },
    });
  });
});
