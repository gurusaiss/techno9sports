import { model } from "@medusajs/framework/utils"

export const BLOCK_TYPES = [
  "offer_strip",
  "hero_carousel",
  "usp_strip",
  "category_tiles",
  "product_rail",
  "technology_highlights",
  "promo_banner",
  "newsletter",
] as const
export type BlockType = (typeof BLOCK_TYPES)[number]

/**
 * One block on a storefront page (for example the homepage hero). `data` is validated per block
 * type by src/lib/content-blocks.ts. Blocks can be switched off or scheduled with starts_at and
 * ends_at.
 */
const ContentBlock = model
  .define("content_block", {
    id: model.id({ prefix: "cblk" }).primaryKey(),
    page: model.text().default("home"),
    type: model.enum([...BLOCK_TYPES]),
    /** Admin label, never shown to customers. */
    label: model.text(),
    position: model.number().default(0),
    is_active: model.boolean().default(true),
    starts_at: model.dateTime().nullable(),
    ends_at: model.dateTime().nullable(),
    data: model.json(),
  })
  .indexes([{ on: ["page", "position"] }])

export default ContentBlock
