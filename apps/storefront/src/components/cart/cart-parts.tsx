"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Tag, Trash2, X } from "lucide-react"
import type { CartLine, StoreCart } from "@t9/types"
import { Button, Price } from "@t9/ui"
import { inr } from "@/lib/format-money"
import { rupeesToPaise } from "@/lib/money"
import { useCart } from "./cart-provider"

export function FreeShippingBar({ cart }: { cart: StoreCart }) {
  const f = cart.free_shipping
  if (f.threshold === null || cart.items.length === 0) return null
  const pct = Math.min(100, Math.round(((f.threshold - f.remaining) / f.threshold) * 100))
  return (
    <div className="grid gap-1.5 rounded-control bg-teal-mist p-3 text-sm">
      <p className="font-semibold">
        {f.reached
          ? "You've unlocked free delivery."
          : `Add ${inr(f.remaining)} more for free delivery.`}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-full bg-white"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function CartLineItem({ line, compact = false }: { line: CartLine; compact?: boolean }) {
  const { setQuantity, remove, busy } = useCart()
  const [error, setError] = React.useState<string>()
  const pending = busy.has(line.id)
  const soldOut = line.max_quantity === 0
  const href = `/products/${line.product_handle}`

  const change = async (next: number) => {
    setError(undefined)
    if (next < 1) return
    setError(await setQuantity(line.id, next))
  }

  return (
    <li
      className="grid grid-cols-[76px_1fr] gap-3 py-4 sm:grid-cols-[96px_1fr]"
      aria-busy={pending}
    >
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-[4/5] overflow-hidden rounded-control bg-teal-soft"
      >
        {line.thumbnail ? (
          <Image src={line.thumbnail} alt="" fill sizes="96px" className="object-cover" />
        ) : null}
      </Link>
      <div className="grid min-w-0 content-start gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="text-[15px] font-semibold leading-snug">
            {line.title}
          </Link>
          <button
            type="button"
            onClick={() => void remove(line.id)}
            disabled={pending}
            aria-label={`Remove ${line.title} from bag`}
            className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-teal-mist hover:text-fg disabled:opacity-50"
          >
            {compact ? (
              <X className="size-4" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
          </button>
        </div>
        <p className="text-[13px] text-muted">
          {[line.color, line.size && `Size ${line.size}`].filter(Boolean).join(" · ")}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div
            role="group"
            aria-label={`Quantity for ${line.title}`}
            className="inline-flex items-center rounded-full border border-line"
          >
            <button
              type="button"
              onClick={() => void change(line.quantity - 1)}
              disabled={pending || line.quantity <= 1}
              aria-label="Decrease quantity"
              className="grid size-10 place-items-center rounded-full hover:bg-teal-mist disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="min-w-8 text-center text-[15px] font-bold" aria-live="polite">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => void change(line.quantity + 1)}
              disabled={pending || line.quantity >= line.max_quantity}
              aria-label="Increase quantity"
              className="grid size-10 place-items-center rounded-full hover:bg-teal-mist disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <Price
            pricePaise={rupeesToPaise(line.unit_price * line.quantity)}
            mrpPaise={line.mrp ? rupeesToPaise(line.mrp * line.quantity) : undefined}
          />
        </div>
        {soldOut ? (
          <p role="alert" className="text-[13px] font-semibold text-sale">
            This size is sold out. Remove it to continue.
          </p>
        ) : line.quantity >= line.max_quantity ? (
          <p className="text-[13px] text-muted">That&apos;s all we have in this size.</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-[13px] font-semibold text-sale">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  )
}

export function CouponForm({ cart }: { cart: StoreCart }) {
  const { applyCoupon, removeCoupon, busy } = useCart()
  const [code, setCode] = React.useState("")
  const [message, setMessage] = React.useState<string>()
  const [ok, setOk] = React.useState(false)
  const pending = busy.has("coupon")
  const manual = cart.promotions.filter((p) => !p.automatic)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setMessage(undefined)
    const r = await applyCoupon(code)
    if (r.pending) {
      setOk(true)
      setMessage(r.error)
      setCode("")
    } else if (r.applied) {
      setOk(true)
      setMessage(`${code.trim().toUpperCase()} applied.`)
      setCode("")
    } else {
      setOk(false)
      setMessage(r.error ?? "Couldn't apply that code.")
    }
  }

  return (
    <div className="grid gap-2">
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="coupon-code">
          Coupon code
        </label>
        <div className="relative min-w-0 flex-1">
          <Tag
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id="coupon-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            placeholder="Coupon code"
            className="h-11 w-full rounded-full border border-line bg-surface pl-9 pr-3 text-[15px] uppercase outline-none focus:border-link"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          loading={pending}
          disabled={!code.trim()}
        >
          Apply
        </Button>
      </form>
      <p
        role="status"
        aria-live="polite"
        className={ok ? "text-sm font-semibold text-teal-ink" : "text-sm font-semibold text-sale"}
      >
        {message}
      </p>
      {cart.promotions.length ? (
        <ul className="grid gap-1.5">
          {cart.promotions.map((p) => (
            <li
              key={p.code}
              className="flex items-center justify-between gap-2 rounded-control bg-teal-mist px-3 py-2 text-sm"
            >
              <span>
                <b>{p.code}</b>
                {p.description ? <span className="text-muted"> · {p.description}</span> : null}
              </span>
              {manual.some((m) => m.code === p.code) ? (
                <button
                  type="button"
                  onClick={() => void removeCoupon(p.code)}
                  aria-label={`Remove code ${p.code}`}
                  className="grid size-8 place-items-center rounded-full hover:bg-white"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : (
                <span className="text-xs text-muted">Automatic</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function PriceBreakdown({
  cart,
  deliveryPending = false,
}: {
  cart: StoreCart
  deliveryPending?: boolean
}) {
  const mrpDiscount = Math.max(0, Math.round((cart.mrp_total - cart.items_total) * 100) / 100)
  const rows: { label: string; value: React.ReactNode; tone?: "good" }[] = [
    { label: "Bag total (MRP)", value: inr(cart.mrp_total) },
  ]
  if (mrpDiscount > 0)
    rows.push({ label: "Discount on MRP", value: `−${inr(mrpDiscount)}`, tone: "good" })
  if (cart.discount_total > 0) {
    const codes = cart.promotions.map((p) => p.code).join(", ")
    rows.push({
      label: codes ? `Coupon (${codes})` : "Coupon",
      value: `−${inr(cart.discount_total)}`,
      tone: "good",
    })
  }
  rows.push({
    label: "Delivery",
    value: deliveryPending
      ? "Calculated next"
      : cart.shipping_total === 0 && cart.shipping_method
        ? "FREE"
        : inr(cart.shipping_total),
  })
  if (cart.cod_fee > 0) rows.push({ label: "Cash on delivery fee", value: inr(cart.cod_fee) })

  return (
    <div className="grid gap-2 text-[15px]">
      <dl className="grid gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3">
            <dt className="text-muted">{r.label}</dt>
            <dd className={r.tone === "good" ? "font-semibold text-teal-ink" : "font-semibold"}>
              {r.value}
            </dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-3 border-t border-line pt-3 text-lg">
          <dt className="font-extrabold">
            {deliveryPending ? "Total (before delivery)" : "Total"}
          </dt>
          <dd className="font-extrabold">{inr(cart.total)}</dd>
        </div>
      </dl>
      <p className="text-[13px] text-muted">Inclusive of all taxes (GST {inr(cart.tax_total)}).</p>
      {cart.savings > 0 ? (
        <p className="rounded-control bg-teal-mist px-3 py-2 text-sm font-semibold text-teal-ink">
          You&apos;re saving {inr(cart.savings)} on this order.
        </p>
      ) : null}
    </div>
  )
}
