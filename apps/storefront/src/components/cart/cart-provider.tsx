"use client"

import * as React from "react"
import type { StoreCart } from "@t9/types"
import { useToast } from "@t9/ui"
import {
  addToCartAction,
  applyCouponAction,
  getCartAction,
  removeCouponAction,
  removeLineAction,
  setQuantityAction,
  type CartResult,
} from "@/app/actions/cart"
import { loadBootstrap } from "@/lib/bootstrap"

interface CartState {
  cart: StoreCart | null
  ready: boolean
  busy: ReadonlySet<string>
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  add: (variantId: string, quantity?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>
  setQuantity: (lineId: string, quantity: number) => Promise<string | undefined>
  remove: (lineId: string) => Promise<void>
  applyCoupon: (code: string) => Promise<{ applied: boolean; error?: string; pending?: boolean }>
  pendingCoupon: string | null
  applyPendingCoupon: () => Promise<{ applied: boolean; error?: string } | null>
  removeCoupon: (code: string) => Promise<void>
  replace: (cart: StoreCart | null) => void
  reload: () => Promise<void>
}

const CartContext = React.createContext<CartState | null>(null)

export function useCart(): CartState {
  const ctx = React.useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>")
  return ctx
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const [cart, setCart] = React.useState<StoreCart | null>(null)
  const [ready, setReady] = React.useState(false)
  const [busy, setBusy] = React.useState<ReadonlySet<string>>(new Set())
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [pendingCoupon, setPendingCoupon] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    const r = await getCartAction()
    setCart(r.cart)
    setReady(true)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    void loadBootstrap().then((b) => {
      if (cancelled) return
      setCart(b.cart)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const track = React.useCallback(async <T,>(key: string, run: () => Promise<T>): Promise<T> => {
    setBusy((b) => new Set(b).add(key))
    try {
      return await run()
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        next.delete(key)
        return next
      })
    }
  }, [])

  const apply = (r: CartResult) => setCart(r.cart)

  const value = React.useMemo<CartState>(
    () => ({
      cart,
      ready,
      busy,
      drawerOpen,
      setDrawerOpen,
      add: async (variantId, quantity = 1, opts = {}) => {
        const r = await track("add", () => addToCartAction(variantId, quantity))
        apply(r)
        if (r.error) {
          toast({ title: r.error, variant: "error" })
          return false
        }
        if (opts.openDrawer !== false) setDrawerOpen(true)
        return true
      },
      setQuantity: async (lineId, quantity) => {
        const r = await track(lineId, () => setQuantityAction(lineId, quantity))
        apply(r)
        return r.error
      },
      remove: async (lineId) => {
        const r = await track(lineId, () => removeLineAction(lineId))
        apply(r)
        if (r.error) toast({ title: r.error, variant: "error" })
      },
      pendingCoupon,
      applyPendingCoupon: async () => {
        if (!pendingCoupon) return null
        const code = pendingCoupon
        const r = await track("coupon", () => applyCouponAction(code))
        apply(r)
        setPendingCoupon(null)
        if (r.applied) toast({ title: `${code} applied`, variant: "success" })
        return { applied: !!r.applied, error: r.error }
      },
      applyCoupon: async (code) => {
        const r = await track("coupon", () => applyCouponAction(code))
        apply(r)
        if (r.reason === "email_required") {
          setPendingCoupon(code.trim().toUpperCase())
          return { applied: false, pending: true, error: r.error }
        }
        return { applied: !!r.applied, error: r.error }
      },
      removeCoupon: async (code) => {
        const r = await track("coupon", () => removeCouponAction(code))
        apply(r)
      },
      replace: setCart,
      reload,
    }),
    [cart, ready, busy, drawerOpen, pendingCoupon, track, toast, reload],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
