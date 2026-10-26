"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { Button, EmptyState, Skeleton } from "@t9/ui"
import { CartLineItem, CouponForm, FreeShippingBar, PriceBreakdown } from "./cart-parts"
import { useCart } from "./cart-provider"

export function BagView() {
  const { cart, ready } = useCart()
  if (!ready) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }
  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-7" />}
        title="Your bag is empty"
        description="Pick something you'll love running in."
        action={
          <Button asChild>
            <Link href="/new">Shop new arrivals</Link>
          </Button>
        }
      />
    )
  }
  const blocked = cart.items.some((i) => i.max_quantity === 0 || i.quantity > i.max_quantity)
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-4">
        <FreeShippingBar cart={cart} />
        <ul className="divide-y divide-line">
          {cart.items.map((l) => (
            <CartLineItem key={l.id} line={l} />
          ))}
        </ul>
      </div>
      <aside className="grid h-fit content-start gap-5 rounded-card border border-line bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-extrabold">Order summary</h2>
        <CouponForm cart={cart} />
        <PriceBreakdown cart={cart} deliveryPending={!cart.shipping_method} />
        {blocked ? (
          <p role="alert" className="text-sm font-semibold text-sale">
            Some items are out of stock. Update your bag to continue.
          </p>
        ) : null}
        <Button asChild size="lg" full aria-disabled={blocked}>
          <Link href="/checkout" aria-disabled={blocked} tabIndex={blocked ? -1 : undefined}>
            Checkout
          </Link>
        </Button>
        <Button asChild variant="link" className="justify-self-center">
          <Link href="/">Continue shopping</Link>
        </Button>
      </aside>
    </div>
  )
}
