import { describe, expect, it } from "vitest"
import { readJsonBody } from "@/lib/request-body"

describe("readJsonBody", () => {
  function post(body?: string) {
    return new Request("http://localhost/api", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    })
  }

  it("returns a parsed object", async () => {
    expect(await readJsonBody(post('{"a":1}'))).toEqual({ a: 1 })
  })

  it("returns null for malformed, missing or non-object bodies", async () => {
    expect(await readJsonBody(post("{not json"))).toBeNull()
    expect(await readJsonBody(post())).toBeNull()
    expect(await readJsonBody(post(""))).toBeNull()
    expect(await readJsonBody(post("null"))).toBeNull()
    expect(await readJsonBody(post("[1,2]"))).toBeNull()
    expect(await readJsonBody(post('"text"'))).toBeNull()
  })
})
