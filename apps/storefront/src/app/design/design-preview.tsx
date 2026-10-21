"use client"

import * as React from "react"
import { Inbox } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  BottomSheet,
  Breadcrumb,
  Button,
  Carousel,
  ColorSwatches,
  Container,
  EmptyState,
  ErrorState,
  FilterDrawer,
  type FilterGroup,
  type FilterState,
  Price,
  ProductCard,
  ProductCardSkeleton,
  SizeSelector,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@t9/ui"
import { PlaceholderMedia } from "@/components/placeholder-media"

const palette: { name: string; className: string; note?: string }[] = [
  { name: "navy", className: "bg-navy text-white" },
  { name: "navy-soft", className: "bg-navy-soft text-white" },
  { name: "coral", className: "bg-coral text-navy", note: "fill only" },
  { name: "coral-soft", className: "bg-coral-soft text-navy" },
  { name: "teal", className: "bg-teal text-white" },
  { name: "teal-ink", className: "bg-teal-ink text-white" },
  { name: "teal-soft", className: "bg-teal-soft text-navy" },
  { name: "teal-mist", className: "bg-teal-mist text-navy" },
  { name: "sand", className: "bg-sand text-navy border border-line" },
  { name: "sand-deep", className: "bg-sand-deep text-navy" },
  { name: "slate", className: "bg-slate text-white" },
  { name: "sale", className: "bg-sale text-white" },
]

const sizes = [
  { value: "S" },
  { value: "M" },
  { value: "L" },
  { value: "XL" },
  { value: "XXL", soldOut: true },
]
const colors = [
  { value: "navy", name: "Navy", hex: "#0f2a43" },
  { value: "coral", name: "Coral", hex: "#ff6b4a" },
  { value: "teal", name: "Teal", hex: "#0e7c86" },
  { value: "sand", name: "Sand", hex: "#f6e4be", soldOut: true },
]

