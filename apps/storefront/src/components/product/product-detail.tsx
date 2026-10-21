"use client"

import * as React from "react"
import type { StoreProduct, StoreVariant } from "@t9/types"
import {
  Badge,
  BottomSheet,
  Button,
  ColorSwatches,
  ImageGallery,
  Price,
  SizeChartTable,
  SizeSelector,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@t9/ui"
import { ProductImage } from "@/components/product-image"
import { colorHex } from "@/config/colors"
import { rupeesToPaise } from "@/lib/money"
import { setUrlParam, useUrlParam } from "@/lib/use-url-param"

const PINCODE = /^[1-9][0-9]{5}$/

function variantFor(
  p: StoreProduct,
  size: string | null,
  color: string | null,
): StoreVariant | undefined {
  return p.variants.find((v) => v.size === size && v.color === color)
}

/**
 * Product page body: colour and size selection against live availability, gallery that follows
 * the colour, size guide, delivery check shell and a sticky mobile bar. Bag and checkout arrive
 * in Phase 3, delivery estimates with Shiprocket in Phase 5.
 */
export function ProductDetail({ product }: { product: StoreProduct }) {
  const { toast } = useToast()
  const colors = product.options.find((o) => o.title === "Color")?.values ?? []
  const sizes = product.options.find((o) => o.title === "Size")?.values ?? []

  const firstInStockColor =
    colors.find((c) =>
      product.variants.some((v) => v.color === c && v.availability.status !== "out_of_stock"),
    ) ??
    colors[0] ??
    null
  // The colour lives in the URL (?color=Navy) so a shared link opens the same colour.
  const urlColor = useUrlParam("color")
  const color = urlColor && colors.includes(urlColor) ? urlColor : firstInStockColor
  const [size, setSize] = React.useState<string | null>(null)
  const [sizeError, setSizeError] = React.useState(false)
  const [guide, setGuide] = React.useState(false)
  const [galleryIndex, setGalleryIndex] = React.useState(0)
  const [pin, setPin] = React.useState("")
  const [pinMessage, setPinMessage] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [ctaVisible, setCtaVisible] = React.useState(true)
  const [endVisible, setEndVisible] = React.useState(false)
  const ctaRef = React.useRef<HTMLDivElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)
  const sizeGroupRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const cta = ctaRef.current
    const end = endRef.current
    if (!cta || !end) return
    const a = new IntersectionObserver(([e]) => setCtaVisible(Boolean(e?.isIntersecting)))
    const b = new IntersectionObserver(([e]) => setEndVisible(Boolean(e?.isIntersecting)))
    a.observe(cta)
    b.observe(end)
    return () => {
      a.disconnect()
      b.disconnect()
    }
  }, [])

  const chooseColor = (c: string) => {
    setUrlParam("color", c)
    setGalleryIndex(0)
    // Keep the size if it exists in the new colour; otherwise ask again.
    if (size && variantFor(product, size, c)?.availability.status === "out_of_stock") setSize(null)
  }

  const variant = variantFor(product, size, color)
  const soldOutSize = (s: string) => {
    const v = variantFor(product, s, color)
    return !v || v.availability.status === "out_of_stock"
  }
  const colorOptions = colors.map((c) => ({
    value: c,
    name: c,
    hex: product.color_hex[c] ?? colorHex(c),
    soldOut: product.variants
      .filter((v) => v.color === c)
      .every((v) => v.availability.status === "out_of_stock"),
  }))

  const colorImages = product.images.filter((i) => i.color === color)
  const images = (colorImages.length ? colorImages : product.images).map((i) => ({
    src: i.url,
    alt: `${product.title}${color ? `, ${color}` : ""}${i.view ? `, ${i.view} view` : ""}`,
  }))

  const price = variant?.price ?? product.price ?? 0
  const mrp = product.mrp ?? undefined
  const allSold = !product.in_stock
  const colorSold = colorOptions.find((c) => c.value === color)?.soldOut ?? false

  const requireSize = (): boolean => {
    if (size) return true
    setSizeError(true)
    sizeGroupRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    sizeGroupRef.current?.querySelector<HTMLElement>('[role="radio"]:not([disabled])')?.focus()
    return false
  }
  const addToBag = () => {
    if (!requireSize()) return
    toast({
      title: "Bag opens in Phase 3",
      description: `${product.title}, ${size} / ${color}. Cart and checkout are the next phase.`,
    })
  }
  const notify = () =>
    toast({
      title: "Back-in-stock alerts open soon",
      description: "We'll add this in a later phase.",
      variant: "default",
    })

  const cta =
    colorSold || allSold ? (
      <Button size="lg" full variant="secondary" onClick={notify}>
        {allSold ? "Notify me when back" : `Notify me: ${color} is sold out`}
      </Button>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" full onClick={addToBag}>
          Add to bag
        </Button>
        <Button size="lg" full variant="dark" onClick={addToBag}>
          Buy now
        </Button>
      </div>
    )

  const low =
    variant?.availability.status === "low_stock" ? variant.availability.low_quantity : undefined
  const meta = [product.type, product.attributes.fit].filter(Boolean).join(" · ")
  const showBar = !ctaVisible && !endVisible

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-[84px] lg:self-start">
        <ImageGallery
          images={images}
          index={galleryIndex}
          onIndexChange={setGalleryIndex}
          renderImage={(img, { priority, large }) => (
            <ProductImage
              src={img.src}
              alt={img.alt}
              priority={priority}
              sizes={large ? "(min-width: 768px) 768px, 100vw" : "(min-width: 1024px) 50vw, 100vw"}
            />
          )}
        />
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <div className="grid gap-2">
          {product.technologies.length ? (
            <div className="flex flex-wrap gap-2">
              {product.technologies.map((t) => (
                <Badge key={t.handle} variant="neutral">
                  {t.name}
                </Badge>
              ))}
            </div>
          ) : null}
          <h1 className="font-display text-[clamp(26px,3.6vw,36px)] font-extrabold leading-tight">
            {product.title}
          </h1>
          {meta ? <p className="text-muted">{meta}</p> : null}
          <Price
            pricePaise={rupeesToPaise(price)}
            mrpPaise={mrp ? rupeesToPaise(mrp) : undefined}
            size="lg"
          />
          <p className="text-sm text-muted">Inclusive of all taxes</p>
        </div>

        {colors.length > 1 ? (
          <ColorSwatches
            colors={colorOptions}
            value={color ?? undefined}
            onValueChange={chooseColor}
          />
        ) : null}

        {sizes.length && !(sizes.length === 1 && sizes[0] === "One size") ? (
          <div ref={sizeGroupRef} className="grid gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                Size: <b>{size ?? "Select"}</b>
              </p>
              {product.size_chart ? (
                <button
                  type="button"
                  onClick={() => setGuide(true)}
                  className="min-h-11 text-sm font-semibold text-link underline underline-offset-4"
                >
                  Size guide
                </button>
              ) : null}
            </div>
            <SizeSelector
              sizes={sizes.map((s) => ({ value: s, soldOut: soldOutSize(s) }))}
              value={size ?? undefined}
              onValueChange={(s) => {
                setSize(s)
                setSizeError(false)
              }}
            />
            {sizeError ? (
              <p role="alert" className="text-sm font-semibold text-sale">
                Select a size to continue.
              </p>
            ) : null}
            {low ? (
              <p role="status" className="text-sm font-semibold text-sale">
                Only {low} left in this size.
              </p>
            ) : null}
          </div>
        ) : null}

        <div ref={ctaRef}>{cta}</div>

        <form
          noValidate
          className="grid gap-2 rounded-card border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault()
            setPinMessage(
              PINCODE.test(pin)
                ? {
                    ok: true,
                    text: "Delivery dates and cash-on-delivery availability will show here once shipping is connected.",
                  }
                : { ok: false, text: "Enter a valid 6-digit pincode." },
            )
          }}
        >
          <label htmlFor="pin" className="text-sm font-semibold">
            Check delivery
          </label>
          <div className="flex gap-2">
            <input
              id="pin"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter pincode"
              aria-invalid={pinMessage && !pinMessage.ok ? true : undefined}
              aria-describedby="pin-msg"
              className="h-12 min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-4 text-base"
            />
            <Button type="submit" variant="secondary" className="shrink-0">
              Check
            </Button>
          </div>
          <p
            id="pin-msg"
            role="status"
            className={
              pinMessage
                ? pinMessage.ok
                  ? "text-sm text-muted"
                  : "text-sm font-semibold text-sale"
                : "sr-only"
            }
          >
            {pinMessage?.text ?? ""}
          </p>
        </form>

        <Tabs defaultValue="description">
          <TabsList aria-label="Product details">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="fabric">Fabric</TabsTrigger>
            <TabsTrigger value="shipping">Shipping & returns</TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <p>{product.description}</p>
          </TabsContent>
          <TabsContent value="features">
            {product.features.length ? (
              <ul className="list-disc pl-5">
                {product.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No feature list yet.</p>
            )}
          </TabsContent>
          <TabsContent value="fabric">
            {product.fabric ? <p>{product.fabric}</p> : null}
            {product.technologies.map((t) => (
              <p key={t.handle} className="mt-2">
                <b>{t.name}</b>
                {t.tagline ? `: ${t.tagline}` : ""}
              </p>
            ))}
          </TabsContent>
          <TabsContent value="shipping">
            <p className="text-muted">
              Shipping charges and the return and exchange policy appear here once confirmed.
            </p>
          </TabsContent>
        </Tabs>
        <div ref={endRef} aria-hidden className="h-px" />
      </div>

      {product.size_chart ? (
        <BottomSheet open={guide} onOpenChange={setGuide} title="Size guide">
          <div className="grid gap-4 pb-2">
            <SizeChartTable {...product.size_chart} selectedSize={size ?? undefined} />
            {product.size_chart.how_to_measure ? (
              <p className="text-sm">
                <b>How to measure.</b> {product.size_chart.how_to_measure}
              </p>
            ) : null}
            {product.size_chart.notes ? (
              <p className="text-sm text-muted">{product.size_chart.notes}</p>
            ) : null}
          </div>
        </BottomSheet>
      ) : null}

      {showBar ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-pop lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{product.title}</p>
              <Price
                pricePaise={rupeesToPaise(price)}
                mrpPaise={mrp ? rupeesToPaise(mrp) : undefined}
              />
            </div>
            <Button onClick={colorSold || allSold ? notify : addToBag} className="shrink-0">
              {colorSold || allSold ? "Notify me" : "Add to bag"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
