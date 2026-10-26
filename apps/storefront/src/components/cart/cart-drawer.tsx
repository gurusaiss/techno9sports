"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { Button, EmptyState, Sheet, SheetContent, Skeleton } from "@t9/ui"
import { inr } from "@/lib/format-money"
import { CartLineItem, CouponForm, FreeShippingBar, PriceBreakdown } from "./cart-parts"
import { useCart } from "./cart-provider"

export function CartDrawer() {
  const { cart, ready, drawerOpen, setDrawerOpen } = useCart()
  const count = cart?.item_count ?? 0
  const hasSoldOut = !!cart?.items.some((i) => i.max_quantity === 0)
  const close = () => setDrawerOpen(false)

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      {drawerOpen ? (
        <SheetContent
          side="right"
          title={count ? `Your bag (${count})` : "Your bag"}
          className="sm:max-w-md"
          footer={
            cart && count > 0 ? (
              <div className="grid gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">
                    {cart.shipping_method ? "Total" : "Subtotal"}
                    {cart.shipping_method ? null : (
                      <span className="block text-xs font-normal text-muted">
                        Delivery added at checkout
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-extrabold">{inr(cart.total)}</span>
                </div>
                <Button asChild size="lg" full aria-disabled={hasSoldOut}>
                  <Link href="/checkout" onClick={close}>
                    Checkout
                  </Link>
                </Button>
                <Button asChild variant="link" className="justify-self-center">
                  <Link href="/cart" onClick={close}>
                    View bag
                  </Link>
                </Button>
              </div>
            ) : undefined
          }
        >
          {!ready ? (
            <div className="grid gap-4 py-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !cart || count === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="size-7" />}
              title="Your bag is empty"
              description="Pick something you'll love running in."
              action={
                <Button asChild onClick={close}>
                  <Link href="/new">Shop new arrivals</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4">
              <FreeShippingBar cart={cart} />
              <ul className="divide-y divide-line">
                {cart.items.map((l) => (
                  <CartLineItem key={l.id} line={l} compact />
                ))}
              </ul>
              <CouponForm cart={cart} />
              <PriceBreakdown cart={cart} deliveryPending={!cart.shipping_method} />
            </div>
          )}
        </SheetContent>
      ) : null}
    </Sheet>
  )
}