const filterGroups: FilterGroup[] = [
  {
    id: "size",
    label: "Size",
    kind: "options",
    options: ["S", "M", "L", "XL"].map((s, i) => ({ value: s, label: s, count: 12 + i * 4 })),
  },
  {
    id: "tech",
    label: "Technology",
    kind: "options",
    options: ["T9 Dry", "T9 Flex", "T9 Cool", "T9 Warm"].map((t) => ({ value: t, label: t })),
  },
  {
    id: "colour",
    label: "Colour",
    kind: "options",
    options: colors.map((c) => ({ value: c.value, label: c.name, swatch: c.hex })),
  },
  { id: "price", label: "Price", kind: "range", min: 299, max: 1999, unit: "₹" },
]

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="py-8">
      <h2 id={id} className="mb-4 font-display text-2xl font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function DesignPreview() {
  const { toast } = useToast()
  const [size, setSize] = React.useState("M")
  const [color, setColor] = React.useState("navy")
  const [sheet, setSheet] = React.useState(false)
  const [filters, setFilters] = React.useState(false)
  const [filterState, setFilterState] = React.useState<FilterState>({ options: {}, ranges: {} })
  const [wish, setWish] = React.useState(false)

  return (
    <Container className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Design system" }]} />
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">
        Design system: Coastal
      </h1>
      <p className="mt-2 max-w-[60ch] text-muted">
        Tokens and components for Techno9Sports. Internal preview page, not indexed. Colours, type
        and shapes come from
        <code className="mx-1 rounded bg-teal-mist px-1.5 py-0.5 text-sm">
          packages/config/tokens.css
        </code>
        .
      </p>

      <Section id="colour" title="Colour">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {palette.map((c) => (
            <li key={c.name} className={`rounded-card p-3 text-sm font-semibold ${c.className}`}>
              <div className="h-10" />
              {c.name}
              {c.note ? <span className="block text-xs font-normal">{c.note}</span> : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="type" title="Typography">
        <div className="grid gap-2">
          <p className="font-display text-5xl font-extrabold tracking-tight">Sora display 48</p>
          <p className="font-display text-3xl font-extrabold">Sora heading 30</p>
          <p className="font-display text-xl font-bold">Sora subheading 20</p>
          <p className="text-base">
            Manrope body 16. Light, breathable activewear for Indian weather.
          </p>
          <p className="text-sm text-muted">Manrope small muted 14. Prices include GST.</p>
        </div>
      </Section>

      <Section id="buttons" title="Buttons and badges">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Add to bag</Button>
          <Button variant="secondary">Buy now</Button>
          <Button variant="dark">Checkout</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link style</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Paying</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="new">New</Badge>
          <Badge variant="bestseller">Bestseller</Badge>
          <Badge variant="sale">20% off</Badge>
          <Badge variant="soldOut">Sold out</Badge>
          <Badge variant="tech">T9 Dry</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </div>
      </Section>

      <Section id="price" title="Price">
        <div className="flex flex-wrap gap-8">
          <Price pricePaise={49900} mrpPaise={99900} />
          <Price pricePaise={79900} mrpPaise={149900} size="lg" />
          <Price pricePaise={29900} />
        </div>
      </Section>

      <Section id="cards" title="Product cards">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-4 lg:gap-x-5">
          <li>
            <ProductCard
              title="Everyday Dry Tee"
              href="#"
              meta="Round neck · Regular fit"
              pricePaise={49900}
              mrpPaise={99900}
              media={<PlaceholderMedia kind="tee" bg="#cfe8ea" label="Placeholder tee" />}
              badge={{ label: "New", variant: "new" }}
              tech="T9 Dry"
              colors={colors.slice(0, 3)}
              wishlisted={wish}
              onWishlistToggle={() => setWish((w) => !w)}
            />
          </li>
          <li>
            <ProductCard
              title="Flex Training Joggers"
              href="#"
              meta="Slim fit · Zip pockets"
              pricePaise={79900}
              mrpPaise={149900}
              media={<PlaceholderMedia kind="pants" bg="#ffd3c4" label="Placeholder joggers" />}
              badge={{ label: "Bestseller", variant: "bestseller" }}
              tech="T9 Flex"
              colors={colors.slice(0, 2)}
              onWishlistToggle={() => {}}
            />
          </li>
          <li>
            <ProductCard
              title="Pace Sports Frames"
              href="#"
              meta="Wrap · UV400 · Anti-slip"
              pricePaise={69900}
              mrpPaise={129900}
              media={
                <PlaceholderMedia kind="frames" bg="#f6e4be" label="Placeholder sports frames" />
              }
              onWishlistToggle={() => {}}
            />
          </li>
          <li>
            <ProductCard
              title="Cool Polo"
              href="#"
              meta="Polo · Regular fit"
              pricePaise={59900}
              mrpPaise={119900}
              media={
                <PlaceholderMedia kind="tee" bg="#e5e1da" fg="#51647a" label="Placeholder polo" />
              }
              tech="T9 Cool"
              soldOut
              onNotify={() =>
                toast({
                  title: "We will let you know",
                  description: "Cool Polo is back soon.",
                  variant: "success",
                })
              }
            />
          </li>
        </ul>
        <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-muted">
          Loading
        </h3>
        <div className="grid grid-cols-2 gap-x-3 lg:grid-cols-4 lg:gap-x-5">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <div className="hidden lg:block">
            <ProductCardSkeleton />
          </div>
          <div className="hidden lg:block">
            <ProductCardSkeleton />
          </div>
        </div>
      </Section>

      <Section id="selectors" title="Size and colour selectors">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm">
              Size: <b>{size}</b>
            </p>
            <SizeSelector sizes={sizes} value={size} onValueChange={setSize} />
          </div>
          <ColorSwatches colors={colors} value={color} onValueChange={setColor} />
        </div>
      </Section>

      <Section id="tabs" title="Tabs and accordion">
        <div className="grid gap-8 lg:grid-cols-2">
          <Tabs defaultValue="desc">
            <TabsList aria-label="Product details">
              <TabsTrigger value="desc">Description</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="care">Care</TabsTrigger>
            </TabsList>
            <TabsContent value="desc">A lightweight everyday tee that dries fast.</TabsContent>
            <TabsContent value="features">
              T9 Dry fabric · Anti-odour finish · Flatlock seams.
            </TabsContent>
            <TabsContent value="care">
              Machine wash cold. Do not bleach. Tumble dry low.
            </TabsContent>
          </Tabs>
          <Accordion type="single" collapsible defaultValue="ship">
            <AccordionItem value="ship">
              <AccordionTrigger>Shipping</AccordionTrigger>
              <AccordionContent>
                Delivery estimate appears after you enter your pincode.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="ret">
              <AccordionTrigger>Returns and exchange</AccordionTrigger>
              <AccordionContent>
                Return and exchange terms are set by the owner (placeholder).
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Section>

      <Section id="carousel" title="Carousel">
        <Carousel
          label="Featured offers"
          autoplayMs={6000}
          slides={[
            ["#cfe8ea", "Gear for every sunrise run", "tee"],
            ["#ffd3c4", "Flex joggers from ₹799", "pants"],
            ["#f6e4be", "New sports frames", "frames"],
          ].map(([bg, text, kind]) => (
            <div
              key={text}
              className="relative aspect-[16/9] sm:aspect-[21/9]"
              style={{ backgroundColor: bg }}
            >
              <div className="absolute inset-y-0 left-0 grid w-1/2 content-center gap-1 p-6 sm:p-10">
                <p className="font-display text-xl font-extrabold sm:text-4xl">{text}</p>
              </div>
              <div className="absolute inset-y-0 right-0 w-1/2">
                <PlaceholderMedia
                  kind={kind as "tee" | "pants" | "frames"}
                  bg={bg!}
                  label="Placeholder banner"
                />
              </div>
            </div>
          ))}
        />
      </Section>

      <Section id="overlays" title="Toast, bottom sheet, filter drawer">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              toast({ title: "Added to bag", description: "Everyday Dry Tee, size M" })
            }
          >
            Show toast
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({ title: "Coupon expired", description: "Try another code.", variant: "error" })
            }
          >
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Open bottom sheet
          </Button>
          <Button variant="secondary" onClick={() => setFilters(true)}>
            Open filters
          </Button>
        </div>
        <BottomSheet
          open={sheet}
          onOpenChange={setSheet}
          title="Select size"
          footer={
            <Button full onClick={() => setSheet(false)}>
              Add to bag
            </Button>
          }
        >
          <SizeSelector sizes={sizes} value={size} onValueChange={setSize} />
        </BottomSheet>
        <FilterDrawer
          open={filters}
          onOpenChange={setFilters}
          groups={filterGroups}
          value={filterState}
          onChange={setFilterState}
          resultCount={32}
        />
      </Section>

      <Section id="states" title="Empty and error states">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-card border border-line bg-surface">
            <EmptyState
              icon={<Inbox className="size-7" />}
              title="Your bag is empty"
              description="Add something you love and it will show up here."
              action={<Button>Start shopping</Button>}
            />
          </div>
          <div className="rounded-card border border-line bg-surface">
            <ErrorState onRetry={() => toast({ title: "Retrying" })} />
          </div>
        </div>
      </Section>
    </Container>
  )
}
