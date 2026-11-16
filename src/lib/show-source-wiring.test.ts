import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import tenraiSearch from "@/lib/fixtures/tenrai/search-frieren-p1.json";
import tenraiFmab from "@/lib/fixtures/tenrai/fmab-5114-full.json";
import tenraiTop from "@/lib/fixtures/tenrai/top-upcoming-p1.json";
import tenraiGenre from "@/lib/fixtures/tenrai/genre-action-by-score-sfw.json";
import tenraiRecommendations from "@/lib/fixtures/tenrai/fmab-5114-recommendations.json";
import tenraiVideos from "@/lib/fixtures/tenrai/fmab-5114-videos.json";
import tenraiRelations from "@/lib/fixtures/tenrai/fmab-5114-relations.json";
import tenraiCharacters from "@/lib/fixtures/tenrai/fmab-5114-characters.json";
import tenraiSeasonNow from "@/lib/fixtures/tenrai/season-now-p1.json";
import tenraiSeasonPage from "@/lib/fixtures/tenrai/season-2025-fall-p2.json";
import tenraiSeasons from "@/lib/fixtures/tenrai/seasons-list.json";
import tenraiNotFound from "@/lib/fixtures/tenrai/not-found-99999999.json";
import malSearch from "@/lib/fixtures/mal/search-frieren-p1.json";
import malFmab from "@/lib/fixtures/mal/details-5114-finished.json";
import malFmabVideos from "@/lib/fixtures/mal/details-5114-videos.json";
import malRankingAiring from "@/lib/fixtures/mal/ranking-airing-p1.json";
import malRankingAll from "@/lib/fixtures/mal/ranking-all-p1.json";
import malCharacters from "@/lib/fixtures/mal/characters-5114-p1.json";
import malFall2026 from "@/lib/fixtures/mal/season-2026-fall-limit-500-nsfw.json";

