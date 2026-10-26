import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button, Container, Skeleton } from "@t9/ui"
import { fetchOrder } from "@/lib/payment"
import { inr } from "@/lib/format-money"

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } }
// A just-placed order is never link-navigated into with a prefetchable id, and WishlistProvider
// (shared across the whole app) reads session state in a way that can't produce a static shell for
// an unparameterized dynamic segment like this one; see docs/app/api-reference/.../instant.md.
export const instant = false

async function Confirmation({ id }: { id: string }) {
  const order = await fetchOrder(id)
  if (!order) notFound()

  const isCod = order.payment_method === "cod"
  const payable = isCod ? order.payable : order.total

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-8 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <h1 className="font-display text-[clamp(24px,3.4vw,32px)] font-extrabold">
              Order placed
            </h1>
            <p className="text-muted">
              Order #{order.display_id} · We&apos;ve sent a confirmation to{" "}
              {order.email ?? "your phone"}.
            </p>
          </div>
        </div>

        <section aria-labelledby="items-heading" className="grid gap-4">
          <h2 id="items-heading" className="font-display text-lg font-extrabold">
            Items
          </h2>
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {order.items.map((l, i) => (
              <li key={i} className="flex gap-3 p-4">
                {l.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.thumbnail}
                    alt=""
                    width={64}
                    height={80}
                    className="h-20 w-16 rounded-control object-cover"
                  />
                ) : null}
                <div className="grid flex-1 content-start gap-0.5">
                  <p className="font-semibold">{l.title}</p>
                  {l.variant ? <p className="text-sm text-muted">{l.variant}</p> : null}
                  <p className="text-sm text-muted">Qty {l.quantity}</p>
                </div>
                <p className="font-semibold">{inr(l.line_total)}</p>
              </li>
            ))}
          </ul>
        </section>

        {order.shipping_address ? (
          <section aria-labelledby="address-heading" className="grid gap-2">
            <h2 id="address-heading" className="font-display text-lg font-extrabold">
              Delivering to
            </h2>
            <address className="rounded-card border border-line bg-surface p-4 text-[15px] not-italic leading-relaxed">
              <b>
                {order.shipping_address.first_name} {order.shipping_address.last_name}
              </b>
              , {order.shipping_address.address_1}
              {order.shipping_address.address_2
                ? `, ${order.shipping_address.address_2}`
                : ""}, {order.shipping_address.city}, {order.shipping_address.province}{" "}
              {order.shipping_address.postal_code}
              <br />
              <span className="text-muted">Mobile {order.shipping_address.phone}</span>
            </address>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={`/api/invoice/${order.id}`} target="_blank" rel="noreferrer">
              Download invoice
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/new">Continue shopping</Link>
          </Button>
        </div>
      </div>

      <aside
        aria-label="Payment summary"
        className="grid h-fit content-start gap-3 rounded-card border border-line bg-surface p-5 lg:sticky lg:top-24"
      >
        <h2 className="font-display text-lg font-extrabold">Payment</h2>
        <dl className="grid gap-1.5 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Items + shipping + tax</dt>
            <dd>{inr(order.total)}</dd>
          </div>
          {isCod ? (
            <div className="flex justify-between">
              <dt className="text-muted">Cash-on-delivery fee</dt>
              <dd>{inr(order.cod_fee)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-line pt-1.5 font-bold">
            <dt>{isCod ? "Pay on delivery" : "Paid"}</dt>
            <dd>{inr(payable)}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted">
          {isCod
            ? "Have the exact amount ready in cash when your order arrives."
            : "Paid online via Razorpay."}
        </p>
      </aside>
    </div>
  )
}

export default async function OrderConfirmationPage(props: PageProps<"/order/[id]">) {
  const { id } = await props.params
  return (
    <Container className="py-8 md:py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Confirmation id={id} />
      </Suspense>
    </Container>
  )
}
