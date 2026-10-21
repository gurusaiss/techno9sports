"use client"

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { cn } from "../lib/cn"

export interface CarouselProps {
  slides: React.ReactNode[]
  /** Accessible name, for example "Featured offers". */
  label: string
  loop?: boolean
  /** Milliseconds between slides. Off when omitted, and always off for reduced-motion users. */
  autoplayMs?: number
  className?: string
}

export function Carousel({ slides, label, loop = true, autoplayMs, className }: CarouselProps) {
  const [emblaRef, embla] = useEmblaCarousel({ loop, align: "start" })
  const [index, setIndex] = React.useState(0)
  const [playing, setPlaying] = React.useState(Boolean(autoplayMs))
  const [paused, setPaused] = React.useState(false)

  React.useEffect(() => {
    if (!embla) return
    const onSelect = () => setIndex(embla.selectedScrollSnap())
    onSelect()
    embla.on("select", onSelect)
    return () => {
      embla.off("select", onSelect)
    }
  }, [embla])

  React.useEffect(() => {
    if (!embla || !autoplayMs || !playing || paused) return
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    const id = window.setInterval(() => embla.scrollNext(), autoplayMs)
    return () => window.clearInterval(id)
  }, [embla, autoplayMs, playing, paused])

  const btn =
    "grid size-11 place-items-center rounded-full bg-surface/90 text-fg shadow-raised hover:bg-surface"

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("relative", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div ref={emblaRef} className="overflow-hidden rounded-panel">
        <div className="flex" aria-live={playing && !paused ? "off" : "polite"}>
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              className="min-w-0 flex-[0_0_100%]"
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => embla?.scrollTo(i)}
              className="grid size-6 place-items-center rounded-full"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-fg" : "w-2 bg-line-strong",
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {autoplayMs ? (
            <button
              type="button"
              className={btn}
              aria-label={playing ? "Pause automatic slides" : "Play automatic slides"}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? (
                <Pause className="size-5" aria-hidden />
              ) : (
                <Play className="size-5" aria-hidden />
              )}
            </button>
          ) : null}
          <button
            type="button"
            className={btn}
            aria-label="Previous slide"
            onClick={() => embla?.scrollPrev()}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Next slide"
            onClick={() => embla?.scrollNext()}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}
