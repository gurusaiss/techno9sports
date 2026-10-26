import type { Metadata } from "next"
import { Suspense } from "react"
import { Container, Skeleton } from "@t9/ui"
import { CheckoutFlow } from "@/components/checkout/checkout-flow"
import { currentCustomer } from "@/lib/customer"

export const metadata: Metadata = { title: "Checkout", robots: { index: false } }

async function Checkout() {
  const customer = await currentCustomer().catch(() => null)
  return (
    <CheckoutFlow
      signedIn={!!customer}
      email={customer?.email ?? null}
      addresses={customer?.addresses ?? []}
    />
  )
}

export default function CheckoutPage() {
  return (
    <Container className="py-8 md:py-12">
      <h1 className="mb-6 font-display text-[clamp(26px,3.6vw,36px)] font-extrabold">Checkout</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Checkout />
      </Suspense>
    </Container>
  )
}
