"use client"

import * as React from "react"
import Link from "next/link"
import { Check, ShoppingBag } from "lucide-react"
import type { StoreCart } from "@t9/types"
import { Button, EmptyState, Skeleton, cn } from "@t9/ui"
import {
  chooseShippingAction,
  lookupPincodeAction,
  saveDetailsAction,
} from "@/app/actions/checkout"
import {
  CartLineItem,
  FreeShippingBar,
  PriceBreakdown,
  CouponForm,
} from "@/components/cart/cart-parts"
import { useCart } from "@/components/cart/cart-provider"
import {
  AddressFields,
  EMPTY_ADDRESS,
  SubmitRow,
  type AddressValues,
  type PincodeNote,
} from "@/components/account/address-form"
import { Field } from "@/components/account/field"
import { PaymentStep } from "@/components/checkout/payment-step"
import { inr } from "@/lib/format-money"
import type { CustomerAddress } from "@/lib/customer"
import type { ShippingOption } from "@/lib/store"

type Step = 1 | 2 | 3

function fromCart(cart: StoreCart): AddressValues | null {
  const a = cart.shipping_address
  return a
    ? {
        first_name: a.first_name,
        last_name: a.last_name,
        phone: a.phone,
        address_1: a.address_1,
        address_2: a.address_2 ?? "",
        city: a.city,
        province: a.province,
        postal_code: a.postal_code,
      }
    : null
}

function StepHeader({
  n,
  title,
  active,
  done,
  onEdit,
}: {
  n: number
  title: string
  active: boolean
  done: boolean
  onEdit?: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn(
          "grid size-8 place-items-center rounded-full text-sm font-bold",
          done
            ? "bg-teal-ink text-white"
            : active
              ? "bg-primary text-on-primary"
              : "bg-teal-mist text-muted",
        )}
      >
        {done ? <Check className="size-4" /> : n}
      </span>
      <h2 className={cn("font-display text-lg font-extrabold", !active && !done && "text-muted")}>
        {title}
      </h2>
      {done && onEdit ? (
        <Button variant="link" size="sm" className="ml-auto" onClick={onEdit}>
          Edit
        </Button>
      ) : null}
    </div>
  )
}

