import { generateOtp, hashOtp, judgeOtp, OTP_MAX_ATTEMPTS, OTP_TTL_MS, otpMatches } from "../otp"
import { maskPhone, normalizeIndianMobile } from "../phone"

describe("normalizeIndianMobile", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["(987) 654 3210", "+919876543210"],
  ])("accepts %s", (input, out) => expect(normalizeIndianMobile(input)).toBe(out))

  it.each([
    "",
    "12345",
    "5876543210",
    "98765432100",
    "abcdefghij",
    "+1 415 555 0100",
    null,
    undefined,
  ])("rejects %s", (input) => expect(normalizeIndianMobile(input as never)).toBeNull())

  it("masks the number for logs", () => expect(maskPhone("+919876543210")).toBe("+91******3210"))
})

describe("otp", () => {
  const secret = "s3cret"
  const phone = "+919876543210"
  const base = (over = {}) => ({
    code_hash: hashOtp(secret, phone, "login", "123456"),
    expires_at: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    consumed_at: null,
    ...over,
  })
  const candidate = (code: string, purpose = "login", p = phone) =>
    hashOtp(secret, p, purpose, code)

  it("generates six digits, zero padded", () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/)
  })
  it("matches only the same phone, purpose and code", () => {
    const h = hashOtp(secret, phone, "login", "123456")
    expect(otpMatches(h, candidate("123456"))).toBe(true)
    expect(otpMatches(h, candidate("123457"))).toBe(false)
    expect(otpMatches(h, candidate("123456", "cod"))).toBe(false)
    expect(otpMatches(h, candidate("123456", "login", "+919876543211"))).toBe(false)
  })
  it("judges each case", () => {
    expect(judgeOtp(undefined, candidate("123456"))).toBe("no_challenge")
    expect(judgeOtp(base(), candidate("123456"))).toBe("ok")
    expect(judgeOtp(base(), candidate("000000"))).toBe("wrong_code")
    expect(judgeOtp(base({ consumed_at: new Date() }), candidate("123456"))).toBe("already_used")
    expect(judgeOtp(base({ expires_at: new Date(Date.now() - 1) }), candidate("123456"))).toBe(
      "expired",
    )
    expect(judgeOtp(base({ attempts: OTP_MAX_ATTEMPTS }), candidate("123456"))).toBe(
      "too_many_attempts",
    )
  })
})
