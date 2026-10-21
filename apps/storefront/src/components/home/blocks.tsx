import Link from "next/link"
import { Banknote, Flag, RotateCcw, ShieldCheck, Star, Truck, type LucideIcon } from "lucide-react"
import type { ContentBlock, ProductHit } from "@t9/types"
import { Button, Container, UspStrip } from "@t9/ui"
import { PlaceholderMedia, type PlaceholderKind } from "@/components/placeholder-media"
import { ProductCardView } from "@/components/product-card-view"
import { ProductImage } from "@/components/product-image"
import { getTechnologies, searchProducts } from "@/lib/catalog"
import type { ListingScope } from "@/lib/catalog-query"
import { parseListingParams, type SortKey } from "@/lib/listing-params"
import { safe } from "@/lib/safe"
import { HeroBlock } from "./hero"
import { NewsletterForm } from "./newsletter-form"
import { TONE_ART, TONE_CLASS } from "./tone"

type Of<T extends ContentBlock["type"]> = Extract<ContentBlock, { type: T }>["data"]

const ICONS: Record<Of<"usp_strip">["items"][number]["icon"], LucideIcon> = {
  truck: Truck,
  cash: Banknote,
  return: RotateCcw,
  flag: Flag,
  shield: ShieldCheck,
  star: Star,
}

/** Placeholder glyph for a category tile that has no image yet. */
function glyphFor(href: string): PlaceholderKind {
  if (href.startsWith("/frames")) return "frames"
  if (href.startsWith("/accessories")) return "cap"
  if (href.startsWith("/women")) return "bra"
  return "tee"
}

function CategoryTiles({ data }: { data: Of<"category_tiles"> }) {
  return (
    <Container className="pt-10">
      <h2 className="mb-4 font-display text-[clamp(24px,4vw,34px)] font-extrabold leading-tight">
        {data.heading}
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {data.tiles.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="group relative block aspect-[1/1.1] overflow-hidden rounded-card shadow-raised"
            >
              {t.image ? (
                <ProductImage
                  src={t.image.url}
                  alt=""
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <PlaceholderMedia
                  kind={glyphFor(t.href)}
                  bg={TONE_ART[t.tone].bg}
                  fg={TONE_ART[t.tone].fg}
                  label=""
                />
              )}
              <span className="absolute bottom-3 left-3 rounded-control bg-surface px-3 py-0.5 font-display text-xl font-bold text-fg">
                {t.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  )
}

async function ProductRail({
  data,
  techNames,
}: {
  data: Of<"product_rail">
  techNames: Record<string, string>
}) {
  const q = data.query
  const scope: ListingScope = {
    tags: q.tags,
    collection: q.collection,
    categories: q.categories,
    technologies: q.technologies,
    maxPrice: q.max_price,
    onSale: q.on_sale,
  }
  const sort: SortKey = q.sort
  const params = { ...parseListingParams({}), sort }
  const result = await safe(() => searchProducts(scope, params, q.limit), null)
  if (!result || !result.items.length) return null
  const items: ProductHit[] = result.items
  return (
    <Container className="pt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-[clamp(24px,4vw,34px)] font-extrabold leading-tight">
          {data.heading}
        </h2>
        {data.link ? (
          <Link href={data.link.href} className="font-semibold underline underline-offset-4">
            {data.link.label}
          </Link>
        ) : null}
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
        {items.map((hit) => (
          <li key={hit.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-auto">
            <ProductCardView hit={hit} techNames={techNames} />
          </li>
        ))}
      </ul>
    </Container>
  )
}

function Promo({ data }: { data: Of<"promo_banner"> }) {
  return (
    <Container className="pt-10">
      <div
        className={`grid gap-4 rounded-panel p-6 md:grid-cols-[1.4fr_1fr] md:items-center md:p-10 ${TONE_CLASS[data.tone]}`}
      >
        <div className="grid gap-2">
          <h2 className="font-display text-[clamp(26px,4vw,40px)] font-extrabold leading-tight">
            {data.heading}
          </h2>
          {data.text ? <p className="max-w-[50ch] text-[17px] opacity-90">{data.text}</p> : null}
        </div>
        <div className="md:justify-self-end">
          <Button asChild>
            <Link href={data.cta.href}>{data.cta.label}</Link>
          </Button>
        </div>
      </div>
    </Container>
  )
}

async function Technologies({ data }: { data: Of<"technology_highlights"> }) {
  const all = await safe(getTechnologies, [])
  const list = data.handles.length ? all.filter((t) => data.handles.includes(t.handle)) : all
  if (!list.length) return null
  return (
    <section className="mt-10 bg-navy py-8 text-white">
      <Container>
        <h2 className="mb-4 font-display text-[clamp(24px,4vw,34px)] font-extrabold leading-tight">
          {data.heading}
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-5">
          {list.map((t) => (
            <li key={t.handle}>
              <Link
                href={`/technology/${t.handle}`}
                className="grid h-full gap-1 rounded-card border border-navy-line bg-navy-soft p-4 hover:border-coral-tint"
              >
                <b className="font-display text-xl text-coral-tint">{t.name}</b>
                {t.tagline ? <span className="text-sm opacity-90">{t.tagline}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

export async function HomeBlocks({ blocks }: { blocks: ContentBlock[] }) {
  const technologies = await safe(getTechnologies, [])
  const techNames = Object.fromEntries(technologies.map((t) => [t.handle, t.name]))
  return (
    <>
      {blocks.map((b) => {
        switch (b.type) {
          case "hero_carousel":
            return <HeroBlock key={b.id} data={b.data} />
          case "usp_strip":
            return (
              <div key={b.id} className="mt-3 lg:mt-6">
                <UspStrip
                  items={b.data.items.map((i) => {
                    const Icon = ICONS[i.icon]
                    return { icon: <Icon />, title: i.title, text: i.text }
                  })}
                />
              </div>
            )
          case "category_tiles":
            return <CategoryTiles key={b.id} data={b.data} />
          case "product_rail":
            return <ProductRail key={b.id} data={b.data} techNames={techNames} />
          case "promo_banner":
            return <Promo key={b.id} data={b.data} />
          case "technology_highlights":
            return <Technologies key={b.id} data={b.data} />
          case "newsletter":
            return (
              <Container key={b.id} className="pt-10">
                <NewsletterForm heading={b.data.heading} text={b.data.text} />
              </Container>
            )
          default:
            return null
        }
      })}
    </>
  )
}
