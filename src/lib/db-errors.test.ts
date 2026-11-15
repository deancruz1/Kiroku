import { describe, expect, it } from "vitest"
import { isUniqueViolation } from "@/lib/db-errors"

describe("isUniqueViolation", () => {
  it("detects Prisma's P2002 code", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true)
    const err = Object.assign(new Error("Unique constraint"), { code: "P2002" })
    expect(isUniqueViolation(err)).toBe(true)
  })

  it("ignores other errors", () => {
    expect(isUniqueViolation({ code: "P2025" })).toBe(false)
    expect(isUniqueViolation(new Error("boom"))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation("P2002")).toBe(false)
  })
})
