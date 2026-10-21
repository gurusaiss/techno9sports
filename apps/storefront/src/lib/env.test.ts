import { describe, expect, it } from "vitest"
import { env } from "./env"

describe("env", () => {
  it("has sensible local defaults", () => {
    expect(env.medusaUrl).toMatch(/^https?:\/\//)
  })
})
