import { describe, expect, it } from "vitest";
import { backTarget, routeLabel } from "@/lib/back-route";

describe("routeLabel", () => {
  it("names a page by its path, ignoring the query", () => {
    expect(routeLabel("/top?filter=airing&page=2")).toBe("Top shows");
    expect(routeLabel("/search?q=frieren")).toBe("Search");
    expect(routeLabel("/")).toBe("Home");
    expect(routeLabel("/lists/abc123")).toBe("Collection");
  });

  it("returns nothing for unknown or missing routes", () => {
    expect(routeLabel(null)).toBeNull();
    expect(routeLabel("/auth/signin")).toBeNull();
    expect(routeLabel("/constructor")).toBeNull();
  });
});

describe("backTarget", () => {
  it("goes back in history when the previous page is the remembered one", () => {
    expect(backTarget("/top?page=2", "/top?page=2")).toEqual({ kind: "history" });
    expect(backTarget(null, "/anime/1")).toEqual({ kind: "history" });
  });

  it("opens the remembered page with its query after moving between shows", () => {
    expect(backTarget("/search?q=frieren&page=2", "/anime/52991")).toEqual({
      kind: "push",
      to: "/search?q=frieren&page=2",
    });
  });
});
