import "server-only"
import { redirect } from "next/navigation"
import { currentCustomer } from "./customer"

export async function requireCustomer(returnTo: string) {
  const customer = await currentCustomer()
  if (!customer) redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  return customer
}