const { tenraiGet, malGet, store } = vi.hoisted(() => ({
  tenraiGet: vi.fn(),
  malGet: vi.fn(),
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
vi.mock("@/lib/axios", () => ({ jikanApi: { get: tenraiGet } }));
vi.mock("@/lib/mal-axios", () => ({ malApi: { get: malGet } }));

const CLIENT_ID = "test-client-id-0000";

function reply<T>(data: T) {
  return { data };
}

function refused() {
  return new AxiosError("connect ECONNREFUSED", "ECONNREFUSED", {
    headers: new AxiosHeaders(),
  });
}

function notFound() {
  const config = { headers: new AxiosHeaders() };
  const response = {
    data: tenraiNotFound,
    status: 404,
    statusText: "Not Found",
    headers: {},
    config,
  } as AxiosResponse;
  return new AxiosError("Not Found", "ERR_BAD_REQUEST", config, null, response);
}

const lastSeasonPage = {
  ...tenraiSeasonNow,
  pagination: { ...tenraiSeasonNow.pagination, has_next_page: false },
};

type Jikan = typeof import("@/lib/jikan");
type Season = typeof import("@/lib/season");
type Modules = { jikan: Jikan; season: Season };

interface Case {
  name: string;
  call: (m: Modules) => Promise<unknown>;
  tenrai: unknown;
  mal: unknown;
  // Reviews and season years come from no v2 request at all.
  malRequests?: boolean;
  // Lists and season results carry no source tag.
  check?: (result: unknown) => void;
}

const cases: Case[] = [
  {
    name: "searchAnime",
    call: ({ jikan }) => jikan.searchAnime("frieren"),
    tenrai: tenraiSearch,
    mal: malSearch,
  },
  {
    name: "getAnimeById",
    call: ({ jikan }) => jikan.getAnimeById(5114),
    tenrai: tenraiFmab,
    mal: malFmab,
  },
  {
    name: "getAnimeByIds",
    call: ({ jikan }) => jikan.getAnimeByIds([5114]),
    tenrai: { data: [tenraiFmab.data] },
    mal: malFmab,
    check: (result) => {
      expect((result as { mal_id: number }[]).map((a) => a.mal_id)).toEqual([5114]);
      expect(malGet).toHaveBeenCalledWith("/anime/5114", expect.anything());
    },
  },
  {
    name: "getTopAnime",
    call: ({ jikan }) => jikan.getTopAnime(1, "airing"),
    tenrai: tenraiTop,
    mal: malRankingAiring,
  },
  {
    name: "getTopByGenre",
    call: ({ jikan }) => jikan.getTopByGenre(1),
    tenrai: tenraiGenre,
    mal: malRankingAll,
    check: (result) => {
      expect(Array.isArray(result)).toBe(true);
      expect(malGet).toHaveBeenCalledWith("/anime/ranking", expect.anything());
    },
  },
  {
    name: "getAnimeRecommendations",
    call: ({ jikan }) => jikan.getAnimeRecommendations(5114),
    tenrai: tenraiRecommendations,
    mal: malFmab,
  },
  {
    name: "getAnimeVideos",
    call: ({ jikan }) => jikan.getAnimeVideos(5114),
    tenrai: tenraiVideos,
    mal: malFmabVideos,
  },
  {
    name: "getAnimeRelations",
    call: ({ jikan }) => jikan.getAnimeRelations(5114),
    tenrai: tenraiRelations,
    mal: malFmab,
  },
  {
    name: "getAnimeCharacterPreview",
    call: ({ jikan }) => jikan.getAnimeCharacterPreview(5114, 12),
    tenrai: tenraiCharacters,
    mal: malCharacters,
  },
  {
    name: "getAnimeReviews",
    call: ({ jikan }) => jikan.getAnimeReviews(5114),
    tenrai: { data: [], pagination: { last_visible_page: 1, has_next_page: false } },
    mal: null,
    malRequests: false,
  },
  {
    name: "getCalendarSeason",
    call: ({ season }) => season.getCalendarSeason(2026, "fall", true),
    tenrai: lastSeasonPage,
    mal: malFall2026,
    check: (result) => expect((result as { anime: unknown[] }).anime.length).toBeGreaterThan(100),
  },
  {
    name: "getArchiveSeasonPage",
    call: ({ season }) => season.getArchiveSeasonPage(2026, "fall", 1),
    tenrai: tenraiSeasonPage,
    mal: malFall2026,
    check: (result) => expect((result as { anime: unknown[] }).anime).toHaveLength(25),
  },
  {
    name: "getSeasonYears",
    call: ({ season }) => season.getSeasonYears(),
    tenrai: tenraiSeasons,
    mal: null,
    malRequests: false,
    check: (result) => expect((result as number[]).at(-1)).toBe(1917),
  },
];

async function load(env: { clientId?: string; source?: string }): Promise<Modules> {
  vi.stubEnv("MAL_CLIENT_ID", env.clientId ?? "");
  vi.stubEnv("SHOW_DATA_SOURCE", env.source ?? "");
  vi.resetModules();
  return { jikan: await import("@/lib/jikan"), season: await import("@/lib/season") };
}

function isFromMal(value: unknown) {
  return !!value && typeof value === "object" && "source" in value && value.source === "mal";
}

beforeEach(() => {
  tenraiGet.mockReset();
  malGet.mockReset();
  store.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe.each(cases)("$name", ({ call, tenrai, mal, malRequests = true, check }) => {
  it("uses only Tenrai while it answers", async () => {
    const m = await load({ clientId: CLIENT_ID });
    tenraiGet.mockResolvedValue(reply(tenrai));
    const result = await call(m);
    expect(tenraiGet).toHaveBeenCalled();
    expect(malGet).not.toHaveBeenCalled();
    expect(isFromMal(result)).toBe(false);
  });

  it("answers from v2 when Tenrai is down", async () => {
    const m = await load({ clientId: CLIENT_ID });
    tenraiGet.mockRejectedValue(refused());
    malGet.mockResolvedValue(reply(mal));
    const result = await call(m);
    expect(tenraiGet).toHaveBeenCalled();
    if (malRequests) expect(malGet).toHaveBeenCalled();
    if (check) check(result);
    else expect(isFromMal(result)).toBe(true);
  });

  it("does not fall back on a Tenrai 404", async () => {
    const m = await load({ clientId: CLIENT_ID });
    tenraiGet.mockRejectedValue(notFound());
    await expect(call(m)).rejects.toMatchObject({ response: { status: 404 } });
    expect(malGet).not.toHaveBeenCalled();
  });

  it("never calls Tenrai when forced to v2", async () => {
    const m = await load({ clientId: CLIENT_ID, source: "mal" });
    malGet.mockResolvedValue(reply(mal));
    await call(m);
    expect(tenraiGet).not.toHaveBeenCalled();
  });

  it("never calls v2 when forced to Tenrai", async () => {
    const m = await load({ clientId: CLIENT_ID, source: "tenrai" });
    tenraiGet.mockRejectedValue(refused());
    await expect(call(m)).rejects.toMatchObject({ code: "ECONNREFUSED" });
    expect(malGet).not.toHaveBeenCalled();
  });

  it("behaves as before without a Client ID", async () => {
    const m = await load({ source: "mal" });
    tenraiGet.mockResolvedValue(reply(tenrai));
    const ok = await call(m);
    expect(isFromMal(ok)).toBe(false);

    store.clear();
    tenraiGet.mockReset();
    tenraiGet.mockRejectedValue(refused());
    await expect(call(m)).rejects.toMatchObject({ code: "ECONNREFUSED" });
    expect(malGet).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });
});

describe("caches", () => {
  it("keeps Tenrai and v2 results under different keys", async () => {
    let m = await load({ clientId: CLIENT_ID, source: "tenrai" });
    tenraiGet.mockResolvedValue(reply(tenraiFmab));
    await m.jikan.getAnimeById(5114);

    m = await load({ clientId: CLIENT_ID, source: "mal" });
    malGet.mockResolvedValue(reply(malFmab));
    const fromV2 = await m.jikan.getAnimeById(5114);

    expect(malGet).toHaveBeenCalledTimes(1);
    expect(isFromMal(fromV2)).toBe(true);
    const keys = [...store.keys()];
    expect(keys.some((key) => key.startsWith("jikan,anime-full-"))).toBe(true);
    expect(keys.some((key) => key.startsWith("mal,anime-details-"))).toBe(true);
    expect(keys.every((key) => !key.includes(CLIENT_ID))).toBe(true);
  });

  it("keeps season entries apart too", async () => {
    let m = await load({ clientId: CLIENT_ID, source: "tenrai" });
    tenraiGet.mockResolvedValue(reply(lastSeasonPage));
    await m.season.getCalendarSeason(2026, "fall", true);
    m = await load({ clientId: CLIENT_ID, source: "mal" });
    malGet.mockResolvedValue(reply(malFall2026));
    await m.season.getCalendarSeason(2026, "fall", true);

    const keys = [...store.keys()];
    expect(keys.some((key) => key.startsWith("season-calendar,sfw-"))).toBe(true);
    expect(keys.some((key) => key.startsWith("mal,season-calendar,sfw-"))).toBe(true);
  });

  it("still serves a cached Tenrai entry while Tenrai is down", async () => {
    const m = await load({ clientId: CLIENT_ID });
    tenraiGet.mockResolvedValueOnce(reply(tenraiFmab));
    await m.jikan.getAnimeById(5114);

    tenraiGet.mockRejectedValue(refused());
    malGet.mockResolvedValue(reply(malFmab));
    await m.jikan.getAnimeRelations(5114);
    expect(malGet).toHaveBeenCalledTimes(1);

    const show = await m.jikan.getAnimeById(5114);
    expect(isFromMal(show)).toBe(false);
    expect(malGet).toHaveBeenCalledTimes(1);
  });

  it("does not serve v2 results once Tenrai has answered a probe", async () => {
    vi.useFakeTimers();
    try {
      const m = await load({ clientId: CLIENT_ID });
      const { tenraiBreaker, BREAKER_COOLDOWN_MS } = await import("@/lib/show-source");
      tenraiGet.mockRejectedValue(refused());
      malGet.mockResolvedValue(reply(malFmab));
      expect(isFromMal(await m.jikan.getAnimeById(5114))).toBe(true);

      vi.advanceTimersByTime(BREAKER_COOLDOWN_MS);
      // The real client closes the breaker when a probe succeeds.
      tenraiBreaker.admit();
      tenraiBreaker.succeed(true);
      tenraiGet.mockReset();
      tenraiGet.mockResolvedValue(reply(tenraiFmab));
      expect(isFromMal(await m.jikan.getAnimeById(5114))).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("getAnimeByIds on v2", () => {
  it("does not fall back for more ids than one v2 refresh may ask for", async () => {
    const m = await load({ clientId: CLIENT_ID });
    const error = refused();
    tenraiGet.mockRejectedValue(error);
    await expect(m.jikan.getAnimeByIds([1, 2, 3, 4, 5, 6, 7])).rejects.toBe(error);
    expect(malGet).not.toHaveBeenCalled();
  });
});
