"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@t9/ui"
import { loginAction, registerAction, requestOtpAction, verifyOtpAction } from "@/app/actions/auth"
import { updateProfileAction } from "@/app/actions/account"
import { useCart } from "@/components/cart/cart-provider"
import { useSession } from "@/components/session-provider"
import { useWishlist } from "@/components/wishlist-provider"
import { Field } from "./field"

/** Only same-site paths: a `next` param must not become an open redirect. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : "/account"
}

function useAfterSignIn() {
  const router = useRouter()
  const params = useSearchParams()
  const { refresh } = useSession()
  const { reload } = useCart()
  return async () => {
    await Promise.all([refresh(), reload()])
    router.replace(safeNext(params.get("next")))
    router.refresh()
  }
}

function OtpForm() {
  const done = useAfterSignIn()
  const wishlist = useWishlist()
  const [phone, setPhone] = React.useState("")
  const [step, setStep] = React.useState<"phone" | "code" | "name">("phone")
  const [code, setCode] = React.useState("")
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [pending, setPending] = React.useState(false)
  const [wait, setWait] = React.useState(0)

  React.useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(undefined)
    setPending(true)
    const r = await requestOtpAction({ phone })
    setPending(false)
    if (!r.ok) return setError(r.error)
    setStep("code")
    setWait(r.resendIn ?? 30)
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setPending(true)
    const r = await verifyOtpAction({ phone, code }, wishlist.guestIds())
    setPending(false)
    if (!r.ok) return setError(r.error)
    if (r.isNew) return setStep("name")
    await done()
  }

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    if (name.trim())
      await updateProfileAction({
        first_name: name.trim().split(" ")[0],
        last_name: name.trim().split(" ").slice(1).join(" "),
      })
    setPending(false)
    await done()
  }

  if (step === "name") {
    return (
      <form onSubmit={saveName} className="grid gap-4">
        <p className="text-muted">You&apos;re in. What should we call you?</p>
        <Field
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <Button type="submit" size="lg" full loading={pending}>
          Continue
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={() => void done()}
          className="justify-self-center"
        >
          Skip for now
        </Button>
      </form>
    )
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="grid gap-4">
        <p className="text-muted">
          We sent a 6-digit code to <b className="text-fg">+91 {phone}</b>.{" "}
          <button
            type="button"
            className="text-link underline underline-offset-4"
            onClick={() => setStep("phone")}
          >
            Change number
          </button>
        </p>
        <Field
          label="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          error={error}
        />
        <Button type="submit" size="lg" full loading={pending} disabled={code.length !== 6}>
          Verify and continue
        </Button>
        <Button
          type="button"
          variant="link"
          disabled={wait > 0 || pending}
          onClick={() => void send()}
          className="justify-self-center"
        >
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={send} className="grid gap-4">
      <Field
        label="Mobile number"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 16))}
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="98765 43210"
        hint="We'll text you a code. No password needed."
        error={error}
      />
      <Button
        type="submit"
        size="lg"
        full
        loading={pending}
        disabled={phone.replace(/\D/g, "").length < 10}
      >
        Send code
      </Button>
    </form>
  )
}

function EmailForm() {
  const done = useAfterSignIn()
  const wishlist = useWishlist()
  const [mode, setMode] = React.useState<"signin" | "register">("signin")
  const [v, setV] = React.useState({ first_name: "", email: "", password: "" })
  const [error, setError] = React.useState<string>()
  const [fields, setFields] = React.useState<Record<string, string>>({})
  const [pending, setPending] = React.useState(false)
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setFields({})
    setPending(true)
    const r =
      mode === "signin"
        ? await loginAction({ email: v.email, password: v.password }, wishlist.guestIds())
        : await registerAction(
            { first_name: v.first_name, email: v.email, password: v.password },
            wishlist.guestIds(),
          )
    setPending(false)
    if (!r.ok) {
      setError(r.error)
      setFields(r.fields ?? {})
      return
    }
    await done()
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {mode === "register" ? (
        <Field
          label="First name"
          value={v.first_name}
          onChange={set("first_name")}
          autoComplete="given-name"
          error={fields.first_name}
        />
      ) : null}
      <Field
        label="Email"
        type="email"
        value={v.email}
        onChange={set("email")}
        autoComplete="email"
        error={fields.email}
      />
      <Field
        label="Password"
        type="password"
        value={v.password}
        onChange={set("password")}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        hint={
          mode === "register" ? "At least 8 characters, with a letter and a number." : undefined
        }
        error={fields.password}
      />
      {error && !Object.keys(fields).length ? (
        <p role="alert" className="text-sm font-semibold text-sale">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" full loading={pending}>
        {mode === "signin" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        className="justify-self-center text-sm text-link underline underline-offset-4"
        onClick={() => {
          setMode(mode === "signin" ? "register" : "signin")
          setError(undefined)
          setFields({})
        }}
      >
        {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </form>
  )
}

export function LoginForm() {
  return (
    <Tabs defaultValue="otp">
      <TabsList aria-label="Sign in method">
        <TabsTrigger value="otp">Mobile OTP</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>
      <TabsContent value="otp">
        <OtpForm />
      </TabsContent>
      <TabsContent value="email">
        <EmailForm />
      </TabsContent>
    </Tabs>
  )
}
