import type { ExecArgs } from "@medusajs/framework/types"
import { MedusaError, ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { COLORS } from "../seed/catalog-data"
import { bannerImage, type BannerTone } from "../seed/placeholder-images"
import { CONTENT_MODULE } from "../modules/content"
import type ContentModuleService from "../modules/content/service"
import { parseBlockData } from "../lib/content-blocks"

/**
 * Placeholder homepage blocks. Copy, prices and offers are sample text for the owner to replace.
 * Skips when the homepage already has blocks; pass `reset` to delete them and start again.
 *   pnpm --filter @t9/backend exec medusa exec ./src/scripts/seed-content.ts [reset]
 */
export default async function seedContent({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: ContentModuleService = container.resolve(CONTENT_MODULE)
  const fileModule = container.resolve(Modules.FILE)

  const existing = await service.listContentBlocks({ page: "home" })
  if (existing.length && args?.[0] !== "reset") {
    logger.info(`Homepage already has ${existing.length} blocks. Pass "reset" to replace them.`)
    return
  }
  if (existing.length) await service.deleteContentBlocks(existing.map((b) => b.id))

  const upload = async (name: string, buf: Buffer) => {
    const [file] = await fileModule.createFiles([
      { filename: name, mimeType: "image/webp", content: buf.toString("binary"), access: "public" },
    ])
    return file!.url
  }

  const slides: {
    tone: BannerTone
    ui: "mist" | "coral" | "sand"
    items: { glyph: "tee" | "pants" | "frames" | "bra"; color: string }[]
    heading: string
    eyebrow: string
    text: string
    cta: [string, string]
    cta2?: [string, string]
    alt: string
  }[] = [
    {
      tone: "sunrise",
      ui: "mist",
      items: [
        { glyph: "tee", color: COLORS.Navy! },
        { glyph: "pants", color: COLORS.White! },
      ],
      eyebrow: "Move in the morning light",
      heading: "Gear for every sunrise run.",
      text: "Light, breathable activewear for Indian weather. Honest prices from ₹299.",
      cta: ["Shop men", "/men"],
      cta2: ["Shop women", "/women"],
      alt: "Placeholder: a navy tee and white joggers on a sunrise gradient",
    },
    {
      tone: "dune",
      ui: "coral",
      items: [
        { glyph: "bra", color: COLORS.Black! },
        { glyph: "pants", color: COLORS.Maroon! },
      ],
      eyebrow: "Studio and yoga",
      heading: "Stretch further. Feel the flow.",
      text: "High-rise leggings and supportive sports bras with four-way stretch.",
      cta: ["Shop leggings", "/women/leggings"],
      alt: "Placeholder: a sports bra and leggings on a warm gradient",
    },
    {
      tone: "lagoon",
      ui: "sand",
      items: [{ glyph: "frames", color: COLORS.Navy! }],
      eyebrow: "New: sports frames",
      heading: "See the game clearly.",
      text: "UV400 sports frames for running, cycling and cricket.",
      cta: ["Shop frames", "/frames"],
      alt: "Placeholder: sports frames on a teal gradient",
    },
  ]

  const heroSlides: Record<string, unknown>[] = []
  for (const [i, s] of slides.entries()) {
    const desktop = await upload(
      `hero-${i + 1}-desktop.webp`,
      await bannerImage(s.tone, s.items, 1600, 700),
    )
    const mobile = await upload(
      `hero-${i + 1}-mobile.webp`,
      await bannerImage(s.tone, s.items, 800, 900),
    )
    heroSlides.push({
      eyebrow: s.eyebrow,
      heading: s.heading,
      text: s.text,
      primary_cta: { label: s.cta[0], href: s.cta[1] },
      ...(s.cta2 ? { secondary_cta: { label: s.cta2[0], href: s.cta2[1] } } : {}),
      image_desktop: { url: desktop, alt: s.alt },
      image_mobile: { url: mobile, alt: s.alt },
      tone: s.ui,
    })
  }

  const blocks: { type: string; label: string; data: Record<string, unknown> }[] = [
    {
      type: "offer_strip",
      label: "Announcement bar",
      data: { text: "Extra 10% off your first order with code FIRST10 · Free shipping above ₹999" },
    },
    { type: "hero_carousel", label: "Hero carousel", data: { slides: heroSlides } },
    {
      type: "usp_strip",
      label: "Benefits strip",
      data: {
        items: [
          { icon: "truck", title: "Free shipping", text: "above ₹999" },
          { icon: "cash", title: "Cash on delivery", text: "on eligible pincodes" },
          { icon: "return", title: "Easy returns", text: "7-day returns and exchange" },
          { icon: "flag", title: "Made in India", text: "for Indian weather" },
        ],
      },
    },
    {
      type: "category_tiles",
      label: "Shop by category",
      data: {
        heading: "Shop by category",
        tiles: [
          { label: "Men", href: "/men", tone: "mist" },
          { label: "Women", href: "/women", tone: "coral" },
          { label: "Frames", href: "/frames", tone: "navy" },
          { label: "Accessories", href: "/accessories", tone: "sand" },
        ],
      },
    },
    {
      type: "product_rail",
      label: "Bestsellers",
      data: {
        heading: "Bestsellers",
        link: { label: "See all", href: "/bestsellers" },
        query: { tags: ["bestseller"], sort: "bestseller", limit: 8 },
      },
    },
    {
      type: "promo_banner",
      label: "Under 499",
      data: {
        heading: "Everyday gear under ₹499",
        text: "Tees, tanks, shorts and caps that won't dent your wallet.",
        cta: { label: "Shop under ₹499", href: "/under-499" },
        tone: "navy",
      },
    },
    {
      type: "product_rail",
      label: "New arrivals",
      data: {
        heading: "New arrivals",
        link: { label: "See all", href: "/new" },
        query: { tags: ["new"], sort: "newest", limit: 8 },
      },
    },
    {
      type: "technology_highlights",
      label: "Shop by technology",
      data: { heading: "Shop by technology", handles: [] },
    },
    {
      type: "newsletter",
      label: "Newsletter",
      data: {
        heading: "Get 10% off your first order",
        text: "Join for early access to new drops and offers. Unsubscribe any time.",
      },
    },
  ]

  for (const [i, b] of blocks.entries()) {
    const parsed = parseBlockData(b.type, b.data)
    if (!parsed.success)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Seed block "${b.label}" is invalid: ${parsed.error}`,
      )
    await service.createContentBlocks({
      page: "home",
      type: b.type as never,
      label: b.label,
      position: (i + 1) * 10,
      is_active: true,
      data: parsed.data as Record<string, unknown>,
    })
  }
  logger.info(`Seeded ${blocks.length} homepage blocks`)
}
