import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@t9/ui"

export const metadata: Metadata = { title: "My account", robots: { index: false } }

const links = [
  { href: "/account", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
]

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <Container className="py-8 md:py-12">
      <h1 className="mb-6 font-display text-[clamp(26px,3.6vw,36px)] font-extrabold">My account</h1>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <nav aria-label="Account" className="flex gap-2 overflow-x-auto md:grid md:content-start">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-full px-4 py-2.5 text-[15px] font-semibold hover:bg-teal-mist"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </Container>
  )
}
