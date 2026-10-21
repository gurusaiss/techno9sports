/**
 * Run a data call and fall back when it fails, so a backend hiccup degrades one part of a page
 * instead of breaking all of it. Failures are not cached (the cached function throws).
 */
export async function safe<T>(call: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await call()
  } catch (error) {
    console.error("[storefront] data call failed:", error instanceof Error ? error.message : error)
    return fallback
  }
}
