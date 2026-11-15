import { describe, expect, it } from "vitest";
import {
  parseAnimeId,
  parseEntryUpdate,
  parseListName,
  parseNewEntry,
} from "@/lib/entry-validation";

describe("parseAnimeId", () => {
  it("accepts positive integers", () => {
    expect(parseAnimeId(5114)).toEqual({ ok: true, data: 5114 });
  });

  it.each([0, -1, 1.5, "5114", null, undefined, NaN, 2 ** 31])(
    "rejects %s",
    (value) => {
      expect(parseAnimeId(value).ok).toBe(false);
    },
  );
});

describe("parseNewEntry", () => {
  it("accepts a valid entry", () => {
    expect(parseNewEntry({ animeId: 1, status: "watching" })).toEqual({
      ok: true,
      data: { animeId: 1, status: "watching" },
    });
  });

  it("drops extra fields", () => {
    const result = parseNewEntry({ animeId: 1, status: "dropped", userId: "x" });
    expect(result).toEqual({ ok: true, data: { animeId: 1, status: "dropped" } });
  });

  it("rejects unknown statuses and bad ids", () => {
    expect(parseNewEntry({ animeId: 1, status: "rewatching" }).ok).toBe(false);
    expect(parseNewEntry({ animeId: "1", status: "watching" }).ok).toBe(false);
    expect(parseNewEntry({ status: "watching" }).ok).toBe(false);
    expect(parseNewEntry(null).ok).toBe(false);
    expect(parseNewEntry([1, "watching"]).ok).toBe(false);
  });
});

describe("parseEntryUpdate", () => {
  it("accepts the allowed fields", () => {
    expect(
      parseEntryUpdate({ status: "completed", episodes: 12, rating: 8 }, 12),
    ).toEqual({
      ok: true,
      data: { status: "completed", episodes: 12, rating: 8 },
    });
  });

  it("allows clearing the rating", () => {
    expect(parseEntryUpdate({ rating: null }, null)).toEqual({
      ok: true,
      data: { rating: null },
    });
  });

  it("rejects fields outside the allow-list", () => {
    expect(parseEntryUpdate({ userId: "someone-else" }, null).ok).toBe(false);
    expect(
      parseEntryUpdate({ rating: 5, review: { create: { title: "x" } } }, null).ok,
    ).toBe(false);
  });

  it("rejects an empty update", () => {
    expect(parseEntryUpdate({}, null).ok).toBe(false);
  });

  it("validates rating", () => {
    for (const rating of [0, 11, 999, 7.5, "8"]) {
      expect(parseEntryUpdate({ rating }, null).ok).toBe(false);
    }
    expect(parseEntryUpdate({ rating: 1 }, null).ok).toBe(true);
    expect(parseEntryUpdate({ rating: 10 }, null).ok).toBe(true);
  });

  it("validates episodes against the known total", () => {
    expect(parseEntryUpdate({ episodes: -1 }, null).ok).toBe(false);
    expect(parseEntryUpdate({ episodes: 2.5 }, null).ok).toBe(false);
    expect(parseEntryUpdate({ episodes: "3" }, null).ok).toBe(false);
    expect(parseEntryUpdate({ episodes: 13 }, 12).ok).toBe(false);
    expect(parseEntryUpdate({ episodes: 12 }, 12).ok).toBe(true);
    expect(parseEntryUpdate({ episodes: 0 }, 12).ok).toBe(true);
    expect(parseEntryUpdate({ episodes: 500 }, null).ok).toBe(true);
  });

  it("validates status", () => {
    expect(parseEntryUpdate({ status: "paused" }, null).ok).toBe(false);
    expect(parseEntryUpdate({ status: "plan_to_watch" }, null).ok).toBe(true);
  });
});

describe("parseListName", () => {
  it("trims the name", () => {
    expect(parseListName({ name: "  Favourites " })).toEqual({
      ok: true,
      data: "Favourites",
    });
  });

  it("rejects missing, blank and non-string names", () => {
    expect(parseListName({}).ok).toBe(false);
    expect(parseListName({ name: "   " }).ok).toBe(false);
    expect(parseListName({ name: 5 }).ok).toBe(false);
    expect(parseListName(null).ok).toBe(false);
  });

  it("allows 60 characters but not 61", () => {
    expect(parseListName({ name: "a".repeat(60) }).ok).toBe(true);
    expect(parseListName({ name: "a".repeat(61) }).ok).toBe(false);
    expect(parseListName({ name: ` ${"a".repeat(60)} ` }).ok).toBe(true);
  });
});
