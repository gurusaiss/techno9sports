/** Swatch colours for filter facets (the index only carries names). Unknown colours fall back to grey. */
export const COLOR_HEX: Record<string, string> = {
  Navy: "#0f2a43",
  Black: "#1b1f24",
  White: "#f4f1ea",
  Coral: "#ff6b4a",
  Teal: "#0e7c86",
  Sand: "#e9d3a4",
  "Grey Melange": "#9aa4ad",
  Olive: "#6b7a4a",
  Sky: "#8cc4e0",
  Maroon: "#7a2434",
}
export const colorHex = (name: string) => COLOR_HEX[name] ?? "#9aa4ad"
