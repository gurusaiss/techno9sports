import { toStoreCart, type RawCart } from "../store-cart"
import { SETTING_DEFAULTS } from "../settings"

const settings = {
  shipping: SETTING_DEFAULTS.shipping,
  checkout: SETTING_DEFAULTS.checkout,
  cod: SETTING_DEFAULTS.cod,
}

const raw = (over: Partial<RawCart> = {}): RawCart => ({
  id: "cart_1",
  email: null,
  customer_id: null,
  completed_at: null,
  item_total: 1298,
  discount_total: 0,
  shipping_total: 0,
  tax_total: 61.8095238,
  total: 1298,
  items: [
    {
      id: "li_1",
      product_id: "p1",
      product_handle: "tee",
      product_title: "Tee",
      variant_id: "v1",
      thumbnail: null,
      quantity: 2,
      unit_price: 649,
      total: 1298,
      discount_total: 0,
      variant: {
        manage_inventory: true,
        allow_backorder: false,
        inventory_items: [
          { inventory: { location_levels: [{ stocked_quantity: 4, reserved_quantity: 1 }] } },
        ],
        options: [
          { value: "M", option: { title: "Size" } },
          { value: "Teal", option: { title: "Color" } },
        ],
        product: { metadata: { mrp: 1199 } },
      },
    },
  ],
  ...over,
})

describe("toStoreCart", () => {
  it("shapes lines and rounds money to paise", () => {
    const c = toStoreCart(raw(), settings)
    expect(c.items[0]).toMatchObject({
      size: "M",
      color: "Teal",
      mrp: 1199,
      unit_price: 649,
      quantity: 2,
    })
    expect(c.tax_total).toBe(61.81)
    expect(c.item_count).toBe(2)
    expect(c.mrp_total).toBe(2398)
    expect(c.items_total).toBe(1298)
    expect(c.savings).toBe(1100)
  })
  it("caps quantity by stock on hand", () =>
    expect(toStoreCart(raw(), settings).items[0]!.max_quantity).toBe(3))
  it("caps quantity by the per-line setting", () => {
    const r = raw()
    r.items![0]!.variant!.inventory_items![0]!.inventory!.location_levels![0]!.stocked_quantity = 500
    expect(toStoreCart(r, settings).items[0]!.max_quantity).toBe(10)
  })
  it("reports free-shipping progress", () => {
    const c = toStoreCart(raw({ item_total: 649, total: 698 }), settings)
    expect(c.free_shipping).toEqual({ threshold: 999, remaining: 350, reached: false })
    expect(toStoreCart(raw(), settings).free_shipping.reached).toBe(true)
  })
  it("has no progress when free shipping is off", () => {
    const c = toStoreCart(raw(), {
      ...settings,
      shipping: { ...settings.shipping, free_above: null },
    })
    expect(c.free_shipping).toEqual({ threshold: null, remaining: 0, reached: false })
  })
  it("includes the coupon and its description", () => {
    const c = toStoreCart(
      raw({
        discount_total: 129.8,
        promotions: [{ code: "WELCOME10", metadata: { description: "10% off" } }],
      }),
      settings,
    )
    expect(c.promotions).toEqual([{ code: "WELCOME10", description: "10% off", automatic: false }])
    expect(c.savings).toBe(1229.8)
  })
  it("treats no MRP as no saving", () => {
    const r = raw()
    r.items![0]!.variant!.product = { metadata: {} }
    expect(toStoreCart(r, settings).items[0]!.mrp).toBeNull()
  })
  it("adds the COD fee once a COD session is on the cart", () => {
    const c = toStoreCart(
      raw({
        payment_collection: {
          payment_sessions: [{ provider_id: "pp_cod_cod", status: "pending" }],
        },
      }),
      settings,
    )
    expect(c.payment_method).toBe("cod")
    expect(c.cod_fee).toBe(SETTING_DEFAULTS.cod.fee)
    expect(c.total).toBe(1298 + SETTING_DEFAULTS.cod.fee)
  })
})
