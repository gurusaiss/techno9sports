import { describe, expect, it } from "vitest"
import {
  addressSchema,
  couponSchema,
  fieldErrors,
  loginSchema,
  pincodeField,
  registerSchema,
  tenDigitMobile,
} from "../schemas"
import { safeNext } from "../../components/account/login-form"

describe("tenDigitMobile", () => {
  it("normalises Indian mobiles", () => {
    expect(tenDigitMobile("98765 43210")).toBe("9876543210")
    expect(tenDigitMobile("+91-9876543210")).toBe("9876543210")
    expect(tenDigitMobile("09876543210")).toBe("9876543210")
  })
  it("rejects anything else", () => {
    for (const bad of ["", "12345", "5876543210", "98765432100", "+1 415 555 0100", "abcdefghij"]) {
      expect(tenDigitMobile(bad)).toBeNull()
    }
  })
})

describe("pincode", () => {
  it("is six digits without a leading zero", () => {
    expect(pincodeField.safeParse("530001").success).toBe(true)
    for (const bad of ["053001", "53000", "5300011", "53000a", ""])
      expect(pincodeField.safeParse(bad).success).toBe(false)
  })
})

const goodAddress = {
  first_name: "Asha",
  last_name: "Rao",
  phone: "98765 43210",
  address_1: "12 Beach Road",
  city: "Visakhapatnam",
  province: "Andhra Pradesh",
  postal_code: "530001",
}

describe("addressSchema", () => {
  it("accepts a good address and cleans the phone", () => {
    const r = addressSchema.safeParse(goodAddress)
    expect(r.success && r.data.phone).toBe("9876543210")
    expect(r.success && r.data.address_2).toBe("")
  })
  it("names the failing fields", () => {
    const r = addressSchema.safeParse({
      ...goodAddress,
      phone: "123",
      postal_code: "12",
      address_1: "x",
    })
    expect(r.success).toBe(false)
    if (!r.success)
      expect(Object.keys(fieldErrors(r.error)).sort()).toEqual([
        "address_1",
        "phone",
        "postal_code",
      ])
  })
})

describe("auth schemas", () => {
  it("lower-cases and trims email", () => {
    const r = loginSchema.safeParse({ email: "  Asha@Example.COM ", password: "x" })
    expect(r.success && r.data.email).toBe("asha@example.com")
  })
  it("wants a strong enough password", () => {
    const base = { first_name: "A", email: "a@b.co" }
    expect(registerSchema.safeParse({ ...base, password: "short1" }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, password: "longlonglong" }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, password: "longenough1" }).success).toBe(true)
  })
  it("trims a coupon", () => {
    expect(couponSchema.parse("  welcome10 ")).toBe("welcome10")
    expect(couponSchema.safeParse("   ").success).toBe(false)
  })
})

describe("safeNext (no open redirects)", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/checkout")).toBe("/checkout")
    expect(safeNext("/account/addresses?x=1")).toBe("/account/addresses?x=1")
  })
  it("falls back for anything else", () => {
    for (const bad of [
      null,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "evil",
    ]) {
      expect(safeNext(bad)).toBe("/account")
    }
  })
})
