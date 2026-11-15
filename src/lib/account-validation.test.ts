import { describe, expect, it } from "vitest"
import {
  canUnlinkDiscord,
  normalizeEmail,
  normalizeLogin,
  passwordByteLength,
  pickLoginMatch,
  sameIdentifier,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/account-validation"

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Alice@Example.COM \n")).toBe("alice@example.com")
  })

  it("returns an empty string for non-strings", () => {
    expect(normalizeEmail(undefined)).toBe("")
    expect(normalizeEmail(42)).toBe("")
    expect(normalizeEmail(null)).toBe("")
  })
})

describe("validateEmail", () => {
  it.each([
    "a@b.co",
    "alice@example.com",
    "first.last+tag@sub.example.org",
    "user_name@my-domain.io",
  ])("accepts %s", (email) => {
    expect(validateEmail(email)).toEqual({ ok: true, value: email })
  })

  it("returns the normalised value", () => {
    expect(validateEmail("  Bob@Example.Com ")).toEqual({
      ok: true,
      value: "bob@example.com",
    })
  })

  it.each([
    "plainaddress",
    "@example.com",
    "alice@",
    "alice@example",
    "alice@@example.com",
    "alice@example..com",
    "alice@.example.com",
    "alice@example.com.",
    "al ice@example.com",
    "alice@exa mple.com",
  ])("rejects %s", (email) => {
    expect(validateEmail(email)).toEqual({
      ok: false,
      error: "Enter a valid email address.",
    })
  })

  it("rejects missing, empty and whitespace-only input", () => {
    for (const input of [undefined, null, "", "   ", 5, {}]) {
      expect(validateEmail(input)).toEqual({
        ok: false,
        error: "Email is required.",
      })
    }
  })

  it("allows exactly 254 characters and rejects 255", () => {
    const domain = "@example.com"
    const at254 = "a".repeat(254 - domain.length) + domain
    const at255 = "a".repeat(255 - domain.length) + domain
    expect(at254).toHaveLength(254)
    expect(validateEmail(at254).ok).toBe(true)
    expect(validateEmail(at255)).toEqual({
      ok: false,
      error: "Email must be 254 characters or fewer.",
    })
  })

  it("checks length after trimming", () => {
    const domain = "@example.com"
    const at254 = "a".repeat(254 - domain.length) + domain
    expect(validateEmail(`   ${at254}   `).ok).toBe(true)
  })
})

describe("validateUsername", () => {
  it.each(["abc", "Alice_99", "___", "a".repeat(20), "UPPER", "123"])(
    "accepts %s",
    (username) => {
      expect(validateUsername(username)).toEqual({ ok: true, value: username })
    },
  )

  it("trims but keeps case", () => {
    expect(validateUsername("  Alice_1  ")).toEqual({
      ok: true,
      value: "Alice_1",
    })
  })

  it("rejects missing and blank input", () => {
    for (const input of [undefined, null, "", "    ", 7]) {
      expect(validateUsername(input)).toEqual({
        ok: false,
        error: "Username is required.",
      })
    }
  })

  it("enforces 3 to 20 characters after trimming", () => {
    const lengthError = {
      ok: false,
      error: "Username must be 3 to 20 characters.",
    }
    expect(validateUsername("ab")).toEqual(lengthError)
    expect(validateUsername("  ab  ")).toEqual(lengthError)
    expect(validateUsername("a".repeat(21))).toEqual(lengthError)
  })

  it.each([
    "alice@example.com",
    "bob@x.io",
    "has space",
    "dash-name",
    "dot.name",
    "café",
    "名前名前",
    "tab\tname",
  ])("rejects %s", (username) => {
    expect(validateUsername(username)).toEqual({
      ok: false,
      error: "Username can only contain letters, numbers and underscores.",
    })
  })

  it("never accepts something that passes as an email", () => {
    const email = "a@b.co"
    expect(validateEmail(email).ok).toBe(true)
    expect(validateUsername(email).ok).toBe(false)
  })
})

describe("passwordByteLength", () => {
  it("counts UTF-8 bytes", () => {
    expect(passwordByteLength("abc")).toBe(3)
    expect(passwordByteLength("é")).toBe(2)
    expect(passwordByteLength("漢")).toBe(3)
    expect(passwordByteLength("\u{1F600}")).toBe(4)
  })
})

