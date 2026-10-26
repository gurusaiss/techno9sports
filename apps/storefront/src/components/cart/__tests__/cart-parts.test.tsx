// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { StoreCart } from "@t9/types"
import { FreeShippingBar, PriceBreakdown } from "../cart-parts"

const cart = (over: Partial<StoreCart> = {}): StoreCart => ({
  id: "cart_1",
  email: null,
  customer_id: null,
  items: [
    {
      id: "li_1",
      product_id: "p",
      product_handle: "tee",
      variant_id: "v",
      title: "Tee",
      size: "M",
      color: "Navy",
      thumbnail: null,
      quantity: 2,
      unit_price: 449,
      mrp: 899,
      line_total: 898,
      discount: 0,
      max_quantity: 5,
      availability: "in_stock",
    },
  ],
  item_count: 2,
  mrp_total: 1798,
  items_total: 898,
  discount_total: 0,
  shipping_total: 0,
  cod_fee: 0,
  tax_total: 42.76,
  total: 898,
  savings: 900,
  promotions: [],
  shipping_method: null,
  shipping_address: null,
  free_shipping: { threshold: 999, remaining: 101, reached: false },
  payment_method: null,
  payable: 898,
  completed: false,
  ...over,
})

describe("PriceBreakdown", () => {
  it("shows the server's figures and the GST note", () => {
    render(<PriceBreakdown cart={cart()} deliveryPending />)
    expect(screen.getByText("₹1,798")).toBeInTheDocument()
    expect(screen.getByText("−₹900")).toBeInTheDocument()
    expect(screen.getByText("Calculated next")).toBeInTheDocument()
    expect(screen.getByText("Total (before delivery)")).toBeInTheDocument()
    expect(screen.getByText(/Inclusive of all taxes \(GST ₹42.76\)/)).toBeInTheDocument()
  })
  it("lists the coupon and shows FREE delivery once chosen", () => {
    render(
      <PriceBreakdown
        cart={cart({
          discount_total: 89.8,
          shipping_total: 0,
          shipping_method: { option_id: "so_1", name: "Standard delivery", amount: 0 },
          promotions: [{ code: "WELCOME10", description: null, automatic: false }],
          total: 808.2,
        })}
      />,
    )
    expect(screen.getByText("Coupon (WELCOME10)")).toBeInTheDocument()
    expect(screen.getByText("−₹89.80")).toBeInTheDocument()
    expect(screen.getByText("FREE")).toBeInTheDocument()
    expect(screen.getByText("₹808.20")).toBeInTheDocument()
  })
  it("shows the cash-on-delivery fee when there is one", () => {
    render(<PriceBreakdown cart={cart({ cod_fee: 49, total: 947 })} />)
    expect(screen.getByText("Cash on delivery fee")).toBeInTheDocument()
  })
})

describe("FreeShippingBar", () => {
  it("shows what is left to spend", () => {
    render(<FreeShippingBar cart={cart()} />)
    expect(screen.getByText("Add ₹101 more for free delivery.")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "90")
  })
  it("celebrates when reached and hides when there is no rule", () => {
    const { rerender, container } = render(
      <FreeShippingBar
        cart={cart({ free_shipping: { threshold: 999, remaining: 0, reached: true } })}
      />,
    )
    expect(screen.getByText(/unlocked free delivery/)).toBeInTheDocument()
    rerender(
      <FreeShippingBar
        cart={cart({ free_shipping: { threshold: null, remaining: 0, reached: false } })}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
