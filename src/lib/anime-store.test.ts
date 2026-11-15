import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import batch from "@/lib/fixtures/tenrai/batch-16-search-ids.json";
import fmab from "@/lib/fixtures/tenrai/fmab-5114-full.json";
import type { StoredShow } from "@/lib/anime-shape";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  transaction: vi.fn(),
  getAnimeById: vi.fn(),
  getAnimeByIds: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    anime: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/jikan", async () => {
  const { isAxiosError } = await import("axios");
  return {
    getAnimeById: mocks.getAnimeById,
    getAnimeByIds: mocks.getAnimeByIds,
    isJikanNotFound: (error: unknown) =>
      isAxiosError(error) && error.response?.status === 404,
  };
});

const now = new Date("2026-11-15T12:00:00Z");

function stored(id: number, fetchedAt: Date, status = "Currently Airing"): StoredShow {
  return {
    id,
    title: `Show ${id}`,
    titleEnglish: null,
    titleJapanese: null,
    imageUrl: null,
    episodes: null,
    genres: [],
    score: null,
    status,
    durationMinutes: null,
    season: null,
    year: null,
    fetchedAt,
  };
}

function httpError(status: number) {
  const config = { headers: new AxiosHeaders() };
  const response = { data: {}, status, statusText: "", headers: {}, config } as AxiosResponse;
  return new AxiosError("failed", "ERR_BAD_RESPONSE", config, null, response);
}

async function loadStore() {
  vi.resetModules();
  return import("@/lib/anime-store");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.findMany.mockResolvedValue([]);
  mocks.upsert.mockImplementation(async ({ create }) => create);
  mocks.transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ensureShows", () => {
  it("fetches missing shows in one batch and matches them by id", async () => {
    const { ensureShows } = await loadStore();
    const ids = [52991, 5114, 50265, 1];
    mocks.getAnimeByIds.mockResolvedValueOnce(
      batch.data.filter((a) => ids.includes(a.mal_id)),
    );

    const shows = await ensureShows(ids);

    expect(mocks.getAnimeByIds).toHaveBeenCalledTimes(1);
    expect(mocks.getAnimeByIds).toHaveBeenCalledWith(ids);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(shows.get(52991)?.title).toBe("Sousou no Frieren");
    expect(shows.get(5114)?.title).toBe("Fullmetal Alchemist: Brotherhood");
    expect(shows.get(50265)?.titleEnglish).toBeNull();
    expect(shows.get(1)?.title).toBe("Cowboy Bebop");
  });

  it("asks for at most 25 shows per request, missing ones first", async () => {
    const { ensureShows } = await loadStore();
    const ids = Array.from({ length: 40 }, (_, i) => i + 1);
    mocks.getAnimeByIds.mockResolvedValueOnce([]);

    await ensureShows(ids);
    expect(mocks.getAnimeByIds.mock.calls[0][0]).toEqual(ids.slice(0, 25));
  });

  it("remembers ids the batch did not return", async () => {
    const { ensureShows } = await loadStore();
    const frieren = batch.data.find((a) => a.mal_id === 52991)!;
    mocks.getAnimeByIds.mockResolvedValue([frieren]);

    await ensureShows([52991, 99999999]);
    mocks.findMany.mockResolvedValueOnce([stored(52991, now)]);
    await ensureShows([52991, 99999999]);

    expect(mocks.getAnimeByIds).toHaveBeenCalledTimes(1);
  });

  it("keeps stored rows and skips upstream for a minute after a failure", async () => {
    const { ensureShows, OUTAGE_COOLDOWN_MS } = await loadStore();
    const old = stored(5114, new Date(now.getTime() - 48 * 60 * 60 * 1000));
    mocks.findMany.mockResolvedValue([old]);
    mocks.getAnimeByIds.mockRejectedValueOnce(httpError(503));

    expect((await ensureShows([5114])).get(5114)).toBe(old);
    expect((await ensureShows([5114])).get(5114)).toBe(old);
    expect(mocks.getAnimeByIds).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(OUTAGE_COOLDOWN_MS);
    mocks.getAnimeByIds.mockResolvedValueOnce(batch.data.filter((a) => a.mal_id === 5114));
    expect((await ensureShows([5114])).get(5114)?.title).toBe(
      "Fullmetal Alchemist: Brotherhood",
    );
    expect(mocks.getAnimeByIds).toHaveBeenCalledTimes(2);
  });

  it("returns stored rows when saving fails", async () => {
    const { ensureShows } = await loadStore();
    const old = stored(5114, new Date(now.getTime() - 48 * 60 * 60 * 1000));
    mocks.findMany.mockResolvedValue([old]);
    mocks.getAnimeByIds.mockResolvedValueOnce(batch.data.filter((a) => a.mal_id === 5114));
    mocks.transaction.mockRejectedValueOnce(new Error("db down"));

    expect((await ensureShows([5114])).get(5114)).toBe(old);
  });

  it("makes no request when every show is fresh", async () => {
    const { ensureShows } = await loadStore();
    mocks.findMany.mockResolvedValue([stored(1, now)]);
    await ensureShows([1]);
    expect(mocks.getAnimeByIds).not.toHaveBeenCalled();
  });
});

describe("storeShow", () => {
  it("stores the show from the full record", async () => {
    const { storeShow } = await loadStore();
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.getAnimeById.mockResolvedValueOnce(fmab);

    const show = await storeShow(5114);
    expect(show?.title).toBe("Fullmetal Alchemist: Brotherhood");
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  it("does not wait on upstream right after an outage", async () => {
    const { ensureShows, storeShow } = await loadStore();
    mocks.getAnimeByIds.mockRejectedValueOnce(httpError(503));
    await ensureShows([5114]);

    mocks.findUnique.mockResolvedValueOnce(null);
    expect(await storeShow(5114)).toBeNull();
    expect(mocks.getAnimeById).not.toHaveBeenCalled();
  });

  it("remembers a 404 without starting the outage pause", async () => {
    const { ensureShows, storeShow } = await loadStore();
    mocks.findUnique.mockResolvedValue(null);
    mocks.getAnimeById.mockRejectedValueOnce(httpError(404));

    expect(await storeShow(99999999)).toBeNull();
    expect(await storeShow(99999999)).toBeNull();
    expect(mocks.getAnimeById).toHaveBeenCalledTimes(1);

    mocks.getAnimeByIds.mockResolvedValueOnce([]);
    await ensureShows([5114]);
    expect(mocks.getAnimeByIds).toHaveBeenCalledTimes(1);
  });
});
