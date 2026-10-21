export interface Swatch {
  name: string
  hex: string
}

/** The index stores swatches as "Navy:#0f2a43". Anything malformed is dropped. */
export function parseSwatches(raw: string[] | undefined): Swatch[] {
  return (raw ?? []).flatMap((entry) => {
    const i = entry.lastIndexOf(":")
    if (i < 1) return []
    const hex = entry.slice(i + 1)
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? [{ name: entry.slice(0, i), hex }] : []
  })
}
