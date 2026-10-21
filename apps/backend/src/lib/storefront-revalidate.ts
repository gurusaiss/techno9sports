import { MedusaError } from "@medusajs/framework/utils"
/**
 * Tells the storefront which cached data went stale (POST /api/revalidate). Calls are batched over
 * a short window so a bulk import or seed causes one request, and a failure only logs: the
 * storefront refreshes by time anyway, so a missed ping delays an update but never breaks one.
 */
export interface Revalidator {
  request(tags: string[]): void
  /** Send what is pending now (used on shutdown and in tests). */
  flush(): Promise<void>
}

const MAX_TAGS = 50
const GENERIC = ["products", "catalog"]

export function createRevalidator(options: {
  post: (tags: string[]) => Promise<void>
  delayMs?: number
  warn?: (message: string) => void
}): Revalidator {
  const pending = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = async () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    if (!pending.size) return
    // Too many specific tags means a bulk change: refresh the broad tags instead.
    const tags = pending.size > MAX_TAGS ? GENERIC : [...pending]
    pending.clear()
    try {
      await options.post(tags)
    } catch (error) {
      options.warn?.(
        `Storefront revalidation failed: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  return {
    request(tags) {
      for (const t of tags) pending.add(t)
      if (!timer) timer = setTimeout(() => void flush(), options.delayMs ?? 1500)
    },
    flush,
  }
}

let shared: Revalidator | undefined

/** The process-wide revalidator, configured from STOREFRONT_URL and REVALIDATE_SECRET. */
export function storefrontRevalidator(warn?: (message: string) => void): Revalidator {
  shared ??= createRevalidator({
    warn,
    post: async (tags) => {
      const secret = process.env.REVALIDATE_SECRET
      if (!secret) return // not configured (tests, local without a storefront)
      const base = process.env.STOREFRONT_URL ?? "http://localhost:8000"
      const res = await fetch(`${base}/api/revalidate`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidate-secret": secret },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok)
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `storefront answered ${res.status}`)
    },
  })
  return shared
}
