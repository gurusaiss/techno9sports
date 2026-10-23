import { checkRateLimit, MemoryRateLimitStore, setRateLimitStore } from "../rate-limit"

describe("rate limit", () => {
  const limit = { name: "t", max: 3, windowMs: 1000 }
  beforeEach(() => setRateLimitStore(new MemoryRateLimitStore()))

  it("allows up to the maximum then blocks", () => {
    expect([1, 2, 3, 4].map((i) => checkRateLimit(limit, "a", 1000 + i).allowed)).toEqual([
      true,
      true,
      true,
      false,
    ])
  })
  it("counts subjects separately", () => {
    for (let i = 0; i < 4; i++) checkRateLimit(limit, "a", 1000)
    expect(checkRateLimit(limit, "b", 1000).allowed).toBe(true)
  })
  it("recovers after the window", () => {
    for (let i = 0; i < 4; i++) checkRateLimit(limit, "a", 1000)
    expect(checkRateLimit(limit, "a", 2500).allowed).toBe(true)
  })
  it("tells the caller how long to wait", () => {
    for (let i = 0; i < 3; i++) checkRateLimit(limit, "a", 1000)
    expect(checkRateLimit(limit, "a", 1001)).toEqual({ allowed: false, retryAfterSeconds: 1 })
  })
})
