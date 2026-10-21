import { createRevalidator } from "../storefront-revalidate"

describe("createRevalidator", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("batches requests in the window into one post with the union of tags", async () => {
    const post = jest.fn().mockResolvedValue(undefined)
    const r = createRevalidator({ post, delayMs: 1000 })
    r.request(["products", "product:a"])
    r.request(["catalog", "product:a", "product:b"])
    expect(post).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(1000)
    expect(post).toHaveBeenCalledTimes(1)
    expect(new Set(post.mock.calls[0][0])).toEqual(
      new Set(["products", "product:a", "catalog", "product:b"]),
    )
  })

  it("falls back to the broad tags when a bulk change names too many", async () => {
    const post = jest.fn().mockResolvedValue(undefined)
    const r = createRevalidator({ post, delayMs: 10 })
    r.request(Array.from({ length: 60 }, (_, i) => `product:p${i}`))
    await jest.advanceTimersByTimeAsync(10)
    expect(post).toHaveBeenCalledWith(["products", "catalog"])
  })

  it("never throws when the storefront is down, and keeps working afterwards", async () => {
    const post = jest.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(undefined)
    const warn = jest.fn()
    const r = createRevalidator({ post, warn, delayMs: 10 })
    r.request(["products"])
    await jest.advanceTimersByTimeAsync(10)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("down"))
    r.request(["catalog"])
    await jest.advanceTimersByTimeAsync(10)
    expect(post).toHaveBeenCalledTimes(2)
  })

  it("flush sends pending tags immediately and does nothing when empty", async () => {
    const post = jest.fn().mockResolvedValue(undefined)
    const r = createRevalidator({ post })
    await r.flush()
    expect(post).not.toHaveBeenCalled()
    r.request(["products"])
    await r.flush()
    expect(post).toHaveBeenCalledWith(["products"])
  })
})
