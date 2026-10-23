import { Client } from "pg"
import {
  addItem,
  adminToken,
  applyCode,
  call,
  chooseShipping,
  describeLive,
  getCart,
  newCart,
  removeCode,
  variants,
} from "./helpers"

/**
 * Usage is only incremented at order completion (Phase 4), so a pre-checkout test for "already
 * fully claimed" sets the campaign budget's used count directly. Test-only, needs DATABASE_URL.
 */
async function markCampaignBudgetUsed(code: string, used: number): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query(
      `update promotion_campaign_budget pcb set "used" = $1
       from promotion p
       where p.campaign_id = pcb.campaign_id and p.code = $2`,
      [used, code],
    )
  } finally {
    await client.end()
  }
  return true
}

describeLive("coupons", () => {
  let pick: { id: string; price: number }
  beforeAll(async () => {
    pick = (await variants()).find((v) => v.price >= 700 && v.price < 999)!
  })

  it("applies a percentage code and the server computes the discount", async () => {
    const cart = await newCart(undefined, `welcome-${Date.now()}@example.com`)
    await addItem(cart, pick.id)
    const r = await applyCode(cart, "WELCOME10")
    expect(r.status).toBe(200)
    const c = await getCart(cart)
    expect(c.discount_total).toBeCloseTo(pick.price * 0.1, 1)
    expect(c.total).toBeCloseTo(pick.price * 0.9, 1)
  })
  it("removes a code and restores the price", async () => {
    const cart = await newCart(undefined, `rm-${Date.now()}@example.com`)
    await addItem(cart, pick.id)
    await applyCode(cart, "WELCOME10")
    await removeCode(cart, "WELCOME10")
    const c = await getCart(cart)
    expect(c.discount_total).toBe(0)
    expect(c.total).toBe(pick.price)
  })
  it("does not apply a code that does not exist", async () => {
    const cart = await newCart()
    await addItem(cart, pick.id)
    await applyCode(cart, "NOSUCHCODE")
    const c = await getCart(cart)
    expect(c.discount_total).toBe(0)
  })
  it("does not apply a minimum-value code to a small cart", async () => {
    const cart = await newCart()
    await addItem(cart, pick.id)
    await applyCode(cart, "FLAT150")
    expect((await getCart(cart)).discount_total).toBe(0)
  })
  it("applies the order-level fixed code once the minimum is met", async () => {
    const cart = await newCart()
    await addItem(cart, pick.id, Math.ceil(1499 / pick.price))
    await applyCode(cart, "FLAT150")
    expect((await getCart(cart)).discount_total).toBe(150)
  })
  it("free-shipping code zeroes delivery on a small cart", async () => {
    const small = (await variants()).find((v) => v.price >= 500 && v.price < 900)!
    const cart = await newCart()
    await addItem(cart, small.id)
    await chooseShipping(cart)
    await applyCode(cart, "FREESHIP")
    expect((await getCart(cart)).shipping_total).toBe(0)
  })
  it("tampering: cannot lower the total by sending a discount amount", async () => {
    const cart = await newCart()
    await addItem(cart, pick.id)
    await call("POST", `/store/carts/${cart}`, { discount_total: 999, total: 1 })
    expect((await getCart(cart)).total).toBe(pick.price)
  })

  describe("admin-created edge cases", () => {
    let token: string | null
    beforeAll(async () => {
      token = await adminToken()
    })
    const admin = (method: string, path: string, body?: unknown) =>
      call(method, path, body, { authorization: `Bearer ${token}` })

    it("an expired campaign code does not apply", async () => {
      if (!token) return
      const code = `EXP${Date.now()}`
      const made = await admin("POST", "/admin/promotions", {
        code,
        type: "standard",
        status: "active",
        is_automatic: false,
        application_method: {
          type: "percentage",
          target_type: "items",
          allocation: "across",
          value: 50,
          currency_code: "inr",
        },
        campaign: {
          name: code,
          campaign_identifier: code.toLowerCase(),
          starts_at: "2020-01-01T00:00:00Z",
          ends_at: "2020-02-01T00:00:00Z",
        },
      })
      expect(made.status).toBe(200)
      const cart = await newCart()
      await addItem(cart, pick.id)
      await applyCode(cart, code)
      expect((await getCart(cart)).discount_total).toBe(0)
    })
    it("a usage-capped code stops after its limit", async () => {
      if (!token) return
      const code = `CAP${Date.now()}`
      const made = await admin("POST", "/admin/promotions", {
        code,
        type: "standard",
        status: "active",
        is_automatic: false,
        application_method: {
          type: "fixed",
          target_type: "order",
          allocation: "across",
          value: 10,
          currency_code: "inr",
        },
        campaign: {
          name: code,
          campaign_identifier: code.toLowerCase(),
          budget: { type: "usage", limit: 1 },
        },
      })
      expect(made.status).toBe(200)
      const marked = await markCampaignBudgetUsed(code, 1)
      if (!marked) return
      const cart = await newCart()
      await addItem(cart, pick.id)
      await applyCode(cart, code)
      expect((await getCart(cart)).discount_total).toBe(0)
    })
    it("a fixed-amount code created in the admin takes exactly that amount off a GST-inclusive cart", async () => {
      if (!token) return
      const code = `FIX${Date.now()}`
      const made = await admin("POST", "/admin/promotions", {
        code,
        type: "standard",
        status: "active",
        is_automatic: false,
        application_method: {
          type: "fixed",
          target_type: "order",
          allocation: "across",
          value: 80,
          currency_code: "inr",
        },
      })
      expect(made.status).toBe(200)
      await new Promise((r) => setTimeout(r, 1500))
      const cart = await newCart()
      await addItem(cart, pick.id)
      await applyCode(cart, code)
      expect((await getCart(cart)).discount_total).toBe(80)
    })
  })
})
