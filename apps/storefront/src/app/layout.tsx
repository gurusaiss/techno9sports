import type { Metadata } from "next"
import { Manrope, Sora } from "next/font/google"
import { ToastProvider } from "@t9/ui"
import { SiteFooterChrome, SiteHeaderChrome } from "@/components/site-chrome"
import "./globals.css"

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
})
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: { default: "Techno9Sports", template: "%s | Techno9Sports" },
  description: "Activewear and sports eyewear, delivered across India",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
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
          <SiteHeaderChrome />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooterChrome />
        </ToastProvider>
      </body>
    </html>
  )
}
