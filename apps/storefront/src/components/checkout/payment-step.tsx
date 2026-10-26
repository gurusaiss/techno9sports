"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { StoreCart } from "@t9/types"
import { Button, cn } from "@t9/ui"
import {
  codCheckAction,
  completePaymentAction,
  confirmCodAction,
  razorpaySessionAction,
  requestCodOtpAction,
  simulateRazorpayAction,
  verifyCodOtpAction,
} from "@/app/actions/payment"
import { Field } from "@/components/account/field"
import { inr } from "@/lib/format-money"
import { rupeesToPaise } from "@/lib/money"
import type { CodCheck } from "@/lib/payment"

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

const CHECKOUT_JS_SRC = "https://checkout.razorpay.com/v1/checkout.js"

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = CHECKOUT_JS_SRC
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

type Method = "razorpay" | "cod"

function MethodOption({
  active,
  disabled,
  onSelect,
  title,
  description,
  children,
}: {
  active: boolean
  disabled?: boolean
  onSelect: () => void
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-line-strong bg-surface p-4",
        active && "border-link bg-teal-mist",
        disabled && "opacity-50",
      )}
    >
      <label
        className={cn("flex items-start gap-3", disabled ? "cursor-not-allowed" : "cursor-pointer")}
      >
        <input
          type="radio"
          name="payment-method"
          checked={active}
          disabled={disabled}
          onChange={onSelect}
          className="mt-1 size-4"
        />
        <span className="grid gap-0.5">
          <span className="font-semibold">{title}</span>
          <span className="text-sm text-muted">{description}</span>
        </span>
      </label>
      {active && children ? <div className="mt-4 grid gap-3 pl-7">{children}</div> : null}
    </div>
  )
}

export function PaymentStep({
  cart,
  onCartUpdate,
}: {
  cart: StoreCart
  onCartUpdate: (cart: StoreCart | null) => void
}) {
  const router = useRouter()
  const [method, setMethod] = React.useState<Method>("razorpay")
  const [codInfo, setCodInfo] = React.useState<CodCheck | null>(null)
  const [otpSent, setOtpSent] = React.useState(false)
  const [otpCode, setOtpCode] = React.useState("")
  const [mockOrderId, setMockOrderId] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    let cancelled = false
    void codCheckAction().then((r) => {
      if (!cancelled) setCodInfo(r)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const finish = async () => {
    const r = await completePaymentAction()
    if (r.ok) {
      // The cart that was just placed is spent; clear it from the header badge and bag drawer
      // right away rather than leaving a stale count until the next reload.
      onCartUpdate(null)
      router.push(`/order/${r.orderId}`)
      return
    }
    setPending(false)
    setError(r.message)
    if (r.cart) onCartUpdate(r.cart)
  }

  const payWithRazorpay = async () => {
    setError(undefined)
    setPending(true)
    const r = await razorpaySessionAction()
    if (!r.ok) {
      setPending(false)
      return setError(r.error)
    }
    const { session } = r
    if (session.mock) {
      setMockOrderId(session.order_id)
      setPending(false)
      return
    }
    const loaded = await loadRazorpayScript()
    if (!loaded) {
      setPending(false)
      return setError("Couldn't load the payment window. Check your connection and try again.")
    }
    const rzp = new window.Razorpay!({
      key: session.key_id,
      order_id: session.order_id,
      amount: rupeesToPaise(session.amount),
      currency: session.currency,
      name: "Techno9Sports",
      description: "Order payment",
      handler: () => void finish(),
      modal: { ondismiss: () => setPending(false) },
    })
    rzp.open()
  }

  const simulate = async (outcome: "success" | "failure") => {
    if (!mockOrderId) return
    setPending(true)
    await simulateRazorpayAction(mockOrderId, outcome)
    await finish()
  }

  const requestOtp = async () => {
    setError(undefined)
    setPending(true)
    const r = await requestCodOtpAction()
    setPending(false)
    if (!r.ok) return setError(r.error)
    setOtpSent(true)
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setPending(true)
    const r = await verifyCodOtpAction(otpCode)
    if (!r.ok) {
      setPending(false)
      return setError(r.error)
    }
    if (r.cart) onCartUpdate(r.cart)
    await finish()
  }

  const confirmCod = async () => {
    setError(undefined)
    setPending(true)
    const r = await confirmCodAction()
    if (!r.ok) {
      setPending(false)
      return setError(r.error)
    }
    if (r.cart) onCartUpdate(r.cart)
    await finish()
  }

  const codFee = codInfo?.fee ?? 0
  const payNow = () => {
    if (method === "razorpay") return void payWithRazorpay()
    if (!codInfo?.eligible) return
    if (codInfo.otp_required) return void requestOtp()
    return void confirmCod()
  }

  const buttonLabel =
    method === "cod" && codInfo?.eligible
      ? `Place order · Pay ${inr(cart.total + codFee)} on delivery`
      : `Pay ${inr(cart.total)}`
  const payDisabled = pending || (method === "cod" && (!codInfo || !codInfo.eligible)) || otpSent

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="sr-only">Payment method</legend>

        <MethodOption
          active={method === "razorpay"}
          onSelect={() => setMethod("razorpay")}
          title="UPI, cards, netbanking and wallets"
          description="Pay securely via Razorpay."
        >
          {mockOrderId ? (
            <div className="grid gap-2 rounded-control border border-dashed border-line-strong bg-background p-3">
              <p className="text-sm font-semibold">Test mode: simulate the result</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => void simulate("success")}
                >
                  Simulate success
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void simulate("failure")}
                >
                  Simulate failure
                </Button>
              </div>
            </div>
          ) : null}
        </MethodOption>

        <MethodOption
          active={method === "cod"}
          disabled={codInfo !== null && !codInfo.eligible}
          onSelect={() => setMethod("cod")}
          title="Cash on delivery"
          description={
            codInfo === null
              ? "Checking availability…"
              : codInfo.eligible
                ? `Pay in cash when your order arrives. A ${inr(codFee)} handling fee applies.`
                : (codInfo.message ?? "Not available for this order.")
          }
        >
          {otpSent ? (
            <form onSubmit={verifyOtp} className="grid gap-3">
              <Field
                label="Enter the 6-digit code sent to your phone"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              />
              <div className="flex gap-3">
                <Button type="submit" loading={pending} disabled={otpCode.length !== 6}>
                  Verify and place order
                </Button>
                <Button
                  type="button"
                  variant="link"
                  disabled={pending}
                  onClick={() => void requestOtp()}
                >
                  Resend code
                </Button>
              </div>
            </form>
          ) : null}
        </MethodOption>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-sale">
          {error}
        </p>
      ) : null}

      {!otpSent && !mockOrderId ? (
        <Button size="lg" full loading={pending} disabled={payDisabled} onClick={payNow}>
          {buttonLabel}
        </Button>
      ) : null}
    </div>
  )
}
