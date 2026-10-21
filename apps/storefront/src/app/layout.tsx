import type { Metadata } from "next"
import { Manrope, Sora } from "next/font/google"
import { ToastProvider } from "@t9/ui"
import { SiteFooterChrome, SiteHeaderChrome } from "@/components/site-chrome"
import { getCategoryTree, getPageBlocks, getTechnologies } from "@/lib/catalog"
import { buildNav } from "@/lib/nav"
import { SITE_NAME } from "@/lib/seo"
import { safe } from "@/lib/safe"
import { env } from "@/lib/env"
import "./globals.css"

// Variable fonts: one file each instead of one per weight.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap" })
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "Activewear and sports eyewear, delivered across India",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [tree, technologies, blocks] = await Promise.all([
    safe(getCategoryTree, []),
    safe(getTechnologies, []),
    safe(() => getPageBlocks("home"), []),
  ])
  const offer = blocks.find((b) => b.type === "offer_strip")
  const announcement =
    offer && offer.type === "offer_strip"
      ? { text: offer.data.text, href: offer.data.link?.href }
      : undefined

  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-[200] rounded-full bg-fg px-5 py-3 font-bold text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <ToastProvider>
          <SiteHeaderChrome nav={buildNav(tree, technologies)} announcement={announcement} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooterChrome />
        </ToastProvider>
      </body>
    </html>
  )
}
