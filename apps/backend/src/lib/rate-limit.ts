/**
 * Sliding-window limiter, in memory per process. Fine for one instance and tests; Phase 9 swaps
 * `store` for Redis behind the same interface for multi-instance production.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number, now: number): number
}

export class MemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, number[]>()
  hit(key: string, windowMs: number, now: number): number {
    const fresh = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs)
    fresh.push(now)
    this.hits.set(key, fresh)
    if (this.hits.size > 20_000) this.sweep(now, windowMs)
    return fresh.length
  }
  private sweep(now: number, windowMs: number) {
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < windowMs)) this.hits.delete(k)
  }
}

let store: RateLimitStore = new MemoryRateLimitStore()
export const setRateLimitStore = (s: RateLimitStore) => {
  store = s
}

export interface Limit {
  name: string
  max: number
  windowMs: number
}

export function checkRateLimit(limit: Limit, subject: string, now = Date.now()) {
  const count = store.hit(`${limit.name}:${subject}`, limit.windowMs, now)
  return count <= limit.max
    ? { allowed: true as const }
    : { allowed: false as const, retryAfterSeconds: Math.ceil(limit.windowMs / 1000) }
}

export const LIMITS = {
  otpRequestPhone: { name: "otp-req-phone", max: 3, windowMs: 10 * 60_000 },
  otpRequestIp: { name: "otp-req-ip", max: 15, windowMs: 10 * 60_000 },
  otpVerifyIp: { name: "otp-verify-ip", max: 30, windowMs: 10 * 60_000 },
  couponIp: { name: "coupon-ip", max: 20, windowMs: 10 * 60_000 },
  pincodeIp: { name: "pincode-ip", max: 60, windowMs: 60_000 },
  checkoutIp: { name: "checkout-ip", max: 40, windowMs: 10 * 60_000 },
  webhookIp: { name: "webhook-ip", max: 600, windowMs: 60_000 },
} satisfies Record<string, Limit>
