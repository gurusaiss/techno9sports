import { deliveryWindow, isPincode, parsePincodeCsv } from "../pincode"
import { standardShippingPrices } from "../shipping-prices"
import { cartMerchandiseTotal, readPromotionMeta } from "../promotion-rules"
import { SETTING_DEFAULTS, SETTING_SCHEMAS } from "../settings"

describe("pincode", () => {
  it("validates six digits, no leading zero", () => {
    expect(["530001", "110001"].every(isPincode)).toBe(true)
    expect(["053001", "12345", "5300011", "53000a"].some(isPincode)).toBe(false)
  })
  it("parses a sheet and normalises the state", () => {
    const { rows, errors } = parsePincodeCsv(
      "pincode,city,district,state,serviceable,cod_allowed,days_min,days_max\n530001,Visakhapatnam,Vizag,andhra pradesh,true,false,1,3\n",
    )
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({
      state: "Andhra Pradesh",
      state_code: "AP",
      cod_allowed: false,
      days_max: 3,
    })
  })
  it("reports line-numbered errors and applies nothing half-way", () => {
    const { rows, errors } = parsePincodeCsv(
      "pincode,city,state\n530001,Vizag,Andhra Pradesh\n12,Nowhere,Assam\n530001,Dup,Assam\n560001,Blr,Atlantis\n",
    )
    expect(rows).toHaveLength(1)
    expect(errors.join("|")).toMatch(/line 3.*pincode/)
    expect(errors.join("|")).toMatch(/line 4: duplicate/)
    expect(errors.join("|")).toMatch(/line 5: unknown state/)
  })
  it("computes a delivery window", () => {
    expect(deliveryWindow(new Date("2026-10-21T10:00:00Z"), 2, 5)).toEqual({
      earliest: "2026-10-23",
      latest: "2026-10-26",
    })
  })
})

describe("shipping prices", () => {
  it("adds a free tier at the threshold", () => {
    const rows = standardShippingPrices(
      { ...SETTING_DEFAULTS.shipping, flat_fee: 59, free_above: 1200 },
      "reg_1",
    )
    expect(rows.filter((r) => r.amount === 59)).toHaveLength(2)
    const free = rows.filter((r) => r.amount === 0)
    expect(free).toHaveLength(2)
    expect(free[0]!.rules).toEqual([{ attribute: "item_total", operator: "gte", value: 1200 }])
  })
  it("has no free tier when the owner turns it off", () => {
    const rows = standardShippingPrices({ ...SETTING_DEFAULTS.shipping, free_above: null }, "reg_1")
    expect(rows.every((r) => r.amount === SETTING_DEFAULTS.shipping.flat_fee)).toBe(true)
  })
})

describe("promotion rules", () => {
  it("sums merchandise before discounts", () => {
    expect(
      cartMerchandiseTotal([
        { unit_price: 649, quantity: 2 },
        { unit_price: "100.5", quantity: "1" },
      ]),
    ).toBe(1398.5)
    expect(cartMerchandiseTotal(undefined)).toBe(0)
  })
  it("reads the first-order flag from metadata", () => {
    expect(readPromotionMeta({ first_order_only: true }).first_order_only).toBe(true)
    expect(readPromotionMeta({ first_order_only: "true" }).first_order_only).toBe(true)
    expect(readPromotionMeta(null).first_order_only).toBe(false)
  })
})

describe("settings schemas", () => {
  it("accept the defaults", () => {
    for (const k of Object.keys(SETTING_SCHEMAS) as (keyof typeof SETTING_SCHEMAS)[]) {
      expect(SETTING_SCHEMAS[k].safeParse(SETTING_DEFAULTS[k]).success).toBe(true)
    }
  })
  it("reject nonsense", () => {
    expect(
      SETTING_SCHEMAS.shipping.safeParse({ ...SETTING_DEFAULTS.shipping, flat_fee: -1 }).success,
    ).toBe(false)
    expect(SETTING_SCHEMAS.gst.safeParse({ ...SETTING_DEFAULTS.gst, bands: [] }).success).toBe(
      false,
    )
  })
})
