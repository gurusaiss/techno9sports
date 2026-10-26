import type { Metadata } from "next"
import { Container } from "@t9/ui"
import { WishlistView } from "@/components/wishlist-view"
import { getTechnologies } from "@/lib/catalog"
import { safe } from "@/lib/safe"

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } }

export default async function WishlistPage() {
  const technologies = await safe(getTechnologies, [])
  const techNames = Object.fromEntries(technologies.map((t) => [t.handle, t.name]))
  return (
    <Container className="py-8 md:py-12">
      <h1 className="mb-6 font-display text-[clamp(26px,3.6vw,36px)] font-extrabold">Wishlist</h1>
      <WishlistView techNames={techNames} />
    </Container>
  )
}
