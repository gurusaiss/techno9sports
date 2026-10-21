import { availabilityOf, isVariantAvailable, onHandQuantity } from "../availability"

const variant = (stocked: number, reserved = 0, extra: object = {}) => ({
  manage_inventory: true,
  allow_backorder: false,
  inventory_items: [
    {
      inventory: { location_levels: [{ stocked_quantity: stocked, reserved_quantity: reserved }] },
    },
  ],
  ...extra,
})

describe("availability", () => {
  it("subtracts reservations and never goes negative", () => {
    expect(onHandQuantity(variant(10, 3))).toBe(7)
    expect(onHandQuantity(variant(2, 5))).toBe(0)
  })

  it("sums across locations", () => {
    const v = {
      manage_inventory: true,
      inventory_items: [
        {
          inventory: {
            location_levels: [
              { stocked_quantity: 2, reserved_quantity: 0 },
              { stocked_quantity: 3, reserved_quantity: 1 },
            ],
          },
        },
      ],
    }
    expect(onHandQuantity(v)).toBe(4)
  })

  it("treats unmanaged or backorderable variants as available", () => {
    expect(isVariantAvailable(variant(0, 0, { manage_inventory: false }))).toBe(true)
    expect(isVariantAvailable(variant(0, 0, { allow_backorder: true }))).toBe(true)
    expect(isVariantAvailable(variant(0))).toBe(false)
  })

  it("reveals exact stock only when low", () => {
    expect(availabilityOf(variant(40))).toEqual({ status: "in_stock" })
    expect(availabilityOf(variant(3))).toEqual({ status: "low_stock", low_quantity: 3 })
    expect(availabilityOf(variant(5))).toEqual({ status: "low_stock", low_quantity: 5 })
    expect(availabilityOf(variant(6))).toEqual({ status: "in_stock" })
    expect(availabilityOf(variant(0))).toEqual({ status: "out_of_stock" })
  })
})
