import { isLive, parseBlockData } from "../content-blocks"

const img = { url: "http://localhost:9000/static/a.webp", alt: "x" }

describe("content block validation", () => {
  it("accepts a valid hero and fills defaults", () => {
    const r = parseBlockData("hero_carousel", {
      slides: [
        { heading: "Gear up", primary_cta: { label: "Shop", href: "/men" }, image_desktop: img },
      ],
    })
    expect(r.success).toBe(true)
    if (r.success) expect((r.data as any).slides[0].tone).toBe("mist")
  })

  it("rejects unsafe links", () => {
    for (const href of ["javascript:alert(1)", "//evil.com", "http://plain.com", "men"]) {
      const r = parseBlockData("promo_banner", { heading: "x", cta: { label: "go", href } })
      expect(r.success).toBe(false)
    }
    expect(
      parseBlockData("promo_banner", { heading: "x", cta: { label: "go", href: "https://ok.com" } })
        .success,
    ).toBe(true)
  })

  it("enforces limits and rejects unknown types", () => {
    expect(parseBlockData("hero_carousel", { slides: [] }).success).toBe(false)
    expect(parseBlockData("usp_strip", { items: [] }).success).toBe(false)
    expect(parseBlockData("nope", {}).success).toBe(false)
  })

  it("defaults a product rail to bestsellers, 8 items", () => {
    const r = parseBlockData("product_rail", {
      heading: "Bestsellers",
      query: { tags: ["bestseller"] },
    })
    expect(r.success && (r.data as any).query).toMatchObject({ sort: "bestseller", limit: 8 })
  })
})

describe("isLive", () => {
  const now = new Date("2026-06-15T12:00:00Z")
  it("respects the active flag and the schedule window", () => {
    expect(isLive({ is_active: false }, now)).toBe(false)
    expect(isLive({ is_active: true }, now)).toBe(true)
    expect(isLive({ is_active: true, starts_at: "2026-06-16T00:00:00Z" }, now)).toBe(false)
    expect(
      isLive(
        { is_active: true, starts_at: "2026-06-01T00:00:00Z", ends_at: "2026-06-30T00:00:00Z" },
        now,
      ),
    ).toBe(true)
    expect(isLive({ is_active: true, ends_at: "2026-06-15T12:00:00Z" }, now)).toBe(false)
  })
})
