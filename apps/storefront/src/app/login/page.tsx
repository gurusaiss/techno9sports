import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@t9/ui"
import { LoginForm } from "@/components/account/login-form"

export const metadata: Metadata = { title: "Sign in", robots: { index: false } }

export default function LoginPage() {
  return (
    <Container className="grid max-w-md gap-6 py-10 md:py-16">
      <div>
        <h1 className="font-display text-[clamp(26px,3.6vw,34px)] font-extrabold">
          Sign in or create an account
        </h1>
        <p className="mt-2 text-muted">
          Track orders, save addresses and keep a wishlist. You can also check out as a guest.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </Container>
  )
}
