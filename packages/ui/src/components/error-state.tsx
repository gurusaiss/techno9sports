import { TriangleAlert } from "lucide-react"
import { cn } from "../lib/cn"
import { Button } from "./button"

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If it keeps happening, contact support.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto grid max-w-md justify-items-center gap-3 px-4 py-12 text-center",
        className,
      )}
    >
      <div
        className="grid size-16 place-items-center rounded-full bg-coral-soft text-sale"
        aria-hidden
      >
        <TriangleAlert className="size-7" />
      </div>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      <p className="text-muted">{description}</p>
      {onRetry ? (
        <Button className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
