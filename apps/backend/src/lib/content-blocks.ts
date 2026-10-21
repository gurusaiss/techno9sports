import { z } from "@medusajs/framework/zod"

/**
 * Validation for the `data` of each content block type. The admin API rejects bad data, and the
 * store API drops (and logs) any stored block that no longer validates, so one broken block can
 * never take the homepage down.
 */
const href = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (v) => v.startsWith("/") || /^https:\/\//.test(v),
    "Use a site path (/men) or an https link",
  )
  .refine((v) => !v.startsWith("//"), "Protocol-relative links are not allowed")

const image = z.object({ url: z.string().url().max(600), alt: z.string().max(200) })
const link = z.object({ label: z.string().min(1).max(40), href })
const tone = z.enum(["mist", "coral", "sand", "navy", "teal"]).default("mist")

export const offerStrip = z.object({ text: z.string().min(1).max(160), link: link.optional() })

export const heroCarousel = z.object({
  slides: z
    .array(
      z.object({
        eyebrow: z.string().max(60).optional(),
        heading: z.string().min(1).max(90),
        text: z.string().max(220).optional(),
        primary_cta: link,
        secondary_cta: link.optional(),
        image_desktop: image,
        image_mobile: image.optional(),
        tone,
      }),
    )
    .min(1)
    .max(6),
})

export const uspStrip = z.object({
  items: z
    .array(
      z.object({
        icon: z.enum(["truck", "cash", "return", "flag", "shield", "star"]),
        title: z.string().min(1).max(40),
        text: z.string().min(1).max(60),
      }),
    )
    .min(1)
    .max(4),
})

export const categoryTiles = z.object({
  heading: z.string().min(1).max(60),
  tiles: z
    .array(z.object({ label: z.string().min(1).max(30), href, image: image.optional(), tone }))
    .min(2)
    .max(8),
})

export const productRail = z.object({
  heading: z.string().min(1).max(60),
  link: link.optional(),
  /** Resolved by the storefront through search: tags, collection and so on are index fields. */
  query: z.object({
    tags: z.array(z.string().max(40)).max(5).optional(),
    collection: z.string().max(80).optional(),
    categories: z.array(z.string().max(80)).max(5).optional(),
    technologies: z.array(z.string().max(80)).max(5).optional(),
    max_price: z.number().positive().max(100000).optional(),
    on_sale: z.boolean().optional(),
    sort: z
      .enum(["bestseller", "newest", "discount", "price_asc", "price_desc"])
      .default("bestseller"),
    limit: z.number().int().min(2).max(12).default(8),
  }),
})

export const technologyHighlights = z.object({
  heading: z.string().min(1).max(60),
  /** Technology handles; empty means all active technologies. */
  handles: z.array(z.string().max(80)).max(8).default([]),
})

export const promoBanner = z.object({
  heading: z.string().min(1).max(90),
  text: z.string().max(220).optional(),
  cta: link,
  image: image.optional(),
  tone,
})

export const newsletter = z.object({
  heading: z.string().min(1).max(80),
  text: z.string().max(200).optional(),
})

export const BLOCK_SCHEMAS = {
  offer_strip: offerStrip,
  hero_carousel: heroCarousel,
  usp_strip: uspStrip,
  category_tiles: categoryTiles,
  product_rail: productRail,
  technology_highlights: technologyHighlights,
  promo_banner: promoBanner,
  newsletter,
} as const

export type BlockTypeName = keyof typeof BLOCK_SCHEMAS

export function parseBlockData(type: string, data: unknown) {
  const schema = BLOCK_SCHEMAS[type as BlockTypeName]
  if (!schema) return { success: false as const, error: `Unknown block type "${type}"` }
  const result = schema.safeParse(data)
  return result.success
    ? { success: true as const, data: result.data }
    : {
        success: false as const,
        error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }
}

export interface Windowed {
  is_active: boolean
  starts_at?: Date | string | null
  ends_at?: Date | string | null
}

/** Active, and inside its schedule window when one is set. */
export function isLive(block: Windowed, now: Date = new Date()): boolean {
  if (!block.is_active) return false
  if (block.starts_at && new Date(block.starts_at) > now) return false
  if (block.ends_at && new Date(block.ends_at) <= now) return false
  return true
}
