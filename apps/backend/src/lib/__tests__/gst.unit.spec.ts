import { gstRateFor, splitGst, taxInside } from "../gst"
import { SETTING_DEFAULTS } from "../settings"

const cfg = SETTING_DEFAULTS.gst

describe("gstRateFor", () => {
  it("uses the lower band up to and including the limit", () => {
    expect(gstRateFor(cfg, 999)).toBe(5)
    expect(gstRateFor(cfg, 2500)).toBe(5)
  })
  it("uses the upper band above the limit", () => {
    expect(gstRateFor(cfg, 2500.01)).toBe(18)
    expect(gstRateFor(cfg, 9999)).toBe(18)
  })
  it("lets a product-type rate override the price bands", () => {
    expect(gstRateFor(cfg, 499, "Sports frames")).toBe(18)
    expect(gstRateFor(cfg, 499, "T-shirt")).toBe(5)
  })
  it("follows owner-edited bands", () => {
    const custom = {
      ...cfg,
      bands: [{ upto: 1000, rate: 5 }, { upto: 5000, rate: 12 }, { rate: 18 }],
    }
    expect(gstRateFor(custom, 1200)).toBe(12)
    expect(gstRateFor(custom, 6000)).toBe(18)
  })
})

describe("splitGst", () => {
  it("splits CGST + SGST inside the pickup state", () => {
    const s = splitGst(cfg, 5, "Andhra Pradesh")
    expect(s.scheme).toBe("intra")
    expect(s.lines).toEqual([
      { code: "CGST", name: "CGST", rate: 2.5 },
      { code: "SGST", name: "SGST", rate: 2.5 },
    ])
  })
  it("accepts a state code or loose spelling", () => {
    expect(splitGst(cfg, 18, "ap").scheme).toBe("intra")
    expect(splitGst(cfg, 18, "andhra  pradesh").scheme).toBe("intra")
  })
  it("charges IGST to another state and when the state is unknown", () => {
    expect(splitGst(cfg, 18, "Karnataka").lines).toEqual([{ code: "IGST", name: "IGST", rate: 18 }])
    expect(splitGst(cfg, 18, null).scheme).toBe("inter")
    expect(splitGst(cfg, 18, "Atlantis").scheme).toBe("inter")
  })
  it("returns no lines for a zero rate", () => {
    expect(splitGst(cfg, 0, "Karnataka").lines).toEqual([])
  })
})

describe("taxInside", () => {
  it("extracts tax from an inclusive amount", () => {
    expect(taxInside(1050, 5)).toBe(50)
    expect(taxInside(1180, 18)).toBe(180)
    expect(taxInside(649, 5)).toBe(30.9)
  })
})
