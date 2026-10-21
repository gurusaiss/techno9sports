import { discountPercent, formatINR } from "../lib/format"

describe("format", () => {
  it("formats whole rupees without decimals, Indian grouping", () => {
    expect(formatINR(49900)).toBe("₹499")
    expect(formatINR(149900)).toBe("₹1,499")
    expect(formatINR(10000000)).toBe("₹1,00,000")
  })
  it("shows paise when present", () => {
    expect(formatINR(49950)).toBe("₹499.50")
  })
  it("computes discount percent and ignores non-discounts", () => {
    expect(discountPercent(49900, 99900)).toBe(50)
    expect(discountPercent(79900, 149900)).toBe(47)
    expect(discountPercent(49900, 49900)).toBe(0)
    expect(discountPercent(49900)).toBe(0)
    expect(discountPercent(59900, 49900)).toBe(0)
  })
})
