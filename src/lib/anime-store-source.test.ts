import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import batch from "@/lib/fixtures/tenrai/batch-16-search-ids.json";
import malFmab from "@/lib/fixtures/mal/details-5114-finished.json";
import malFrieren from "@/lib/fixtures/mal/details-52991-finished.json";
import malNotFound from "@/lib/fixtures/mal/error-not-found.json";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  transaction: vi.fn(),
  tenraiGet: vi.fn(),
  malGet: vi.fn(),
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
vi.mock("next/cache", () => ({
  unstable_cache:
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    (...args: A) =>
      fn(...args),
}));
vi.mock("@/lib/axios", () => ({ jikanApi: { get: mocks.tenraiGet } }));
vi.mock("@/lib/mal-axios", () => ({ malApi: { get: mocks.malGet } }));

const CLIENT_ID = "test-client-id-0000";
const now = new Date("2026-11-15T12:00:00Z");

function httpError(status: number, data: unknown = malNotFound) {
  const config = { headers: new AxiosHeaders() };
  const response = { data, status, statusText: "", headers: {}, config } as AxiosResponse;
  return new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response);
}

function refused() {
  return new AxiosError("connect ECONNREFUSED", "ECONNREFUSED", {
    headers: new AxiosHeaders(),
  });
}

const MAL_SHOWS: Record<number, unknown> = { 5114: malFmab, 52991: malFrieren };

// v2 answers each id on its own path; ids not listed here are not found.
function malById(failing: number[] = []) {
  return async (path: string) => {
    const id = Number(path.split("/").pop());
    if (failing.includes(id)) throw httpError(503, {});
    if (MAL_SHOWS[id]) return { data: MAL_SHOWS[id] };
    throw httpError(404);
  };
}

function malIdsAsked() {
  return mocks.malGet.mock.calls.map(([path]) => Number(String(path).split("/").pop()));
}

async function loadStore(env: { clientId?: string; source?: string }) {
  vi.stubEnv("MAL_CLIENT_ID", env.clientId ?? "");
  vi.stubEnv("SHOW_DATA_SOURCE", env.source ?? "");
  vi.resetModules();
  return import("@/lib/anime-store");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.findMany.mockResolvedValue([]);
  mocks.findUnique.mockResolvedValue(null);
  mocks.upsert.mockImplementation(async ({ create }) => create);
  mocks.transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const IDS = Array.from({ length: 30 }, (_, i) => i + 1);

describe("ensureShows with v2 as the fallback", () => {
  it("refreshes from one Tenrai batch while Tenrai answers", async () => {
    const { ensureShows } = await loadStore({ clientId: CLIENT_ID });
    mocks.tenraiGet.mockResolvedValueOnce({ data: batch });

    await ensureShows(IDS);
    expect(mocks.tenraiGet).toHaveBeenCalledTimes(1);
    expect(mocks.tenraiGet.mock.calls[0][1].params.limit).toBe(25);
    expect(mocks.malGet).not.toHaveBeenCalled();
  });

  it("pauses on the first Tenrai failure, then refreshes up to 6 shows from v2", async () => {
    const { ensureShows, OUTAGE_COOLDOWN_MS } = await loadStore({ clientId: CLIENT_ID });
    mocks.tenraiGet.mockRejectedValue(refused());
    mocks.malGet.mockImplementation(malById());

    await ensureShows([5114, 52991, ...IDS]);
    expect(mocks.malGet).not.toHaveBeenCalled();

    vi.advanceTimersByTime(OUTAGE_COOLDOWN_MS);
    const shows = await ensureShows([5114, 52991, ...IDS]);
    expect(malIdsAsked()).toEqual([5114, 52991, 1, 2, 3, 4]);
    expect(shows.get(5114)?.title).toBe("Fullmetal Alchemist: Brotherhood");
    expect(shows.get(52991)?.title).toBe("Sousou no Frieren");
  });

  it("remembers ids v2 does not know", async () => {
    const { ensureShows } = await loadStore({ clientId: CLIENT_ID, source: "mal" });
    mocks.malGet.mockImplementation(malById());

    await ensureShows([5114, 99999999]);
    mocks.findMany.mockResolvedValue([]);
    mocks.malGet.mockClear();
    await ensureShows([99999999]);
    expect(mocks.malGet).not.toHaveBeenCalled();
  });

  it("never takes a v2 failure for a missing show", async () => {
    const { ensureShows, OUTAGE_COOLDOWN_MS } = await loadStore({
      clientId: CLIENT_ID,
      source: "mal",
    });
    mocks.malGet.mockImplementation(malById([52991]));

    const shows = await ensureShows([5114, 52991]);
    expect(shows.size).toBe(0);
    expect(mocks.transaction).not.toHaveBeenCalled();

    mocks.malGet.mockClear();
    await ensureShows([52991]);
    expect(mocks.malGet).not.toHaveBeenCalled();

    vi.advanceTimersByTime(OUTAGE_COOLDOWN_MS);
    mocks.malGet.mockImplementation(malById());
    expect((await ensureShows([52991])).get(52991)?.title).toBe("Sousou no Frieren");
  });

  it("asks v2 for at most 6 shows and never Tenrai when forced to v2", async () => {
    const { ensureShows } = await loadStore({ clientId: CLIENT_ID, source: "mal" });
    mocks.malGet.mockImplementation(malById());

    await ensureShows(IDS);
    expect(mocks.malGet).toHaveBeenCalledTimes(6);
    expect(mocks.tenraiGet).not.toHaveBeenCalled();
  });

  it("asks for 25 from Tenrai and never v2 without a Client ID", async () => {
    const { ensureShows } = await loadStore({ source: "mal" });
    mocks.tenraiGet.mockRejectedValue(refused());

    await ensureShows(IDS);
    expect(mocks.tenraiGet.mock.calls[0][1].params.limit).toBe(25);
    expect(mocks.malGet).not.toHaveBeenCalled();
  });
});

describe("storeShow with v2 as the fallback", () => {
  it("stores a show from v2 when Tenrai is down", async () => {
    const { storeShow } = await loadStore({ clientId: CLIENT_ID });
    mocks.tenraiGet.mockRejectedValue(refused());
    mocks.malGet.mockImplementation(malById());

    const show = await storeShow(5114);
    expect(show?.title).toBe("Fullmetal Alchemist: Brotherhood");
    expect(show?.status).toBe("Finished Airing");
  });

  it("remembers a v2 404", async () => {
    const { storeShow } = await loadStore({ clientId: CLIENT_ID, source: "mal" });
    mocks.malGet.mockImplementation(malById());

    expect(await storeShow(99999999)).toBeNull();
    expect(await storeShow(99999999)).toBeNull();
    expect(mocks.malGet).toHaveBeenCalledTimes(1);
  });

  it("starts the outage pause on a v2 failure instead of remembering a 404", async () => {
    const { storeShow, OUTAGE_COOLDOWN_MS } = await loadStore({
      clientId: CLIENT_ID,
      source: "mal",
    });
    mocks.malGet.mockImplementation(malById([5114]));

    expect(await storeShow(5114)).toBeNull();
    expect(await storeShow(5114)).toBeNull();
    expect(mocks.malGet).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(OUTAGE_COOLDOWN_MS);
    mocks.malGet.mockImplementation(malById());
    expect((await storeShow(5114))?.title).toBe("Fullmetal Alchemist: Brotherhood");
  });
});
