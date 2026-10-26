import { ApiError } from "./api"

/** Turns a backend failure into one sentence for the customer. Never exposes raw error text. */
export function friendlyError(
  e: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (e instanceof ApiError) {
    const d = (e.detail ?? "").toLowerCase()
    if (d.includes("inventory") || d.includes("not enough") || d.includes("out of stock")) {
      return "Sorry, we don't have that many in stock."
    }
    if (e.status === 429) return "Too many attempts. Please wait a few minutes and try again."
    if (e.status === 401 && e.detail) return e.detail
    if (
      e.status >= 400 &&
      e.status < 500 &&
      e.detail &&
      e.detail.length < 160 &&
      !/[{}]|id:|_[0-9a-z]{10,}/i.test(e.detail)
    ) {
      return e.detail
    }
  }
  return fallback
}
