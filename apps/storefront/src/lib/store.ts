import "server-only"
import type { StoreCart } from "@t9/types"
import { ApiError, medusa } from "./api"
import { clearCartId, getCartId, getToken, setCartId } from "./session"
import type { AddressInput } from "./schemas"

let regionId: string | undefined
async function getRegionId(): Promise<string> {
  if (regionId) return regionId
  const { regions } = await medusa<{ regions: { id: string }[] }>("/store/regions")
  if (!regions[0]) throw new ApiError("No region configured", 500)
  return (regionId = regions[0].id)
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export async function fetchCart(id: string): Promise<StoreCart | null> {
  try {
    const { cart } = await medusa<{ cart: StoreCart }>(`/store/catalog/cart/${id}`, {
      cache: "no-store",
    })
    return cart.completed ? null : cart
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export async function currentCart(): Promise<StoreCart | null> {
  const id = await getCartId()
  if (!id) return null
  const cart = await fetchCart(id)
  if (!cart) await clearCartId()
  return cart
}

async function createCart(): Promise<string> {
  const headers = await authHeaders()
  const { cart } = await medusa<{ cart: { id: string } }>("/store/carts", {
    method: "POST",
    body: JSON.stringify({ region_id: await getRegionId() }),
    headers,
  })
  await setCartId(cart.id)
  if (headers.authorization) {
    await medusa(`/store/carts/${cart.id}/customer`, { method: "POST", body: "{}", headers }).catch(
      () => undefined,
    )
  }
  return cart.id
}

async function cartIdOrCreate(): Promise<string> {
  const existing = await getCartId()
  if (existing && (await fetchCart(existing))) return existing
  return createCart()
}

export async function addLine(variantId: string, quantity: number): Promise<StoreCart> {
  const id = await cartIdOrCreate()
  await medusa(`/store/carts/${id}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  })
  return (await fetchCart(id))!
}

export async function setLineQuantity(lineId: string, quantity: number): Promise<StoreCart | null> {
  const id = await getCartId()
  if (!id) return null
  await medusa(`/store/carts/${id}/line-items/${lineId}`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  })
  return fetchCart(id)
}

export async function removeLine(lineId: string): Promise<StoreCart | null> {
  const id = await getCartId()
  if (!id) return null
  await medusa(`/store/carts/${id}/line-items/${lineId}`, { method: "DELETE" })
  return fetchCart(id)
}

export async function applyCoupon(
  code: string,
): Promise<{ cart: StoreCart | null; applied: boolean; message?: string; reason?: string }> {
  const id = await getCartId()
  if (!id) return { cart: null, applied: false, message: "Your bag is empty." }
  const r = await medusa<{ applied: boolean; message?: string; reason?: string }>(
    `/store/catalog/cart/${id}/coupon`,
    {
      method: "POST",
      body: JSON.stringify({ code }),
    },
  )
  return { cart: await fetchCart(id), applied: r.applied, message: r.message, reason: r.reason }
}

export async function removeCoupon(code: string): Promise<StoreCart | null> {
  const id = await getCartId()
  if (!id) return null
  await medusa(`/store/catalog/cart/${id}/coupon`, {
    method: "DELETE",
    body: JSON.stringify({ code }),
  })
  return fetchCart(id)
}

export async function setContactAndAddress(input: {
  email: string
  address: AddressInput
}): Promise<StoreCart | null> {
  const id = await getCartId()
  if (!id) return null
  const address = {
    ...input.address,
    country_code: "in",
    address_2: input.address.address_2 || undefined,
  }
  await medusa(`/store/carts/${id}`, {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      shipping_address: address,
      billing_address: address,
    }),
    headers: await authHeaders(),
  })
  return fetchCart(id)
}

export interface ShippingOption {
  id: string
  name: string
  description: string | null
  amount: number
}

export async function shippingOptions(): Promise<ShippingOption[]> {
  const id = await getCartId()
  if (!id) return []
  const { shipping_options } = await medusa<{
    shipping_options: {
      id: string
      name: string
      amount: number
      type?: { description?: string | null }
    }[]
  }>(`/store/shipping-options?cart_id=${id}`, { cache: "no-store" })
  return shipping_options.map((o) => ({
    id: o.id,
    name: o.name,
    description: o.type?.description ?? null,
    amount: o.amount,
  }))
}

export async function chooseShipping(optionId: string): Promise<StoreCart | null> {
  const id = await getCartId()
  if (!id) return null
  await medusa(`/store/carts/${id}/shipping-methods`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  })
  return fetchCart(id)
}

export async function claimCart(): Promise<void> {
  const id = await getCartId()
  const headers = await authHeaders()
  if (!id || !headers.authorization) return
  await medusa(`/store/carts/${id}/customer`, { method: "POST", body: "{}", headers }).catch(
    () => undefined,
  )
}

export interface PincodeInfo {
  pincode: string
  found: boolean
  city: string | null
  state: string | null
  serviceable: boolean
  cod_allowed: boolean
  delivery: { days_min: number; days_max: number; earliest: string; latest: string }
}

export async function lookupPincode(pincode: string): Promise<PincodeInfo> {
  return medusa<PincodeInfo>(`/store/pincodes/${pincode}`, { next: { revalidate: 300 } })
}
