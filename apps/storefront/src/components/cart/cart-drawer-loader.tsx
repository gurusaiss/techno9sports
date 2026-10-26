"use client"

import * as React from "react"
import { useCart } from "./cart-provider"

const CartDrawer = React.lazy(() =>
  import("./cart-drawer").then((m) => ({ default: m.CartDrawer })),
)

export function CartDrawerLoader() {
  const { drawerOpen } = useCart()
  const [everOpened, setEverOpened] = React.useState(false)
  if (drawerOpen && !everOpened) setEverOpened(true)
  if (!everOpened) return null
  return (
    <React.Suspense fallback={null}>
      <CartDrawer />
    </React.Suspense>
  )
}
