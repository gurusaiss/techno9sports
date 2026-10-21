import { describe, expect, it } from "vitest"
import type { Paise } from "./index"

describe("types", () => {
  it("paise is a number", () => {
    const p: Paise = 29900
    expect(Number.isInteger(p)).toBe(true)
  })
})
