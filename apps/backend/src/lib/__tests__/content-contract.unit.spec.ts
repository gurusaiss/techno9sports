import type { z } from "@medusajs/framework/zod"
import type { ContentBlock } from "@t9/types"
import {
  categoryTiles,
  heroCarousel,
  newsletter,
  offerStrip,
  productRail,
  promoBanner,
  technologyHighlights,
  uspStrip,
} from "../content-blocks"

type Data<T extends ContentBlock["type"]> = Extract<ContentBlock, { type: T }>["data"]

// Compile-time contract: what the zod schemas produce must be assignable to the shared storefront
// types. If a schema changes shape, `tsc --noEmit` (pnpm typecheck) fails here.
export const _contract = (
  a: z.infer<typeof offerStrip>,
  b: z.infer<typeof heroCarousel>,
  c: z.infer<typeof uspStrip>,
  d: z.infer<typeof categoryTiles>,
  e: z.infer<typeof productRail>,
  f: z.infer<typeof technologyHighlights>,
  g: z.infer<typeof promoBanner>,
  h: z.infer<typeof newsletter>,
) => {
  const checks: [
    Data<"offer_strip">,
    Data<"hero_carousel">,
    Data<"usp_strip">,
    Data<"category_tiles">,
    Data<"product_rail">,
    Data<"technology_highlights">,
    Data<"promo_banner">,
    Data<"newsletter">,
  ] = [a, b, c, d, e, f, g, h]
  return checks
}

describe("content contract", () => {
  it("is enforced at compile time", () => {
    expect(typeof _contract).toBe("function")
  })
})
