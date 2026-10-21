import sharp from "sharp"
import type { Glyph } from "./catalog-data"

/**
 * Placeholder product art generated at seed time (no real photos yet). Shapes only, no text,
 * so it renders the same on any machine. Replace with real photography before launch.
 */
const PATHS: Record<Exclude<Glyph, "frames" | "bag" | "band">, string> = {
  tee: "M40 12 L18 24 L6 46 L26 54 L32 46 L32 108 L88 108 L88 46 L94 54 L114 46 L102 24 L80 12 C76 22 68 26 60 26 C52 26 44 22 40 12Z",
  tank: "M40 10 L52 10 Q60 30 68 10 L80 10 L84 34 Q79 44 84 54 L84 108 L36 108 L36 54 Q41 44 36 34Z",
  hoodie:
    "M42 14 L20 26 L8 70 L22 74 L32 46 L32 108 L88 108 L88 46 L98 74 L112 70 L100 26 L78 14 C74 24 66 28 60 28 C54 28 46 24 42 14Z",
  pants: "M34 10 H86 L92 110 H66 L60 48 L54 110 H28Z",
  shorts: "M32 14 H88 L98 72 H66 L60 40 L54 72 H22Z",
  bra: "M30 30 Q44 20 54 36 Q60 42 66 36 Q76 20 90 30 L92 66 Q76 80 60 76 Q44 80 28 66Z",
  cap: "M22 74 C22 40 44 28 62 28 C82 28 98 42 98 74 Z M96 74 C112 72 120 80 120 84 C108 82 98 82 92 82Z",
  socks: "M46 10 H74 V62 L96 84 Q104 98 90 104 L62 104 Q50 104 50 92 L46 70Z",
  briefs: "M26 36 H94 L98 62 Q92 84 76 96 L66 96 L60 80 L54 96 L44 96 Q28 84 22 62Z",
}

const BACKGROUNDS = ["#cfe8ea", "#ffd3c4", "#f6e4be", "#e3f1f2", "#e7dfd2"]

function luminance(hex: string): number {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(n[0]!) + 0.7152 * f(n[1]!) + 0.0722 * f(n[2]!)
}

function glyphSvg(glyph: Glyph, fill: string): string {
  const stroke = luminance(fill) > 0.55 ? "#51647a" : "none"
  if (glyph === "frames") {
    return `<g fill="none" stroke="${fill}" stroke-width="7" stroke-linecap="round"><rect x="10" y="44" width="42" height="30" rx="14"/><rect x="68" y="44" width="42" height="30" rx="14"/><path d="M52 56 Q60 50 68 56"/><path d="M10 54 L2 46 M110 54 L118 46"/></g>`
  }
  if (glyph === "bag") {
    return `<g><path d="M24 46 H96 V104 H24Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/><path d="M42 46 V36 Q60 20 78 36 V46" fill="none" stroke="${fill}" stroke-width="6" stroke-linecap="round"/><rect x="36" y="64" width="48" height="6" rx="3" fill="#ffffff" opacity=".35"/></g>`
  }
  if (glyph === "band") {
    return `<g><rect x="16" y="46" width="88" height="30" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/><rect x="16" y="56" width="88" height="4" fill="#ffffff" opacity=".4"/><rect x="16" y="64" width="88" height="4" fill="#ffffff" opacity=".4"/></g>`
  }
  const extra =
    glyph === "hoodie"
      ? `<path d="M44 14 C46 2 74 2 76 14 C72 26 48 26 44 14Z" fill="${fill}" opacity=".7" stroke="${stroke}" stroke-width="1.5"/>`
      : ""
  return `<g>${extra}<path d="${PATHS[glyph]}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/></g>`
}

export type ImageView = "front" | "detail"

/** 800 x 1000 WebP. `seed` varies the background so a grid of products doesn't look uniform. */
export async function placeholderImage(
  glyph: Glyph,
  colorHex: string,
  view: ImageView,
  seed: number,
): Promise<Buffer> {
  const bg = BACKGROUNDS[seed % BACKGROUNDS.length]!
  const scale = view === "front" ? 5.2 : 8.6
  const size = 120 * scale
  const x = (800 - size) / 2
  const y = view === "front" ? (1000 - size) / 2 : (1000 - size) / 2 + 60
  const weave =
    view === "detail"
      ? `<defs><pattern id="w" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="none"/><rect width="7" height="14" fill="#ffffff" opacity=".12"/></pattern></defs><rect width="800" height="1000" fill="url(#w)"/>`
      : ""
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="${bg}"/><ellipse cx="400" cy="900" rx="230" ry="26" fill="#0f2a43" opacity=".08"/><g transform="translate(${x} ${y}) scale(${scale})">${glyphSvg(glyph, colorHex)}</g>${weave}</svg>`
  return sharp(Buffer.from(svg)).webp({ quality: 78 }).toBuffer()
}

export type BannerTone = "sunrise" | "lagoon" | "dune"

const BANNER_BG: Record<BannerTone, [string, string]> = {
  sunrise: ["#ffd9b8", "#7fc4c9"],
  lagoon: ["#cfe8ea", "#0e7c86"],
  dune: ["#f6e4be", "#ff6b4a"],
}

/** Wide banner art: gradient, sun, wave and one or two garments. No text: copy is HTML in the storefront. */
export async function bannerImage(
  tone: BannerTone,
  items: { glyph: Glyph; color: string }[],
  width: number,
  height: number,
): Promise<Buffer> {
  const [a, b] = BANNER_BG[tone]
  const unit = Math.min(width, height) / 120
  const size = 120 * unit * (width > height ? 0.74 : 0.62)
  const placed = items
    .map((it, i) => {
      const x =
        width > height ? width * (0.64 + i * 0.19) - size / 2 : width * (0.32 + i * 0.36) - size / 2
      const y = height * (i % 2 === 0 ? 0.12 : 0.34)
      const scale = (size / 120) * (i === 0 ? 1 : 0.78)
      return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${i === 0 ? -6 : 7} 60 60)">${glyphSvg(it.glyph, it.color)}</g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${width * 0.82}" cy="${height * 0.28}" r="${height * 0.2}" fill="#ffffff" opacity=".35"/><path d="M0 ${height * 0.82} Q${width * 0.25} ${height * 0.7} ${width * 0.5} ${height * 0.82} T${width} ${height * 0.82} V${height} H0Z" fill="#0f2a43" opacity=".14"/>${placed}</svg>`
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer()
}
