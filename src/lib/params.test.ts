import { describe, expect, it } from "vitest";
import {
  MAX_PAGE,
  getSearchQuery,
  normalizeSearchQuery,
  parseAnimeId,
  parsePage,
  parseTopFilter,
  uniqueByMalId,
} from "@/lib/params";

describe("parsePage", () => {
  it("accepts positive whole numbers", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("falls back to 1 for anything else", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("2abc")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
  });

  it("uses the first value when repeated and caps huge pages", () => {
    expect(parsePage(["4", "9"])).toBe(4);
    expect(parsePage("999999999")).toBe(MAX_PAGE);
  });
});

describe("parseTopFilter", () => {
  it("keeps known filters", () => {
    expect(parseTopFilter("airing")).toBe("airing");
  });

  it("falls back to popularity", () => {
    expect(parseTopFilter("banana")).toBe("bypopularity");
    expect(parseTopFilter(undefined)).toBe("bypopularity");
  });
});

describe("parseAnimeId", () => {
  it("accepts plain ids", () => {
    expect(parseAnimeId("21")).toBe(21);
  });

  it("rejects ids that parseInt would accept", () => {
    expect(parseAnimeId("12abc")).toBeNull();
    expect(parseAnimeId("012")).toBeNull();
    expect(parseAnimeId("0")).toBeNull();
    expect(parseAnimeId("1e3")).toBeNull();
    expect(parseAnimeId("99999999999")).toBeNull();
  });
});

describe("search query helpers", () => {
  it("trims the query from the URL", () => {
    expect(getSearchQuery("  naruto ")).toBe("naruto");
    expect(getSearchQuery(undefined)).toBe("");
  });

  it("normalises case and spacing for the cache key", () => {
    expect(normalizeSearchQuery("  One   PIECE ")).toBe("one piece");
  });

  it("limits the length", () => {
    expect(normalizeSearchQuery("a".repeat(500))).toHaveLength(100);
  });
});

describe("uniqueByMalId", () => {
  it("keeps the first copy of each show", () => {
    const items = [
      { mal_id: 1, title: "a" },
      { mal_id: 2, title: "b" },
      { mal_id: 1, title: "c" },
    ];
    expect(uniqueByMalId(items)).toEqual([
      { mal_id: 1, title: "a" },
      { mal_id: 2, title: "b" },
    ]);
  });
});
