import { cn } from "../lib/cn"

export interface SizeChartTableProps {
  name: string
  unit: string
  columns: string[]
  sizes: string[]
  rows: Record<string, Record<string, string>>
  /** Highlight this size's row. */
  selectedSize?: string
  className?: string
}

/** Accessible size chart: a real table with a caption and scoped headers. */
export function SizeChartTable({
  name,
  unit,
  columns,
  sizes,
  rows,
  selectedSize,
  className,
}: SizeChartTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-card border border-line", className)}>
      <table className="w-full min-w-[320px] text-left text-[15px]">
        <caption className="px-4 py-3 text-left font-bold">
          {name} <span className="font-normal text-muted">({unit})</span>
        </caption>
        <thead className="bg-teal-mist">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">
              Size
            </th>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-4 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sizes.map((size) => (
            <tr
              key={size}
              aria-current={size === selectedSize ? "true" : undefined}
              className={cn(
                "border-t border-line",
                size === selectedSize && "bg-coral-soft font-semibold",
              )}
            >
              <th scope="row" className="px-4 py-2 font-semibold">
                {size}
              </th>
              {columns.map((c) => (
                <td key={c} className="px-4 py-2">
                  {rows[size]?.[c] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
