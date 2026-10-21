import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8")

function colors(): Record<string, string> {
  const raw: Record<string, string> = {}
  for (const m of css.matchAll(/--color-([a-z-]+):\s*([^;]+);/g)) raw[m[1]!] = m[2]!.trim()
  const resolve = (v: string): string => {
    const ref = v.match(/^var\(--color-([a-z-]+)\)$/)
    return ref ? resolve(raw[ref[1]!]!) : v
  }
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, resolve(v)]))
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ]
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const c = colors()

// [foreground, background, minimum ratio]. 4.5 = body text, 3 = UI components and large text.
const PAIRS: [string, string, number][] = [
  ["fg", "bg", 4.5],
  ["fg", "surface", 4.5],
  ["muted", "bg", 4.5],
  ["muted", "surface", 4.5],
  ["on-primary", "primary", 4.5],
  ["link", "surface", 4.5],
  ["link", "bg", 4.5],
  ["link", "teal-mist", 4.5],
  ["white", "teal", 4.5],
  ["sale", "surface", 4.5],
  ["sale", "bg", 4.5],
  ["coral-tint", "navy-soft", 4.5],
  ["white", "navy", 4.5],
  ["white", "navy-soft", 4.5],
  ["fg", "teal-soft", 4.5],
  ["fg", "coral-soft", 4.5],
  ["fg", "sand-deep", 4.5],
  ["fg", "teal-mist", 4.5],
  ["success", "surface", 4.5],
  ["warning-fg", "warning-bg", 4.5],
  ["line-strong", "surface", 3],
  ["line-strong", "bg", 3],
  ["focus", "surface", 3],
  ["focus", "bg", 3],
  ["primary", "navy", 3],
]

describe("design tokens meet WCAG 2.1 AA", () => {
  it.each(PAIRS)("%s on %s >= %s", (fg, bg, min) => {
    expect(c[fg], `missing token ${fg}`).toBeDefined()
    expect(c[bg], `missing token ${bg}`).toBeDefined()
    expect(ratio(c[fg]!, c[bg]!)).toBeGreaterThanOrEqual(min)
  })

  it("keeps coral and teal as fills only: never body text on sand", () => {
    expect(ratio(c.coral!, c.bg!)).toBeLessThan(4.5)
  })
})
