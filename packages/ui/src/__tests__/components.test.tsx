import * as React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "vitest-axe"
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
  EmptyState,
  ErrorState,
  FilterDrawer,
  type FilterState,
  Price,
  ProductCard,
  ProductCardSkeleton,
  SizeSelector,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToastProvider,
  useToast,
} from "../index"

const media = <div role="img" aria-label="Everyday Dry Tee product photo" />

describe("Button", () => {
  it("is accessible, defaults to type=button, and blocks clicks while loading", async () => {
    const onClick = vi.fn()
    const { container } = render(
      <>
        <Button onClick={onClick}>Add to bag</Button>
        <Button loading onClick={onClick}>
          Paying
        </Button>
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
    expect(screen.getByRole("button", { name: "Add to bag" })).toHaveAttribute("type", "button")
    const loading = screen.getByRole("button", { name: "Paying" })
    expect(loading).toBeDisabled()
    expect(loading).toHaveAttribute("aria-busy", "true")
    await userEvent.click(loading)
    expect(onClick).not.toHaveBeenCalled()
  })
  it("renders a link with button styling via asChild", () => {
    render(
      <Button asChild>
        <a href="/men">Shop men</a>
      </Button>,
    )
    expect(screen.getByRole("link", { name: "Shop men" })).toHaveAttribute("href", "/men")
  })
})

describe("Price", () => {
  it("shows price, MRP and percent off, with screen-reader context", async () => {
    const { container } = render(<Price pricePaise={49900} mrpPaise={99900} />)
    expect(screen.getByText("₹499")).toBeInTheDocument()
    expect(screen.getByText("₹999").tagName).toBe("DEL")
    expect(screen.getByText("50% off")).toBeInTheDocument()
    expect(container).toHaveTextContent("Price ₹499, M.R.P. ₹999")
    expect(await axe(container)).toHaveNoViolations()
  })
  it("hides MRP and percent when there is no discount", () => {
    render(<Price pricePaise={49900} mrpPaise={49900} />)
    expect(screen.queryByText(/off/)).toBeNull()
    expect(document.querySelector("del")).toBeNull()
  })
})

describe("Badge, Skeleton, empty and error states", () => {
  it("are accessible", async () => {
    const onRetry = vi.fn()
    const { container } = render(
      <>
        <Badge variant="sale">20% off</Badge>
        <ProductCardSkeleton />
        <EmptyState
          title="Your bag is empty"
          description="Add something you love."
          action={<Button>Shop now</Button>}
        />
        <ErrorState onRetry={onRetry} />
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong")
  })
})

describe("Breadcrumb", () => {
  it("marks the current page and links the rest", async () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Men", href: "/men" },
          { label: "T-shirts" },
        ]}
      />,
    )
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument()
    expect(screen.getByText("T-shirts")).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Men" })).toHaveAttribute("href", "/men")
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe("SizeSelector", () => {
  const sizes = [{ value: "S" }, { value: "M" }, { value: "L", soldOut: true }, { value: "XL" }]
  function Harness() {
    const [v, setV] = React.useState("S")
    return <SizeSelector sizes={sizes} value={v} onValueChange={setV} />
  }
  it("is a labelled radio group, arrow keys skip sold-out sizes", async () => {
    const { container } = render(<Harness />)
    expect(screen.getByRole("radiogroup", { name: "Select size" })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
    const user = userEvent.setup()
    await user.tab()
    expect(screen.getByRole("radio", { name: "S" })).toHaveFocus()
    // Hold the key: Radix selects on focus only while an arrow key is down (as in a real browser).
    await user.keyboard("{ArrowRight>}")
    await waitFor(() => expect(screen.getByRole("radio", { name: "M" })).toBeChecked())
    await user.keyboard("{/ArrowRight}{ArrowRight>}")
    // L is sold out, so focus and selection jump straight to XL.
    await waitFor(() => expect(screen.getByRole("radio", { name: "XL" })).toBeChecked())
    await user.keyboard("{/ArrowRight}")
  })
  it("announces sold-out sizes and disables them", () => {
    render(<Harness />)
    const l = screen.getByRole("radio", { name: "L (sold out)" })
    expect(l).toBeDisabled()
  })
})

describe("ColorSwatches", () => {
  it("names each colour, shows the selected name, and is accessible", async () => {
    const colors = [
      { value: "navy", name: "Navy", hex: "#0f2a43" },
      { value: "coral", name: "Coral", hex: "#ff6b4a", soldOut: true },
    ]
    const { container } = render(<ColorSwatches colors={colors} value="navy" />)
    expect(screen.getByRole("radio", { name: "Navy" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Coral (sold out)" })).toBeDisabled()
    expect(container).toHaveTextContent("Colour: Navy")
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe("Accordion and Tabs keyboard behaviour", () => {
  it("accordion toggles with Enter and Space", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Accordion type="single" collapsible>
        <AccordionItem value="care">
          <AccordionTrigger>Care</AccordionTrigger>
          <AccordionContent>Machine wash cold.</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )
    const trigger = screen.getByRole("button", { name: "Care" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    await user.tab()
    await user.keyboard("{Enter}")
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    await user.keyboard(" ")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(await axe(container)).toHaveNoViolations()
  })
  it("tabs move with arrow keys", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Tabs defaultValue="desc">
        <TabsList aria-label="Product details">
          <TabsTrigger value="desc">Description</TabsTrigger>
          <TabsTrigger value="care">Care</TabsTrigger>
        </TabsList>
        <TabsContent value="desc">About</TabsContent>
        <TabsContent value="care">Wash cold</TabsContent>
      </Tabs>,
    )
    await user.tab()
    expect(screen.getByRole("tab", { name: "Description" })).toHaveFocus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Care" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Wash cold")
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe("ProductCard", () => {
  it("has one named link, a labelled wishlist toggle, and a price", async () => {
    const onWish = vi.fn()
    const { container } = render(
      <ProductCard
        title="Everyday Dry Tee"
        href="/products/everyday-dry-tee"
        meta="Round neck · Regular fit"
        pricePaise={49900}
        mrpPaise={99900}
        media={media}
        badge={{ label: "New", variant: "new" }}
        tech="T9 Dry"
        colors={[{ name: "Navy", hex: "#0f2a43" }]}
        onWishlistToggle={onWish}
      />,
    )
    expect(screen.getByRole("link", { name: "Everyday Dry Tee" })).toHaveAttribute(
      "href",
      "/products/everyday-dry-tee",
    )
    const wish = screen.getByRole("button", { name: "Add Everyday Dry Tee to wishlist" })
    await userEvent.click(wish)
    expect(onWish).toHaveBeenCalledOnce()
    expect(screen.getByText("T9 Dry")).toBeInTheDocument()
    expect(screen.getByText("₹499")).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
  it("shows sold-out state with a notify action", async () => {
    const onNotify = vi.fn()
    render(
      <ProductCard
        title="Cool Polo"
        href="/p"
        pricePaise={59900}
        media={media}
        soldOut
        onNotify={onNotify}
      />,
    )
    expect(screen.getByText("Sold out")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Notify me" }))
    expect(onNotify).toHaveBeenCalledOnce()
  })
  it("reflects wishlisted state via aria-pressed", () => {
    render(
      <ProductCard
        title="Tee"
        href="/p"
        pricePaise={100}
        media={media}
        wishlisted
        onWishlistToggle={() => {}}
      />,
    )
    expect(screen.getByRole("button", { name: "Remove Tee from wishlist" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })
})

describe("Carousel", () => {
  it("is a labelled carousel with named slides and controls", async () => {
    const { container } = render(
      <Carousel
        label="Featured offers"
        slides={[<p key="a">One</p>, <p key="b">Two</p>]}
        autoplayMs={5000}
      />,
    )
    expect(screen.getByRole("region", { name: "Featured offers" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    )
    expect(screen.getByRole("group", { name: "1 of 2" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pause automatic slides" })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe("Toast", () => {
  it("announces a toast and lets the user dismiss it", async () => {
    function Trigger() {
      const { toast } = useToast()
      return (
        <button onClick={() => toast({ title: "Added to bag", description: "Everyday Dry Tee" })}>
          Add
        </button>
      )
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Add" }))
    const status = await screen.findByText("Added to bag")
    expect(status).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }))
  })
})

describe("BottomSheet", () => {
  function Harness() {
    const [open, setOpen] = React.useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Choose size</button>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title="Select size"
          footer={<Button full>Add to bag</Button>}
        >
          <p>Sizes here</p>
        </BottomSheet>
      </>
    )
  }
  it("is a named dialog, traps focus, closes on Escape and restores focus", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole("button", { name: "Choose size" })
    await user.click(opener)
    const dialog = await screen.findByRole("dialog", { name: "Select size" })
    expect(await axe(dialog)).toHaveNoViolations()
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
    await waitFor(() => expect(opener).toHaveFocus())
  })
})

describe("FilterDrawer", () => {
  const groups = [
    {
      id: "size",
      label: "Size",
      kind: "options" as const,
      options: [
        { value: "S", label: "S", count: 12 },
        { value: "M", label: "M", count: 20 },
      ],
    },
    { id: "price", label: "Price", kind: "range" as const, min: 299, max: 1999, unit: "₹" },
  ]
  function Harness({ onState }: { onState?: (s: FilterState) => void }) {
    const [state, setState] = React.useState<FilterState>({ options: {}, ranges: {} })
    return (
      <FilterDrawer
        open
        onOpenChange={() => {}}
        groups={groups}
        value={state}
        resultCount={32}
        onChange={(s) => {
          setState(s)
          onState?.(s)
        }}
      />
    )
  }
  it("is accessible, toggles options, sets a price range and clears all", async () => {
    const user = userEvent.setup()
    let last: FilterState | undefined
    render(<Harness onState={(s) => (last = s)} />)
    const dialog = await screen.findByRole("dialog", { name: "Filters" })
    expect(await axe(dialog)).toHaveNoViolations()
    await user.click(within(dialog).getByRole("checkbox", { name: /^M/ }))
    expect(last?.options.size).toEqual(["M"])
    await user.type(within(dialog).getByLabelText(/Min/), "500")
    expect(last?.ranges.price?.min).toBe(500)
    expect(within(dialog).getByRole("button", { name: "Show 32 results" })).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Clear all" }))
    expect(last).toEqual({ options: {}, ranges: {} })
  })
})
