import { cn } from "../lib/cn"

export interface LogoProps {
  /** "light" is for dark backgrounds (footer, dark banners). */
  tone?: "default" | "light"
  /** Accessible name. Use "Techno9Sports, home" when the logo is the home link. */
  label?: string
  className?: string
}

/** Sun-over-wave "9" mark plus wordmark. Placeholder artwork until the final logo is approved. */
export function Logo({ tone = "default", label = "Techno9Sports", className }: LogoProps) {
  const text = tone === "light" ? "#ffffff" : "#0f2a43"
  const nine = tone === "light" ? "#ffb59f" : "#0e7c86"
  const wave = tone === "light" ? "#16385a" : "#0f2a43"
  const font = "var(--font-sora), ui-sans-serif, system-ui, sans-serif"
  return (
    <svg viewBox="0 0 250 40" role="img" aria-label={label} className={cn("h-8 w-auto", className)}>
      <g transform="translate(0 2)">
        <circle cx="17" cy="17" r="15" fill="#ff6b4a" />
        <path d="M2 24 Q9 18 17 24 T32 24 V32 H2Z" fill={wave} />
        <text x="11.2" y="21" fontFamily={font} fontWeight={800} fontSize={18} fill="#0f2a43">
          9
        </text>
      </g>
      <text
        x="42"
        y="28"
        fontFamily={font}
        fontWeight={700}
        fontSize={25}
        letterSpacing={-0.5}
        fill={text}
      >
        Techno<tspan fill={nine}>9</tspan>Sports
      </text>
    </svg>
  )
}
