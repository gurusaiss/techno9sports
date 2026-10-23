/**
 * Client for the scenario suites. Run against a live backend (seeded dev or CI stack):
 *   T9_API_URL=http://localhost:9000 T9_PUBLISHABLE_KEY=pk_... pnpm test:integration:http
 * Admin-only setup (expired/capped coupons) also needs T9_ADMIN_EMAIL / T9_ADMIN_PASSWORD.
 */
export const API = process.env.T9_API_URL
export const KEY = process.env.T9_PUBLISHABLE_KEY ?? ""
export const enabled = !!API && !!KEY
export const describeLive = enabled ? describe : describe.skip

export interface Resp<T = any> {
  status: number
  body: T
}

export async function call<T = any>(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Resp<T>> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "x-publishable-api-key": KEY,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed: any = text
  try {
    parsed = JSON.parse(text)
  } catch {}
  return { status: res.status, body: parsed }
}

export const ADDRESS_AP = {
  first_name: "Asha",
  last_name: "Rao",
  address_1: "12 Beach Road",
  city: "Visakhapatnam",
  province: "Andhra Pradesh",
  postal_code: "530001",
  country_code: "in",
  phone: "9876543210",
}
export const ADDRESS_KA = {
  ...ADDRESS_AP,
  city: "Bengaluru",
  province: "Karnataka",
  postal_code: "560001",
}

export async function region(): Promise<string> {
  return (await call("GET", "/store/regions")).body.regions[0].id
}

export async function variants(
  typeValue?: string,
): Promise<{ id: string; price: number; product: string }[]> {
  const r = await call(
    "GET",
    "/store/products?limit=100&fields=*variants.calculated_price,+type.value&region_id=" +
      (await region()),
  )
  const out: { id: string; price: number; product: string }[] = []
  for (const p of r.body.products) {
    if (typeValue && p.type?.value !== typeValue) continue
    for (const v of p.variants ?? []) {
      const price = v.calculated_price?.calculated_amount
      if (price) out.push({ id: v.id, price, product: p.handle })
    }
  }
  return out.sort((a, b) => a.price - b.price)
}

export async function newCart(address = ADDRESS_AP, email = "buyer@example.com") {
  const r = await call("POST", "/store/carts", {
    region_id: await region(),
    email,
    shipping_address: address,
  })
  return r.body.cart.id as string
}

export const addItem = (cart: string, variant: string, quantity = 1) =>
  call("POST", `/store/carts/${cart}/line-items`, { variant_id: variant, quantity })
export const getCart = async (cart: string) => (await call("GET", `/store/carts/${cart}`)).body.cart
export const applyCode = (cart: string, code: string) =>
  call("POST", `/store/carts/${cart}/promotions`, { promo_codes: [code] })
export const removeCode = (cart: string, code: string) =>
  call("DELETE", `/store/carts/${cart}/promotions`, { promo_codes: [code] })

export async function chooseShipping(cart: string) {
  const o = await call("GET", `/store/shipping-options?cart_id=${cart}`)
  const id = o.body.shipping_options[0].id
  return (await call("POST", `/store/carts/${cart}/shipping-methods`, { option_id: id })).body.cart
}

export async function adminToken(): Promise<string | null> {
  const email = process.env.T9_ADMIN_EMAIL
  const password = process.env.T9_ADMIN_PASSWORD
  if (!email || !password) return null
  const r = await call("POST", "/auth/user/emailpass", { email, password })
  return r.body.token ?? null
}

export const round2 = (n: number) => Math.round(n * 100) / 100
