import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "@/lib/auth-errors";

describe("signInErrorMessage", () => {
  it("returns nothing without an error", () => {
    expect(signInErrorMessage(null)).toBeNull();
    expect(signInErrorMessage("")).toBeNull();
  });

  it("explains a Discord account linked to someone else", () => {
    expect(signInErrorMessage("OAuthAccountNotLinked")).toMatch(
      /already linked to a different Kiroku account/,
    );
  });

  it("falls back to a general message for unknown errors", () => {
    expect(signInErrorMessage("Banana")).toBe("Sign in failed. Please try again.");
    expect(signInErrorMessage("toString")).toBe("Sign in failed. Please try again.");
  });
});
