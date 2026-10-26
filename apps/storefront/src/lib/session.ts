import "server-only"
import { cookies } from "next/headers"

const CART = "t9_cart"
const TOKEN = "t9_token"
const DAY = 86_400

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

export async function getCartId(): Promise<string | null> {
  return (await cookies()).get(CART)?.value ?? null
}
export async function setCartId(id: string) {
  ;(await cookies()).set(CART, id, { ...base, maxAge: 30 * DAY })
}
export async function clearCartId() {
  ;(await cookies()).delete(CART)
}
export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN)?.value ?? null
}
export async function setToken(token: string) {
  ;(await cookies()).set(TOKEN, token, { ...base, maxAge: 7 * DAY })
}
export async function clearToken() {
  ;(await cookies()).delete(TOKEN)
}
