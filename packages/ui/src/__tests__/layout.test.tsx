import * as React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "vitest-axe"
import { Truck } from "lucide-react"
import { AnnouncementBar, SiteFooter, SiteHeader, UspStrip, type NavItem } from "../index"

const nav: NavItem[] = [
  {
    label: "Men",
    href: "/men",
    columns: [
      { title: "Tops", links: [{ label: "T-shirts", href: "/men/t-shirts" }] },
      { title: "Bottoms", links: [{ label: "Joggers", href: "/men/joggers" }] },
    ],
  },
  { label: "Frames", href: "/frames" },
  { label: "Sale", href: "/sale", highlight: true },
]

const suggestions = [
  { label: "Everyday Dry Tee", href: "/products/everyday-dry-tee", kind: "product" as const },
  { label: "Men T-shirts", href: "/men/t-shirts", kind: "category" as const },
]

function Header(props: Partial<React.ComponentProps<typeof SiteHeader>> = {}) {
  return (
    <SiteHeader
      nav={nav}
      cartCount={2}
      announcement={<AnnouncementBar>Extra 10% off your first order</AnnouncementBar>}
      search={{
        getSuggestions: (q) =>
          suggestions.filter((s) => s.label.toLowerCase().includes(q.toLowerCase())),
        recentSearches: ["joggers"],
        onSelect: () => {},
      }}
      {...props}
    />
  )
}

const searchButton = () => screen.getByRole("button", { name: "Search tees, joggers, frames" })

describe("SiteHeader", () => {
  it("is accessible and exposes the bag count in its name", async () => {
    const { container } = render(<Header />)
    expect(screen.getByRole("link", { name: "Bag, 2 items" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Techno9Sports, home" })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it("opens the mobile drawer, expands a section and closes with Escape, restoring focus", async () => {
    const user = userEvent.setup()
    render(<Header />)
    const opener = screen.getByRole("button", { name: "Open menu" })
    await user.click(opener)
    const dialog = await screen.findByRole("dialog", { name: "Menu" })
    expect(await axe(dialog)).toHaveNoViolations()
    await user.click(within(dialog).getByRole("button", { name: "Men" }))
    expect(within(dialog).getByRole("link", { name: "T-shirts" })).toBeVisible()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
    await waitFor(() => expect(opener).toHaveFocus())
  })
})

describe("SearchOverlay", () => {
  it("filters suggestions, navigates with arrows, selects with Enter", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Header
        search={{
          getSuggestions: (q) =>
            suggestions.filter((s) => s.label.toLowerCase().includes(q.toLowerCase())),
          recentSearches: ["joggers"],
          onSelect,
        }}
      />,
    )
    await user.click(searchButton())
    const dialog = await screen.findByRole("dialog", { name: "Search products" })
    expect(await axe(dialog)).toHaveNoViolations()
    const input = within(dialog).getByRole("combobox", { name: "Search" })
    expect(input).toHaveFocus()
    expect(within(dialog).getByRole("button", { name: "joggers" })).toBeInTheDocument()
    await user.type(input, "t")
    const options = within(dialog).getAllByRole("option")
    expect(options.length).toBe(2)
    expect(input).toHaveAttribute("aria-expanded", "true")
    await user.keyboard("{ArrowDown}{ArrowDown}")
    expect(options[1]).toHaveAttribute("aria-selected", "true")
    expect(input).toHaveAttribute("aria-activedescendant", options[1]!.id)
    await user.keyboard("{Enter}")
    expect(onSelect).toHaveBeenCalledWith({ href: "/men/t-shirts" })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("submits free text on Enter and tells the user when nothing matches", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Header search={{ getSuggestions: () => [], onSelect }} />)
    await user.click(searchButton())
    const input = await screen.findByRole("combobox", { name: "Search" })
    await user.type(input, "yoga mat")
    expect(screen.getByRole("status")).toHaveTextContent("No suggestions")
    await user.keyboard("{Enter}")
    expect(onSelect).toHaveBeenCalledWith({ query: "yoga mat" })
  })

  it("returns focus to the search button on Escape", async () => {
    const user = userEvent.setup()
    render(<Header />)
    const opener = searchButton()
    await user.click(opener)
    await screen.findByRole("dialog", { name: "Search products" })
    await user.keyboard("{Escape}")
    await waitFor(() => expect(opener).toHaveFocus())
  })
})

describe("MegaMenu (disclosure pattern)", () => {
  it("opens on click, links follow in tab order, Escape closes and returns focus", async () => {
    const user = userEvent.setup()
    const { container } = render(<Header />)
    const trigger = screen.getByRole("button", { name: "Men" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "T-shirts" })).toHaveAttribute("href", "/men/t-shirts")
    expect(screen.getByRole("link", { name: "Shop all Men" })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
    await user.keyboard("{Tab}")
    expect(screen.getByRole("link", { name: "T-shirts" })).toHaveFocus()
    await user.keyboard("{Escape}")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole("link", { name: "T-shirts" })).toBeNull()
  })

  it("closes when focus leaves the menu and on outside click", async () => {
    const user = userEvent.setup()
    render(<Header />)
    const trigger = screen.getByRole("button", { name: "Men" })
    await user.click(trigger)
    await user.click(document.body)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    await user.click(trigger)
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("renders plain items as links, with Sale highlighted", () => {
    render(<Header />)
    expect(screen.getByRole("link", { name: "Frames" })).toHaveAttribute("href", "/frames")
    expect(screen.getByRole("link", { name: "Sale" })).toHaveClass("text-sale")
  })
})

describe("Footer and USP strip", () => {
  it("are accessible with named navigation landmarks", async () => {
    const { container } = render(
      <>
        <UspStrip items={[{ icon: <Truck />, title: "Free shipping", text: "above ₹999" }]} />
        <SiteFooter
          columns={[{ title: "Help", links: [{ label: "Track order", href: "/track" }] }]}
          tagline="Activewear and sports eyewear."
          legal="© Techno9Sports"
        />
      </>,
    )
    expect(screen.getByRole("navigation", { name: "Help" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Track order" })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})
