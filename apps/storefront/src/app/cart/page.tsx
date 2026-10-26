import type { Metadata } from "next"
import { Container } from "@t9/ui"
import { BagView } from "@/components/cart/bag-view"

export const metadata: Metadata = { title: "Your bag", robots: { index: false } }

export default function CartPage() {
  return (
    <Container className="py-8 md:py-12">
      <h1 className="mb-6 font-display text-[clamp(26px,3.6vw,36px)] font-extrabold">Your bag</h1>
      <BagView />
    </Container>
  )
}
