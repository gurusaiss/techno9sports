import { Suspense } from "react"
import { ProfileForm, SignOutButton } from "@/components/account/account-forms"
import { requireCustomer } from "@/lib/require-customer"

async function Profile() {
  const customer = await requireCustomer("/account")
  return (
    <div className="grid gap-8">
      <ProfileForm customer={customer} />
      <SignOutButton />
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Profile />
    </Suspense>
  )
}
