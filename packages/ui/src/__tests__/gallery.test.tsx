import * as React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "vitest-axe"
import {
  FilterGroups,
  type FilterGroup,
  type FilterState,
  ImageGallery,
  SizeChartTable,
} from "../index"

const images = [
  { src: "/a.webp", alt: "Navy tee, front" },
  { src: "/b.webp", alt: "Navy tee, detail" },
  { src: "/c.webp", alt: "Black tee, front" },
]
const renderImage = (img: { src: string; alt: string }) => <img src={img.src} alt={img.alt} />

describe("ImageGallery", () => {
  it("is a labelled carousel with named slides, thumbnails and a counter", async () => {
    const { container } = render(<ImageGallery images={images} renderImage={renderImage} />)
    expect(screen.getByRole("region", { name: "Product images" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    )
    expect(screen.getByRole("group", { name: "1 of 3" })).toBeInTheDocument()
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it("moves with thumbnails and arrow buttons and reports the index", async () => {
    const user = userEvent.setup()
    const onIndexChange = vi.fn()
    function Harness() {
      const [i, setI] = React.useState(0)
      return (
        <ImageGallery
          images={images}
          renderImage={renderImage}
          index={i}
          onIndexChange={(n) => {
            setI(n)
            onIndexChange(n)
          }}
        />
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole("button", { name: "Show image 3" }))
    expect(screen.getByText("3 / 3")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show image 3" })).toHaveAttribute(
      "aria-current",
      "true",
    )
    expect(onIndexChange).toHaveBeenLastCalledWith(2)
    expect(screen.getByRole("button", { name: "Next image" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Previous image" }))
    expect(screen.getByText("2 / 3")).toBeInTheDocument()
  })

  it("opens a zoom dialog, navigates with arrow keys, and returns focus on Escape", async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={images} renderImage={renderImage} />)
    const zoom = screen.getByRole("button", { name: "Zoom image" })
    await user.click(zoom)
    const dialog = await screen.findByRole("dialog", { name: /Navy tee, front, image 1 of 3/ })
    expect(await axe(dialog)).toHaveNoViolations()
    await user.keyboard("{ArrowRight}")
    expect(
      await screen.findByRole("dialog", { name: /Navy tee, detail, image 2 of 3/ }),
    ).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
    await waitFor(() => expect(zoom).toHaveFocus())
  })

  it("renders nothing without images", () => {
    const { container } = render(<ImageGallery images={[]} renderImage={renderImage} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe("SizeChartTable", () => {
  const props = {
    name: "Men's tops",
    unit: "in",
    columns: ["Chest", "Length"],
    sizes: ["S", "M"],
    rows: { S: { Chest: "36", Length: "26" }, M: { Chest: "38", Length: "27" } },
  }
  it("is a real table with caption, scoped headers and a highlighted size", async () => {
    const { container } = render(<SizeChartTable {...props} selectedSize="M" />)
    const table = screen.getByRole("table", { name: /Men's tops/ })
    expect(within(table).getByRole("columnheader", { name: "Chest" })).toBeInTheDocument()
    const rowM = within(table).getByRole("row", { name: /^M 38 27/ })
    expect(rowM).toHaveAttribute("aria-current", "true")
    expect(within(table).getByRole("rowheader", { name: "S" })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
  it("shows a dash for a missing measurement", () => {
    render(<SizeChartTable {...props} rows={{ S: { Chest: "36" }, M: {} }} />)
    expect(screen.getAllByText("-").length).toBe(3)
  })
})

describe("FilterGroups", () => {
  const groups: FilterGroup[] = [
    {
      id: "fit",
      label: "Fit",
      kind: "options",
      options: [{ value: "Slim", label: "Slim", count: 4 }],
    },
    { id: "price", label: "Price", kind: "range", min: 299, max: 1999, unit: "₹" },
  ]
  it("renders accessible groups and reports changes", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const value: FilterState = { options: {}, ranges: {} }
    const { container } = render(<FilterGroups groups={groups} value={value} onChange={onChange} />)
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole("checkbox", { name: /Slim/ }))
    expect(onChange).toHaveBeenCalledWith({ options: { fit: ["Slim"] }, ranges: {} })
  })
  it("opens only the requested groups by default", () => {
    render(
      <FilterGroups
        groups={groups}
        value={{ options: {}, ranges: {} }}
        onChange={() => {}}
        defaultOpen={["fit"]}
      />,
    )
    expect(screen.getByRole("button", { name: "Fit" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Price" })).toHaveAttribute("aria-expanded", "false")
  })
})
