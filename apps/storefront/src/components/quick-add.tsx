"use client"

import * as React from "react"
import { BottomSheet, Button, ColorSwatches, SizeSelector, Skeleton } from "@t9/ui"
import { getQuickAddAction, type QuickAddData } from "@/app/actions/catalog"
import { colorHex } from "@/config/colors"
import { useCart } from "@/components/cart/cart-provider"

/** Size (and colour) picker in a bottom sheet, for adding from a listing without opening the product. */
export function QuickAddSheet({
  handle,
  open,
  onOpenChange,
}: {
  handle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { add, busy } = useCart()
  const [data, setData] = React.useState<QuickAddData | null | undefined>(undefined)
  const [color, setColor] = React.useState<string | null>(null)
  const [size, setSize] = React.useState<string | null>(null)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    if (!open || data !== undefined) return
    let cancelled = false
    void getQuickAddAction(handle).then((d) => {
      if (cancelled) return
      setData(d)
      const first = d?.colors.find((c) =>
        d.variants.some((v) => v.color === c.name && v.status !== "out_of_stock"),
      )
      setColor(first?.name ?? d?.colors[0]?.name ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [open, data, handle])

  const inColor = data?.variants.filter((v) => !color || v.color === color) ?? []
  const variant = inColor.find((v) => v.size === size)

  const submit = async () => {
    if (!variant) return setError(true)
    const ok = await add(variant.id, 1)
    if (ok) {
      onOpenChange(false)
      setSize(null)
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={data?.title ?? "Quick add"}
      footer={
        <Button
          size="lg"
          full
          onClick={() => void submit()}
          loading={busy.has("add")}
          disabled={!data}
        >
          Add to bag
        </Button>
      }
    >
      {data === undefined ? (
        <div className="grid gap-3 py-2">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : data === null ? (
        <p className="py-4 text-muted">Couldn&apos;t load sizes. Open the product page instead.</p>
      ) : (
        <div className="grid gap-5 py-2">
          {data.colors.length > 1 ? (
            <ColorSwatches
              colors={data.colors.map((c) => ({
                value: c.name,
                name: c.name,
                hex: c.hex ?? colorHex(c.name),
                soldOut: data.variants
                  .filter((v) => v.color === c.name)
                  .every((v) => v.status === "out_of_stock"),
              }))}
              value={color ?? undefined}
              onValueChange={(c) => {
                setColor(c)
                setSize(null)
              }}
            />
          ) : null}
          <div className="grid gap-2">
            <SizeSelector
              sizes={inColor.map((v) => ({
                value: v.size ?? "",
                soldOut: v.status === "out_of_stock",
              }))}
              value={size ?? undefined}
              onValueChange={(v) => {
                setSize(v)
                setError(false)
              }}
            />
            {error ? (
              <p role="alert" className="text-sm font-semibold text-sale">
                Select a size to continue.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
