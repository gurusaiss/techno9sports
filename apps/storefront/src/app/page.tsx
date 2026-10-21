import Link from "next/link"
import { Button, Container } from "@t9/ui"
import { HomeBlocks } from "@/components/home/blocks"
import { PlaceholderMedia } from "@/components/placeholder-media"
import { getPageBlocks } from "@/lib/catalog"
import { safe } from "@/lib/safe"
import { jsonLdString, organizationJsonLd, websiteJsonLd } from "@/lib/seo"

export default async function Home() {
  const blocks = await safe(() => getPageBlocks("home"), [])
  const content = blocks.filter((b) => b.type !== "offer_strip")

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString([organizationJsonLd(), websiteJsonLd()]),
        }}
      />
      {content.length ? (
        <HomeBlocks blocks={content} />
      ) : (
        // Shown only when the content service is unreachable, so the home page is never blank.
        <Container className="grid items-center gap-6 py-10 lg:grid-cols-2">
          <div className="grid gap-4">
            <h1 className="font-display text-[clamp(32px,6vw,56px)] font-extrabold leading-tight">
              Activewear and sports frames
            </h1>
            <p className="max-w-[46ch] text-[17px]">Light, breathable gear for Indian weather.</p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/men">Shop men</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/women">Shop women</Link>
              </Button>
            </div>
          </div>
          <div className="aspect-[5/4] overflow-hidden rounded-panel">
            <PlaceholderMedia kind="tee" bg="#ffd3c4" label="" />
          </div>
        </Container>
      )}
    </>
  )
}
