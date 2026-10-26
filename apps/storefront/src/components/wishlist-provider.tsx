"use client"

import * as React from "react"
import { useToast } from "@t9/ui"
import { getWishlistAction, mergeWishlistAction, toggleWishlistAction } from "@/app/actions/account"
import { useSession } from "./session-provider"

const KEY = "t9.wishlist"

function readLocal(): string[] {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]")
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 200) : []
  } catch {
    return []
  }
}
function writeLocal(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* storage blocked: the list lives in memory for this visit */
  }
}

interface WishlistState {
  ids: ReadonlySet<string>
  has: (productId: string) => boolean
  toggle: (productId: string) => Promise<void>
  guestIds: () => string[]
}

const WishlistContext = React.createContext<WishlistState | null>(null)

export function useWishlist(): WishlistState {
  const ctx = React.useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>")
  return ctx
}

/** Guests keep the list in this browser; signed-in customers keep it on the server. */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { signedIn, ready } = useSession()
  const { toast } = useToast()
  const [ids, setIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!ready) return
    let cancelled = false
    void (async () => {
      if (signedIn) {
        const local = readLocal()
        const server = local.length ? await mergeWishlistAction(local) : await getWishlistAction()
        if (!cancelled) {
          if (local.length) writeLocal([])
          setIds(server)
        }
      } else if (!cancelled) {
        setIds(readLocal())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [signedIn, ready])

  const value = React.useMemo<WishlistState>(() => {
    const set = new Set(ids)
    return {
      ids: set,
      has: (id) => set.has(id),
      guestIds: readLocal,
      toggle: async (id) => {
        const saving = !set.has(id)
        const next = saving ? [id, ...ids] : ids.filter((x) => x !== id)
        setIds(next)
        if (signedIn) {
          const r = await toggleWishlistAction(id, saving)
          if (!r.ok) {
            setIds(ids)
            toast({ title: "Couldn't update your wishlist", variant: "error" })
          }
        } else {
          writeLocal(next)
        }
      },
    }
  }, [ids, signedIn, toast])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
