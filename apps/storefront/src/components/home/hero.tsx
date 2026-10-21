import Link from "next/link"
import { getImageProps } from "next/image"
import type { ContentBlock } from "@t9/types"
import { Button, Carousel, Container } from "@t9/ui"
import { TONE_CLASS } from "./tone"

type Hero = Extract<ContentBlock, { type: "hero_carousel" }>["data"]["slides"][number]

/** Art-directed banner: a wide image from tablet up, a tall one on phones, one request each. */
function Banner({ slide, priority }: { slide: Hero; priority: boolean }) {
  const common = {
    alt: slide.image_desktop.alt,
    fill: true,
    sizes: "100vw",
    priority,
    fetchPriority: priority ? ("high" as const) : undefined,
  }
  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...common, src: slide.image_desktop.url })
  const { props: mobile } = getImageProps({
    ...common,
    src: (slide.image_mobile ?? slide.image_desktop).url,
    alt: (slide.image_mobile ?? slide.image_desktop).alt,
  })
  const { srcSet: mobileSet, ...img } = mobile
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktopSet} sizes="100vw" />
      <source media="(max-width: 767px)" srcSet={mobileSet} sizes="100vw" />
      <img {...img} alt={img.alt ?? ""} className="object-cover" />
    </picture>
  )
}

export function HeroBlock({ data }: { data: Hero extends never ? never : { slides: Hero[] } }) {
  return (
    <Container className="pt-3 lg:pt-6">
      <Carousel
        label="Featured offers"
        autoplayMs={7000}
        slides={data.slides.map((slide, i) => (
          <div
            key={slide.heading}
            className={`relative md:aspect-[16/7] ${TONE_CLASS[slide.tone]}`}
          >
            <div className="relative aspect-[8/9] md:absolute md:inset-0 md:aspect-auto">
              <Banner slide={slide} priority={i === 0} />
            </div>
            <div className="relative grid gap-3 p-5 md:absolute md:inset-y-0 md:left-0 md:w-[48%] md:content-center md:p-12">
              {slide.eyebrow ? (
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-link">
                  {slide.eyebrow}
                </p>
              ) : null}
              {i === 0 ? (
                <h1 className="font-display text-[clamp(30px,4.4vw,56px)] font-extrabold leading-[1.05] tracking-tight">
                  {slide.heading}
                </h1>
              ) : (
                <h2 className="font-display text-[clamp(30px,4.4vw,56px)] font-extrabold leading-[1.05] tracking-tight">
                  {slide.heading}
                </h2>
              )}
              {slide.text ? <p className="max-w-[42ch] text-[17px]">{slide.text}</p> : null}
              <div className="mt-1 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={slide.primary_cta.href}>{slide.primary_cta.label}</Link>
                </Button>
                {slide.secondary_cta ? (
                  <Button asChild variant="secondary">
                    <Link href={slide.secondary_cta.href}>{slide.secondary_cta.label}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      />
    </Container>
  )
}
