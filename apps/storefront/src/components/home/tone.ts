import type { Tone } from "@t9/types"

export const TONE_CLASS: Record<Tone["tone"], string> = {
  mist: "bg-teal-mist text-fg",
  coral: "bg-coral-soft text-fg",
  sand: "bg-sand-deep text-fg",
  navy: "bg-navy text-white",
  teal: "bg-teal text-white",
}

/** Placeholder art colour per tone, used where a tile has no image yet. */
export const TONE_ART: Record<Tone["tone"], { bg: string; fg: string }> = {
  mist: { bg: "#cfe8ea", fg: "#0f2a43" },
  coral: { bg: "#ffd3c4", fg: "#0f2a43" },
  sand: { bg: "#f6e4be", fg: "#0f2a43" },
  navy: { bg: "#0f2a43", fg: "#ffffff" },
  teal: { bg: "#0e7c86", fg: "#ffffff" },
}
