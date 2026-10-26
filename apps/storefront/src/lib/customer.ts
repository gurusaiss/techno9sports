import "server-only"
import { ApiError, medusa } from "./api"
import { clearToken, getToken, setToken } from "./session"
import type { AddressInput } from "./schemas"

export interface CustomerAddress {
  id: string
  first_name: string
  last_name: string
  phone: string
  address_1: string
  address_2: string | null
  city: string
  province: string
  postal_code: string
  is_default_shipping: boolean
}

export interface Customer {
  id: string
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  addresses: CustomerAddress[]
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` })

export async function currentCustomer(): Promise<Customer | null> {
  const token = await getToken()
  if (!token) return null
  try {
    const { customer } = await medusa<{ customer: Customer }>(
      "/store/customers/me?fields=*addresses",
      {
        headers: bearer(token),
        cache: "no-store",
      },
    )
    return customer
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await clearToken()
      return null
    }
    throw e
  }
}

export async function signOut() {
  await clearToken()
}

export async function loginWithPassword(email: string, password: string) {
  const { token } = await medusa<{ token: string }>("/auth/customer/emailpass", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  await setToken(token)
}

export async function registerWithPassword(input: {
  email: string
  password: string
  first_name: string
  last_name: string
}) {
  const { token: registerToken } = await medusa<{ token: string }>(
    "/auth/customer/emailpass/register",
    {
      method: "POST",
      body: JSON.stringify({ email: input.email, password: input.password }),
    },
  )
  await medusa("/store/customers", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name || undefined,
    }),
    headers: bearer(registerToken),
  })
  await loginWithPassword(input.email, input.password)
}

export async function requestOtp(phone10: string) {
  return medusa<{ ok: boolean; resend_in?: number }>("/store/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone: phone10 }),
  })
}

export async function verifyOtp(phone10: string, code: string) {
  const r = await medusa<{ token: string; is_new: boolean }>("/store/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: phone10, code }),
  })
  await setToken(r.token)
  return { isNew: r.is_new }
}

async function requireToken(): Promise<string> {
  const token = await getToken()
  if (!token) throw new ApiError("Not signed in", 401)
  return token
}

export async function updateProfile(input: {
  first_name: string
  last_name: string
  email?: string
}) {
  const token = await requireToken()
  await medusa("/store/customers/me", {
    method: "POST",
    body: JSON.stringify(input),
    headers: bearer(token),
  })
}

export async function saveAddress(input: AddressInput, id?: string, makeDefault?: boolean) {
  const token = await requireToken()
  const body = JSON.stringify({
    ...input,
    address_2: input.address_2 || undefined,
    country_code: "in",
    is_default_shipping: makeDefault ?? false,
  })
  await medusa(id ? `/store/customers/me/addresses/${id}` : "/store/customers/me/addresses", {
    method: "POST",
    body,
    headers: bearer(token),
  })
}

export async function deleteAddress(id: string) {
  const token = await requireToken()
  await medusa(`/store/customers/me/addresses/${id}`, { method: "DELETE", headers: bearer(token) })
}

export async function wishlistIds(): Promise<string[]> {
  const token = await getToken()
  if (!token) return []
  const r = await medusa<{ product_ids: string[] }>("/store/wishlist", {
    headers: bearer(token),
    cache: "no-store",
  })
  return r.product_ids
}

export async function mergeWishlist(ids: string[]): Promise<string[]> {
  const token = await requireToken()
  const r = await medusa<{ product_ids: string[] }>("/store/wishlist", {
    method: "POST",
    body: JSON.stringify({ product_ids: ids }),
    headers: bearer(token),
  })
  return r.product_ids
}

export async function setWishlisted(productId: string, saved: boolean) {
  const token = await requireToken()
  await medusa(`/store/wishlist/${productId}`, {
    method: saved ? "PUT" : "DELETE",
    headers: bearer(token),
  })
}
