import { describe, expect, it, vi } from "vitest"
import { NETWORK_ERROR_MESSAGE, requestJson } from "@/lib/fetch-json"

describe("requestJson", () => {
  it("returns data for an OK JSON response", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ username: "bob" }))
    expect(await requestJson("/x", {}, "Failed.", fetchImpl)).toEqual({
      ok: true,
      data: { username: "bob" },
    })
    expect(fetchImpl).toHaveBeenCalledWith("/x", {})
  })

  it("returns the server's error message", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ error: "Username already taken." }, { status: 409 }),
    )
    expect(await requestJson("/x", {}, "Failed.", fetchImpl)).toEqual({
      ok: false,
      error: "Username already taken.",
    })
  })

  it("falls back when the error body is empty or not JSON", async () => {
    const empty = vi.fn(async () => new Response(null, { status: 405 }))
    expect(await requestJson("/x", {}, "Failed.", empty)).toEqual({
      ok: false,
      error: "Failed.",
    })
    const html = vi.fn(
      async () => new Response("<html>oops</html>", { status: 500 }),
    )
    expect(await requestJson("/x", {}, "Failed.", html)).toEqual({
      ok: false,
      error: "Failed.",
    })
  })

  it("treats an OK response without a JSON body as success", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }))
    expect(await requestJson("/x", {}, "Failed.", fetchImpl)).toEqual({
      ok: true,
      data: {},
    })
  })

  it("reports network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    })
    expect(await requestJson("/x", {}, "Failed.", fetchImpl)).toEqual({
      ok: false,
      error: NETWORK_ERROR_MESSAGE,
    })
  })
})
