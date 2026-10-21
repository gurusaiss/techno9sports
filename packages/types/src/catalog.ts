/**
 * The storefront API contract. The backend's response builders are typed with these, and the
 * storefront consumes them, so the two can't drift apart without a type error.
 * Prices are rupees (Medusa's unit), GST-inclusive.
 */
export type AvailabilityStatus = "in_stock" | "low_stock" | "out_of_stock"

export interface StoreVariant {
  id: string
  sku: string | null
  title: string
  size: string | null
  color: string | null
  price: number | null
  availability: { status: AvailabilityStatus; low_quantity?: number }
}

export interface StoreImage {
  url: string
  color: string | null
  view: string | null
}

export interface StoreTechnology {
  handle: string
  name: string
  tagline: string | null
  description: string | null
}

export interface StoreSizeChart {
  handle: string
  name: string
  unit: string
  columns: string[]
  sizes: string[]
  rows: Record<string, Record<string, string>>
  how_to_measure: string | null
  notes: string | null
}

export interface StoreProduct {
  id: string
  handle: string
  title: string
  subtitle: string | null
  description: string | null
  thumbnail: string | null
  created_at: string
  price: number | null
  mrp: number | null
  discount_percent: number
  gender: string | null
  attributes: Record<string, string>
  features: string[]
  fabric: string | null
  color_hex: Record<string, string>
  in_stock: boolean
  images: StoreImage[]
  options: { title: string; values: string[] }[]
  variants: StoreVariant[]
  categories: {
    handle: string
    name: string
    parent: { handle: string; name: string } | null
  }[]
  collection: { handle: string; title: string } | null
  type: string | null
  tags: string[]
  technologies: StoreTechnology[]
  size_chart: StoreSizeChart | null
}

/** A product as it comes back from the search index (listing cards). */
export interface ProductHit {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  min_price_inr: number | null
  mrp: number | null
  discount_percent: number
  in_stock: boolean
  tags: string[]
  technologies: string[]
  color_swatches: string[]
  fit: string | null
  gender: string | null
  product_type: string | null
  created_at: number | string
}

export interface Tone {
  tone: "mist" | "coral" | "sand" | "navy" | "teal"
}
export interface BlockImage {
  url: string
  alt: string
}
export interface BlockLink {
  label: string
  href: string
}

export type ContentBlock =
  | { id: string; type: "offer_strip"; data: { text: string; link?: BlockLink } }
  | {
      id: string
      type: "hero_carousel"
      data: {
        slides: {
          eyebrow?: string
          heading: string
          text?: string
          primary_cta: BlockLink
          secondary_cta?: BlockLink
          image_desktop: BlockImage
          image_mobile?: BlockImage
          tone: Tone["tone"]
        }[]
      }
    }
  | {
      id: string
      type: "usp_strip"
      data: {
        items: {
          icon: "truck" | "cash" | "return" | "flag" | "shield" | "star"
          title: string
          text: string
        }[]
      }
    }
  | {
      id: string
      type: "category_tiles"
      data: {
        heading: string
        tiles: { label: string; href: string; image?: BlockImage; tone: Tone["tone"] }[]
      }
    }
  | {
      id: string
      type: "product_rail"
      data: {
        heading: string
        link?: BlockLink
        query: {
          tags?: string[]
          collection?: string
          categories?: string[]
          technologies?: string[]
          max_price?: number
          on_sale?: boolean
          sort: "bestseller" | "newest" | "discount" | "price_asc" | "price_desc"
          limit: number
        }
      }
    }
  | {
      id: string
      type: "technology_highlights"
      data: { heading: string; handles: string[] }
    }
  | {
      id: string
      type: "promo_banner"
      data: {
        heading: string
        text?: string
        cta: BlockLink
        image?: BlockImage
        tone: Tone["tone"]
      }
    }
  | { id: string; type: "newsletter"; data: { heading: string; text?: string } }

export interface CategoryNode {
  id: string
  name: string
  handle: string
  children: CategoryNode[]
}
