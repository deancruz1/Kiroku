import { describe, expect, it } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("drops falsy values", () => {
    expect(cn("px-2", false && "hidden", undefined, null)).toBe("px-2")
  })

  it("merges conflicting Tailwind classes", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4")
  })
})