export function CheckoutFlow({
  signedIn,
  email: knownEmail,
  addresses,
}: {
  signedIn: boolean
  email: string | null
  addresses: CustomerAddress[]
}) {
  const { cart, ready, replace, applyPendingCoupon } = useCart()
  const [step, setStep] = React.useState<Step>(1)
  const [email, setEmail] = React.useState(knownEmail ?? "")
  const [address, setAddress] = React.useState<AddressValues>(EMPTY_ADDRESS)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [formError, setFormError] = React.useState<string>()
  const [pending, setPending] = React.useState(false)
  const [options, setOptions] = React.useState<ShippingOption[]>([])
  const [pin, setPin] = React.useState<PincodeNote | null>(null)
  const [eta, setEta] = React.useState<string>()
  const [hydrated, setHydrated] = React.useState(false)

  const showEta = async (postal: string) => {
    const r = await lookupPincodeAction(postal)
    if (r.ok && r.info) {
      const f = (d: string) =>
        new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      setEta(`Arrives ${f(r.info.delivery.earliest)} to ${f(r.info.delivery.latest)}`)
    }
  }

  // Resume where the cart left off (a refresh, or coming back from the bag). State is adjusted
  // during render, once, the first time the cart is known.
  if (ready && cart && !hydrated) {
    setHydrated(true)
    const saved = fromCart(cart)
    if (cart.email) setEmail(cart.email)
    if (saved) {
      setAddress(saved)
      setStep(cart.shipping_method ? 3 : 2)
    }
  }

  // Resumed at the delivery step: fetch the options.
  React.useEffect(() => {
    if (!hydrated || step !== 2 || options.length > 0) return
    let cancelled = false
    void saveDetailsAction({ email, address }).then((r) => {
      if (cancelled) return
      if (r.cart) replace(r.cart)
      setOptions(r.options ?? [])
      void showEta(address.postal_code)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, step])

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    if (pin && !pin.ok) return setErrors({ postal_code: pin.text })
    setPending(true)
    const r = await saveDetailsAction({ email, address })
    setPending(false)
    setErrors(r.fields ?? {})
    if (r.cart) replace(r.cart)
    if (r.error) return setFormError(r.fields ? undefined : r.error)
    void applyPendingCoupon()
    const opts = r.options ?? []
    setOptions(opts)
    void showEta(address.postal_code)
    if (opts.length === 1) {
      const c = await chooseShippingAction(opts[0]!.id)
      if (c.cart) replace(c.cart)
      setStep(3)
    } else setStep(2)
  }

  const chooseOption = async (id: string) => {
    setPending(true)
    const r = await chooseShippingAction(id)
    setPending(false)
    if (r.error) return setFormError(r.error)
    if (r.cart) replace(r.cart)
    setFormError(undefined)
    setStep(3)
  }

  if (!ready) return <Skeleton className="h-64 w-full" />
  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-7" />}
        title="Your bag is empty"
        description="Add something to your bag before checking out."
        action={
          <Button asChild>
            <Link href="/new">Shop new arrivals</Link>
          </Button>
        }
      />
    )
  }
  const soldOut = cart.items.some((i) => i.max_quantity === 0 || i.quantity > i.max_quantity)

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="grid content-start gap-8">
        {soldOut ? (
          <p role="alert" className="rounded-control bg-sale/10 p-4 font-semibold text-sale">
            Some items in your bag are out of stock.{" "}
            <Link href="/cart" className="underline">
              Update your bag
            </Link>{" "}
            to continue.
          </p>
        ) : null}

        <section aria-labelledby="step-1" className="grid gap-4">
          <StepHeader
            n={1}
            title="Contact and address"
            active={step === 1}
            done={step > 1}
            onEdit={() => setStep(1)}
          />
          {step === 1 ? (
            <form noValidate onSubmit={saveDetails} className="grid gap-5">
              {!signedIn ? (
                <p className="text-sm text-muted">
                  Have an account?{" "}
                  <Link
                    href="/login?next=/checkout"
                    className="font-semibold text-link underline underline-offset-4"
                  >
                    Sign in
                  </Link>{" "}
                  or continue as a guest.
                </p>
              ) : null}
              {addresses.length ? (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold">Saved addresses</p>
                  <div className="flex flex-wrap gap-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          setAddress({
                            first_name: a.first_name,
                            last_name: a.last_name,
                            phone: a.phone,
                            address_1: a.address_1,
                            address_2: a.address_2 ?? "",
                            city: a.city,
                            province: a.province,
                            postal_code: a.postal_code,
                          })
                        }
                        className="rounded-control border border-line-strong px-3 py-2 text-left text-sm hover:bg-teal-mist"
                      >
                        <b>{a.first_name}</b> · {a.address_1}, {a.city} {a.postal_code}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                hint="We'll send your order confirmation and invoice here."
                error={errors.email}
              />
              <AddressFields
                value={address}
                onChange={setAddress}
                errors={Object.fromEntries(
                  Object.entries(errors).map(([k, v]) => [k.replace(/^address\./, ""), v]),
                )}
                onPincode={setPin}
              />
              {formError ? (
                <p role="alert" className="text-sm font-semibold text-sale">
                  {formError}
                </p>
              ) : null}
              <SubmitRow pending={pending} label="Continue to delivery" />
            </form>
          ) : (
            <address className="rounded-card border border-line bg-surface p-4 text-[15px] not-italic leading-relaxed">
              {email}
              <br />
              <b>
                {address.first_name} {address.last_name}
              </b>
              , {address.address_1}
              {address.address_2 ? `, ${address.address_2}` : ""}, {address.city},{" "}
              {address.province} {address.postal_code}
              <br />
              <span className="text-muted">Mobile {address.phone}</span>
            </address>
          )}
        </section>

        <section aria-labelledby="step-2" className="grid gap-4">
          <StepHeader
            n={2}
            title="Delivery"
            active={step === 2}
            done={step > 2}
            onEdit={() => setStep(2)}
          />
          {step === 2 ? (
            <fieldset className="grid gap-3">
              <legend className="sr-only">Delivery option</legend>
              {options.length === 0 ? (
                <p className="text-muted">Loading delivery options…</p>
              ) : null}
              {options.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-start gap-3 rounded-card border border-line-strong bg-surface p-4 has-[:checked]:border-link has-[:checked]:bg-teal-mist"
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={o.id}
                    checked={cart.shipping_method?.option_id === o.id}
                    onChange={() => void chooseOption(o.id)}
                    disabled={pending}
                    className="mt-1 size-4"
                  />
                  <span className="grid flex-1 gap-0.5">
                    <span className="flex justify-between gap-3 font-semibold">
                      {o.name}
                      <span>{o.amount === 0 ? "FREE" : inr(o.amount)}</span>
                    </span>
                    <span className="text-sm text-muted">
                      {[o.description, eta].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </label>
              ))}
              {formError ? (
                <p role="alert" className="text-sm font-semibold text-sale">
                  {formError}
                </p>
              ) : null}
            </fieldset>
          ) : step > 2 && cart.shipping_method ? (
            <p className="rounded-card border border-line bg-surface p-4 text-[15px]">
              <b>{cart.shipping_method.name}</b> ·{" "}
              {cart.shipping_method.amount === 0 ? "FREE" : inr(cart.shipping_method.amount)}
              {eta ? <span className="text-muted"> · {eta}</span> : null}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="step-3" className="grid gap-4">
          <StepHeader n={3} title="Payment" active={step === 3} done={false} />
          {step === 3 ? <PaymentStep cart={cart} onCartUpdate={replace} /> : null}
        </section>
      </div>

      <aside
        aria-label="Order summary"
        className="grid h-fit content-start gap-5 rounded-card border border-line bg-surface p-5 lg:sticky lg:top-24"
      >
        <h2 className="font-display text-lg font-extrabold">Order summary ({cart.item_count})</h2>
        <FreeShippingBar cart={cart} />
        <ul className="divide-y divide-line">
          {cart.items.map((l) => (
            <CartLineItem key={l.id} line={l} compact />
          ))}
        </ul>
        <CouponForm cart={cart} />
        <PriceBreakdown cart={cart} deliveryPending={!cart.shipping_method} />
      </aside>
    </div>
  )
}
