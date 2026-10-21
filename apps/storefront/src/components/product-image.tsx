import Image from "next/image"

/** next/image for catalogue media: AVIF/WebP, responsive sizes, lazy unless it is the LCP image. */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      className={className ?? "object-cover"}
    />
  )
}
