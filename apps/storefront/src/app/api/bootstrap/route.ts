import { currentCart } from "@/lib/store"
import { currentCustomer } from "@/lib/customer"

/** GET /api/bootstrap: the visitor's cart and sign-in state in one request, read on page load. */
export async function GET() {
  const [cart, customer] = await Promise.all([
    currentCart().catch(() => null),
    currentCustomer().catch(() => null),
  ])
  return Response.json(
    { cart, session: { signedIn: !!customer, firstName: customer?.first_name ?? null } },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
