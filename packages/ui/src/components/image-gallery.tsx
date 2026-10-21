"use client"

import * as React from "react"
import * as D from "@radix-ui/react-dialog"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react"
import { cn } from "../lib/cn"
import { useReturnFocus } from "../lib/use-return-focus"

export interface GalleryImage {
  src: string
  alt: string
}

export interface ImageGalleryProps {
  images: GalleryImage[]
  /** Render an image; the storefront passes next/image. `large` is true inside the lightbox. */
  renderImage: (image: GalleryImage, opts: { priority: boolean; large: boolean }) => React.ReactNode
  /** Controlled index, so choosing a colour can jump to that colour's images. */
  index?: number
  onIndexChange?: (index: number) => void
  label?: string
  className?: string
}

/**
 * Swipeable product gallery with thumbnails and a lightbox. Arrow buttons and thumbnails work
 * without a pointer; the lightbox is a real dialog (Escape closes, focus returns to the opener).
 */
export function ImageGallery({
  images,
  renderImage,
  index,
  onIndexChange,
  label = "Product images",
  className,
}: ImageGalleryProps) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "start" })
  const [internal, setInternal] = React.useState(0)
  const [lightbox, setLightbox] = React.useState(false)
  const current = index ?? internal
  const safe = Math.min(Math.max(current, 0), Math.max(images.length - 1, 0))

  const select = React.useCallback(
    (i: number) => {
      setInternal(i)
      onIndexChange?.(i)
    },
    [onIndexChange],
  )

  React.useEffect(() => {
    if (!embla) return
    const onSelect = () => select(embla.selectedScrollSnap())
    embla.on("select", onSelect)
    return () => {
      embla.off("select", onSelect)
    }
  }, [embla, select])

  React.useEffect(() => {
    if (embla && embla.selectedScrollSnap() !== safe) embla.scrollTo(safe, true)
  }, [embla, safe])

  if (!images.length) return null
  const go = (i: number) => select((i + images.length) % images.length)
  const arrow =
    "grid size-11 place-items-center rounded-full bg-surface/90 text-fg shadow-raised hover:bg-surface disabled:opacity-40"

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("grid gap-3", className)}
    >
      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden rounded-card bg-teal-soft">
          <div className="flex">
            {images.map((img, i) => (
              <div
                key={img.src}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${images.length}`}
                className="relative aspect-[4/5] min-w-0 flex-[0_0_100%]"
              >
                {renderImage(img, { priority: i === 0, large: false })}
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label="Zoom image"
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-surface/90 shadow-raised hover:bg-surface"
        >
          <Expand className="size-5" aria-hidden />
        </button>
        {images.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-3 top-1/2 hidden -translate-y-1/2 justify-between md:flex">
            <button
              type="button"
              className={cn(arrow, "pointer-events-auto")}
              aria-label="Previous image"
              disabled={safe === 0}
              onClick={() => go(safe - 1)}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              className={cn(arrow, "pointer-events-auto")}
              aria-label="Next image"
              disabled={safe === images.length - 1}
              onClick={() => go(safe + 1)}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        ) : null}
        <p
          aria-live="polite"
          className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-bold"
        >
          {safe + 1} / {images.length}
        </p>
      </div>

      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose image">
          {images.map((img, i) => (
            <li key={img.src} className="shrink-0">
              <button
                type="button"
                aria-label={`Show image ${i + 1}`}
                aria-current={i === safe ? "true" : undefined}
                onClick={() => go(i)}
                className={cn(
                  "relative block aspect-[4/5] w-16 overflow-hidden rounded-control border-2 bg-teal-soft",
                  i === safe ? "border-fg" : "border-transparent",
                )}
              >
                {renderImage(img, { priority: false, large: false })}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <D.Root open={lightbox} onOpenChange={setLightbox}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-navy/80 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
          <Lightbox
            image={images[safe]!}
            index={safe}
            total={images.length}
            onPrev={() => go(safe - 1)}
            onNext={() => go(safe + 1)}
            renderImage={renderImage}
          />
        </D.Portal>
      </D.Root>
    </section>
  )
}

// Mounts only while open, so useReturnFocus captures the zoom button at the right moment.
function Lightbox({
  image,
  index,
  total,
  onPrev,
  onNext,
  renderImage,
}: {
  image: GalleryImage
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  renderImage: ImageGalleryProps["renderImage"]
}) {
  const returnFocus = useReturnFocus()
  const nav =
    "grid size-12 place-items-center rounded-full bg-surface text-fg shadow-raised disabled:opacity-40"
  return (
    <D.Content
      aria-describedby={undefined}
      onCloseAutoFocus={returnFocus}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onPrev()
        if (e.key === "ArrowRight") onNext()
      }}
      className="fixed inset-0 z-50 grid grid-rows-[auto_1fr] outline-none"
    >
      <D.Title className="sr-only">
        {image.alt}, image {index + 1} of {total}
      </D.Title>
      <div className="flex justify-end p-3">
        <D.Close aria-label="Close zoom" className={nav}>
          <X className="size-6" aria-hidden />
        </D.Close>
      </div>
      <div className="relative mx-auto flex w-full max-w-3xl items-center justify-center px-3 pb-6">
        <button
          type="button"
          aria-label="Previous image"
          className={cn(nav, "absolute left-3 z-10")}
          disabled={index === 0}
          onClick={onPrev}
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <div className="relative aspect-[4/5] max-h-[80dvh] w-full overflow-hidden rounded-card bg-teal-soft">
          {renderImage(image, { priority: true, large: true })}
        </div>
        <button
          type="button"
          aria-label="Next image"
          className={cn(nav, "absolute right-3 z-10")}
          disabled={index === total - 1}
          onClick={onNext}
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      </div>
    </D.Content>
  )
}
