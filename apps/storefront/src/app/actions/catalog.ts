"use server"

import type { AvailabilityStatus } from "@t9/types"
import { getProduct, getProductsByIds } from "@/lib/catalog"

export interface QuickAddData {
  title: string
  colors: { name: string; hex: string | null }[]
  variants: {
    id: string
    size: string | null
    color: string | null
    price: number | null
    status: AvailabilityStatus
  }[]
}

export async function getQuickAddAction(handle: string): Promise<QuickAddData | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(handle)) return null
  try {
    const p = await getProduct(handle)
    if (!p) return null
    const colors = p.options.find((o) => o.title === "Color")?.values ?? []
    return {
      title: p.title,
      colors: colors.map((c) => ({ name: c, hex: p.color_hex[c] ?? null })),
      variants: p.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        price: v.price,
        status: v.availability.status,
      })),
    }
  } catch {
    return null
  }
}

export async function getProductsByIdsAction(ids: string[]) {
  const clean = ids
    .filter((i) => typeof i === "string" && /^prod_[A-Za-z0-9]+$/.test(i))
    .slice(0, 100)
  try {
    return await getProductsByIds(clean)
  } catch {
    return []
  }
}
