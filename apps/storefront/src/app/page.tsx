import Link from "next/link"
import { Banknote, Flag, RotateCcw, Truck } from "lucide-react"
import { Button, Container, UspStrip } from "@t9/ui"
import { PlaceholderMedia } from "@/components/placeholder-media"

export default function Home() {
  return (
    <>
      <section className="bg-teal-mist">
        <Container className="grid items-center gap-6 py-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-link">
              Move in the morning light
            </p>
            <h1 className="my-3 font-display text-[clamp(38px,7vw,72px)] font-extrabold leading-none tracking-tight">
              Gear for every sunrise run.
            </h1>
            <p className="max-w-[46ch] text-[17px]">
              Light, breathable activewear and sports frames for Indian weather. Honest prices from
              ₹299.
            </p>
            <div className="my-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/men">Shop men</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/women">Shop women</Link>
              </Button>
            </div>
            <p className="text-[13px] opacity-80">
              Placeholder hero. The homepage is built in Phase 2.
            </p>
          </div>
          <div className="aspect-[5/4] overflow-hidden rounded-panel shadow-pop">
            <PlaceholderMedia kind="tee" bg="#ffd3c4" label="Placeholder hero image" />
          </div>
        </Container>
      </section>
      <UspStrip
        items={[
          { icon: <Truck />, title: "Free shipping", text: "above ₹999" },
          { icon: <Banknote />, title: "Cash on delivery", text: "on eligible pincodes" },
          { icon: <RotateCcw />, title: "Easy returns", text: "7-day returns and exchange" },
          { icon: <Flag />, title: "Made in India", text: "for Indian weather" },
        ]}
      />
      <Container className="py-10">
        <p className="text-muted">
          Design system preview:{" "}
          <Link href="/design" className="font-bold text-link underline">
            /design
          </Link>
        </p>
      </Container>
    </>
  )
}
