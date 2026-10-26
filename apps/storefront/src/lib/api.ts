import "server-only"

const BASE =
  process.env.MEDUSA_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
  "http://localhost:9000"
// Server-only, read at runtime (a NEXT_PUBLIC_ variable would be baked in at build time).
const KEY =
  process.env.MEDUSA_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The backend's own message for the customer, when it sent one. */
    readonly detail?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/** Server-side call to the Medusa store API. Never sends cookies or user data unless the caller passes them. */
export async function medusa<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "x-publishable-api-key": KEY,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    let detail: string | undefined
    try {
      const body = (await res.json()) as { message?: unknown }
      if (typeof body.message === "string") detail = body.message
    } catch {
      /* not JSON */
    }
    throw new ApiError(`Store API ${res.status} for ${path}`, res.status, detail)
  }
  return (await res.json()) as T
}
