import { fromPaise, toPaise } from "../money"

describe("money", () => {
  it("converts rupees to paise without float drift", () => {
    expect(toPaise(299.99)).toBe(29999)
    expect(toPaise(0.1 + 0.2)).toBe(30)
  })
  it("round-trips", () => {
    expect(fromPaise(toPaise(1999))).toBe(1999)
  })
})