describe("validatePassword", () => {
  it("accepts 8 characters and 72 ASCII bytes", () => {
    expect(validatePassword("12345678").ok).toBe(true)
    expect(validatePassword("a".repeat(72)).ok).toBe(true)
  })

  it("does not trim", () => {
    expect(validatePassword("  pass word  ")).toEqual({
      ok: true,
      value: "  pass word  ",
    })
  })

  it("rejects missing and empty input", () => {
    for (const input of [undefined, null, "", 12345678]) {
      expect(validatePassword(input)).toEqual({
        ok: false,
        error: "Password is required.",
      })
    }
  })

  it("rejects fewer than 8 characters", () => {
    expect(validatePassword("1234567")).toEqual({
      ok: false,
      error: "Password must be at least 8 characters.",
    })
  })

  it("counts characters, not UTF-16 units, for the minimum", () => {
    // 4 emoji are 8 UTF-16 units but only 4 characters
    expect(validatePassword("\u{1F600}".repeat(4)).ok).toBe(false)
    expect(validatePassword("\u{1F600}".repeat(8)).ok).toBe(true)
  })

  it("rejects more than 72 ASCII bytes", () => {
    const result = validatePassword("a".repeat(73))
    expect(result.ok).toBe(false)
  })

  it("rejects multi-byte passwords over 72 bytes even when under 72 characters", () => {
    const twoByte = "é".repeat(36)
    expect(twoByte).toHaveLength(36)
    expect(passwordByteLength(twoByte)).toBe(72)
    expect(validatePassword(twoByte).ok).toBe(true)

    const tooLong = "é".repeat(37)
    expect(passwordByteLength(tooLong)).toBe(74)
    expect(validatePassword(tooLong).ok).toBe(false)

    const emoji = "\u{1F600}".repeat(19)
    expect(passwordByteLength(emoji)).toBe(76)
    expect(validatePassword(emoji).ok).toBe(false)
    expect(validatePassword("\u{1F600}".repeat(18)).ok).toBe(true)
  })
})

describe("normalizeLogin", () => {
  it("trims without changing case", () => {
    expect(normalizeLogin("  Alice@Example.com ")).toBe("Alice@Example.com")
    expect(normalizeLogin(undefined)).toBe("")
  })
})

describe("sameIdentifier", () => {
  it("compares ignoring case", () => {
    expect(sameIdentifier("Alice", "alice")).toBe(true)
    expect(sameIdentifier("alice", "bob")).toBe(false)
  })

  it("is false when either side is missing", () => {
    expect(sameIdentifier(null, "a")).toBe(false)
    expect(sameIdentifier("a", undefined)).toBe(false)
    expect(sameIdentifier("", "")).toBe(false)
  })
})

describe("pickLoginMatch", () => {
  const emailOwner = { id: "1", email: "bob@x.io", username: "bob" }
  const squatter = { id: "2", email: "other@x.io", username: "bob@x.io" }

  it("prefers an email match over a username match", () => {
    expect(pickLoginMatch([squatter, emailOwner], "bob@x.io")).toBe(emailOwner)
    expect(pickLoginMatch([squatter, emailOwner], "BOB@X.IO")).toBe(emailOwner)
  })

  it("matches a mixed-case stored email ignoring case", () => {
    const legacy = { id: "3", email: "Carol@Example.com", username: null }
    expect(pickLoginMatch([legacy], "carol@example.com")).toBe(legacy)
  })

  it("matches a username ignoring case", () => {
    expect(pickLoginMatch([emailOwner], "BOB")).toBe(emailOwner)
  })

  it("prefers an exact match over a case-insensitive one", () => {
    const upper = { id: "4", email: null, username: "Dave" }
    const lower = { id: "5", email: null, username: "dave" }
    expect(pickLoginMatch([upper, lower], "dave")).toBe(lower)
    expect(pickLoginMatch([lower, upper], "Dave")).toBe(upper)
  })

  it("ignores rows that do not actually match", () => {
    const near = { id: "6", email: null, username: "a_b" }
    expect(pickLoginMatch([near], "axb")).toBeNull()
  })

  it("returns null for an empty login or no users", () => {
    expect(pickLoginMatch([emailOwner], "")).toBeNull()
    expect(pickLoginMatch([], "bob")).toBeNull()
  })
})

describe("canUnlinkDiscord", () => {
  it("needs a password and a way to sign in", () => {
    expect(
      canUnlinkDiscord({ hasPassword: true, username: "bob", email: null }),
    ).toBe(true)
    expect(
      canUnlinkDiscord({ hasPassword: true, username: null, email: "b@x.io" }),
    ).toBe(true)
    expect(
      canUnlinkDiscord({ hasPassword: true, username: null, email: null }),
    ).toBe(false)
    expect(
      canUnlinkDiscord({ hasPassword: false, username: "bob", email: "b@x.io" }),
    ).toBe(false)
  })
})
