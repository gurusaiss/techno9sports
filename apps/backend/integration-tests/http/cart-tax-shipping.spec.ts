import {
  addItem,
  ADDRESS_AP,
  ADDRESS_KA,
  call,
  chooseShipping,
  describeLive,
  getCart,
  newCart,
  round2,
  variants,
} from "./helpers"

describeLive("cart totals, GST and shipping", () => {
  let cheap: { id: string; price: number }
  beforeAll(async () => {
    const all = await variants()
    cheap = all.find((v) => v.price < 999 && v.price > 300)!
  })

  it("keeps prices GST-inclusive: the total is the sum of the line prices", async () => {
    const cart = await newCart()
    await addItem(cart, cheap.id, 1)
    const c = await getCart(cart)
    expect(c.item_total).toBe(cheap.price)
    expect(round2(c.item_subtotal + c.item_tax_total)).toBe(cheap.price)
  })
  it("splits CGST + SGST within the pickup state (Andhra Pradesh)", async () => {
    const cart = await newCart(ADDRESS_AP)
    await addItem(cart, cheap.id)
    const c = await getCart(cart)
    expect(c.items[0].tax_lines.map((t: any) => t.code).sort()).toEqual(["CGST", "SGST"])
    expect(c.items[0].tax_lines[0].rate).toBe(2.5)
  })
  it("charges IGST for another state (Karnataka)", async () => {
    const cart = await newCart(ADDRESS_KA)
    await addItem(cart, cheap.id)
    const c = await getCart(cart)
    expect(c.items[0].tax_lines.map((t: any) => t.code)).toEqual(["IGST"])
    expect(c.items[0].tax_lines[0].rate).toBe(5)
  })
  it("charges 18% on sports frames", async () => {
    const frames = (await variants("Sports frames"))[0]
    const cart = await newCart(ADDRESS_KA)
    await addItem(cart, frames.id)
    const c = await getCart(cart)
    expect(c.items[0].tax_lines[0].rate).toBe(18)
  })
  it("charges the flat delivery fee under the free-shipping threshold", async () => {
    const cart = await newCart()
    await addItem(cart, cheap.id, 1)
    const c = await chooseShipping(cart)
    expect(c.shipping_total).toBe(49)
    expect(c.total).toBe(cheap.price + 49)
  })
  it("makes delivery free at or above the threshold", async () => {
    const cart = await newCart()
    await addItem(cart, cheap.id, Math.ceil(999 / cheap.price))
    const c = await chooseShipping(cart)
    expect(c.shipping_total).toBe(0)
  })
  it("ignores a price sent by the client", async () => {
    const cart = await newCart()
    const r = await call("POST", `/store/carts/${cart}/line-items`, {
      variant_id: cheap.id,
      quantity: 1,
      unit_price: 1,
      metadata: { price: 1 },
    })
    expect([200, 400]).toContain(r.status)
    const c = await getCart(cart)
    for (const i of c.items ?? []) expect(i.unit_price).toBe(cheap.price)
  })
  it("rejects a quantity of zero or negative", async () => {
    const cart = await newCart()
    expect((await addItem(cart, cheap.id, 0)).status).toBeGreaterThanOrEqual(400)
    expect((await addItem(cart, cheap.id, -2)).status).toBeGreaterThanOrEqual(400)
  })
  it("refuses more than the stock on hand", async () => {
    const cart = await newCart()
    expect((await addItem(cart, cheap.id, 100000)).status).toBeGreaterThanOrEqual(400)
  })
})
