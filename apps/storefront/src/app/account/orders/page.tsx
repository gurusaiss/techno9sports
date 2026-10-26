import { Suspense } from "react"
import { EmptyState } from "@t9/ui"
import { requireCustomer } from "@/lib/require-customer"

async function Orders() {
  await requireCustomer("/account/orders")
  return (
    <EmptyState
      title="No orders yet"
      description="Your orders and their tracking will appear here."
    />
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Orders />
    </Suspense>
  )
}
