import { toStoreOrder, type RawOrder } from "../store-order"

const raw = (over: Partial<RawOrder> = {}): RawOrder => ({
  id: "order_1",
  display_id: 42,
  email: "buyer@example.com",
  created_at: "2026-01-01T00:00:00.000Z",
  item_total: 499,
  shipping_total: 49,
  discount_total: 0,
  tax_total: 23.76,
  total: 548,
  summary: { paid_total: 0 },
  metadata: null,
  items: [
    {
      product_title: "Tee",
      variant_title: "S / Navy",
      thumbnail: "https://example.com/tee.webp",
      quantity: 1,
      unit_price: 499,
      total: 499,
    },
  ],
  shipping_address: {
    first_name: "A",
    last_name: "B",
    phone: "9876543210",
    address_1: "12 Beach Road",
    city: "Bengaluru",
    province: "Karnataka",
    postal_code: "560001",
  },
  payment_collections: [
    { status: "authorized", payment_sessions: [{ provider_id: "pp_cod_cod" }] },
  ],
  ...over,
})

describe("toStoreOrder", () => {
  it("adds the COD handling fee from order metadata on top of the order total", () => {
    const o = toStoreOrder(raw({ metadata: { cod_fee: 49 } }))
    expect(o.payment_method).toBe("cod")
    expect(o.cod_fee).toBe(49)
    expect(o.total).toBe(548)
    expect(o.payable).toBe(597)
  })

  it("never adds a COD fee for a Razorpay order, even with stray metadata", () => {
    const o = toStoreOrder(
      raw({
        metadata: { cod_fee: 49 },
        payment_collections: [
          { status: "captured", payment_sessions: [{ provider_id: "pp_razorpay_razorpay" }] },
        ],
      }),
    )
    expect(o.payment_method).toBe("razorpay")
    expect(o.cod_fee).toBe(0)
    expect(o.payable).toBe(548)
  })

  it("defaults cod_fee to 0 when metadata hasn't been written yet", () => {
    const o = toStoreOrder(raw())
    expect(o.cod_fee).toBe(0)
    expect(o.payable).toBe(548)
  })

  it("maps payment collection status to a payment_status", () => {
    expect(toStoreOrder(raw()).payment_status).toBe("authorized")
    expect(
      toStoreOrder(raw({ payment_collections: [{ status: "captured", payment_sessions: [] }] }))
        .payment_status,
    ).toBe("captured")
    expect(
      toStoreOrder(raw({ payment_collections: [{ status: "not_paid", payment_sessions: [] }] }))
        .payment_status,
    ).toBe("pending")
  })

  it("shapes line items and address", () => {
    const o = toStoreOrder(raw())
    expect(o.items).toEqual([
      {
        title: "Tee",
        variant: "S / Navy",
        thumbnail: "https://example.com/tee.webp",
        quantity: 1,
        unit_price: 499,
        line_total: 499,
      },
    ])
    expect(o.shipping_address).toEqual({
      first_name: "A",
      last_name: "B",
      phone: "9876543210",
      address_1: "12 Beach Road",
      address_2: null,
      city: "Bengaluru",
      province: "Karnataka",
      postal_code: "560001",
    })
  })
})
