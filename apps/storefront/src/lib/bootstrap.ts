import type { StoreCart } from "@t9/types"
import type { SessionInfo } from "@/app/actions/auth"

interface Bootstrap {
  cart: StoreCart | null
  session: SessionInfo
}

const GUEST: Bootstrap = { cart: null, session: { signedIn: false, firstName: null } }

let inflight: Promise<Bootstrap> | null = null

/** One shared request for the cart and the session at page load; only one request goes out. */
export function loadBootstrap(): Promise<Bootstrap> {
  inflight ??= fetch("/api/bootstrap", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Bootstrap>) : GUEST))
    .catch(() => GUEST)
    .finally(() => {
      setTimeout(() => (inflight = null), 0)
    })
  return inflight
}
