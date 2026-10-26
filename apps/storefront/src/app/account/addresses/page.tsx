import { Suspense } from "react"
import { AddressBook } from "@/components/account/account-forms"
import { requireCustomer } from "@/lib/require-customer"

async function Addresses() {
  const customer = await requireCustomer("/account/addresses")
  return <AddressBook addresses={customer.addresses} />
}

export default function AddressesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Addresses />
    </Suspense>
  )
}
