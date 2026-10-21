"use client"

import * as React from "react"
import * as T from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { cn } from "../lib/cn"

type ToastVariant = "default" | "success" | "error"
interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}
interface ToastItem extends ToastInput {
  id: number
}

const ToastContext = React.createContext<((t: ToastInput) => void) | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return { toast: ctx }
}

const variantClass: Record<ToastVariant, string> = {
  default: "bg-fg text-bg",
  success: "bg-teal-ink text-white",
  error: "bg-sale text-white",
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const nextId = React.useRef(0)

  const toast = React.useCallback((t: ToastInput) => {
    const id = nextId.current++
    setItems((prev) => [...prev, { ...t, id }])
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      <T.Provider swipeDirection="down" duration={4000} label="Notification">
        {children}
        {items.map((t) => (
          <T.Root
            key={t.id}
            duration={t.duration}
            type={t.variant === "error" ? "foreground" : "background"}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((x) => x.id !== t.id))
            }}
            className={cn(
              "grid animate-toast-in grid-cols-[1fr_auto] items-start gap-3 rounded-control p-4 shadow-pop",
              variantClass[t.variant ?? "default"],
            )}
          >
            <div>
              <T.Title className="text-sm font-bold">{t.title}</T.Title>
              {t.description ? (
                <T.Description className="mt-0.5 text-sm opacity-90">{t.description}</T.Description>
              ) : null}
            </div>
            <T.Close
              aria-label="Dismiss notification"
              className="-m-2 grid size-11 place-items-center rounded-full hover:bg-white/15"
            >
              <X className="size-4" aria-hidden />
            </T.Close>
          </T.Root>
        ))}
        <T.Viewport className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-md list-none flex-col gap-2 p-4 outline-none" />
      </T.Provider>
    </ToastContext.Provider>
  )
}
