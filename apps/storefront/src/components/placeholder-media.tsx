/** Placeholder product art until real photos arrive. Not for production pages. */
const PATHS = {
  tee: "M40 12 L18 24 L6 46 L26 54 L32 46 L32 108 L88 108 L88 46 L94 54 L114 46 L102 24 L80 12 C76 22 68 26 60 26 C52 26 44 22 40 12Z",
  pants: "M34 10 H86 L92 110 H66 L60 48 L54 110 H28Z",
  cap: "M22 74 C22 40 44 28 62 28 C82 28 98 42 98 74 Z M96 74 C112 72 120 80 120 84 C108 82 98 82 92 82Z",
} as const

export type PlaceholderKind = keyof typeof PATHS | "frames"

export function PlaceholderMedia({
  kind,
  bg,
  fg = "#0f2a43",
  label,
}: {
  kind: PlaceholderKind
  bg: string
  fg?: string
  label: string
}) {
  return (
    <div
      className="grid size-full place-items-center"
      style={{ backgroundColor: bg }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 120 120" className="h-auto w-[56%]" aria-hidden>
        {kind === "frames" ? (
          <g fill="none" stroke={fg} strokeWidth={7} strokeLinecap="round">
            <rect x="10" y="44" width="42" height="30" rx="14" />
            <rect x="68" y="44" width="42" height="30" rx="14" />
            <path d="M52 56 Q60 50 68 56" />
            <path d="M10 54 L2 46 M110 54 L118 46" />
          </g>
        ) : (
          <path d={PATHS[kind]} fill={fg} />
        )}
      </svg>
    </div>
  )
}
