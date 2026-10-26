# 0007: Razorpay and COD payments

Status: accepted (Phase 4).

## Decisions

- **Own Medusa payment-provider modules**, not a community plugin (per ADR 0004): `payment-razorpay`
  (`pp_razorpay_razorpay`) and `payment-cod` (`pp_cod_cod`), both registered on the India region.
- **The server is the only source of the amount.** `initiatePayment` creates the Razorpay order from
  the cart's own server-computed total (`input.amount`), with `payment_capture: 1` (auto-capture).
  The storefront never sends a price; the store API's line-item and cart-update schemas reject
  `unit_price`/`total`/`discount_total` outright (`Unrecognized fields`), so a tampered amount can't
  even reach the server.
- **`session_id` round-trips through Razorpay's own `notes`.** Medusa creates the PaymentSession row
  before calling `initiatePayment`, and passes that id back in as `data.session_id` — this project
  writes it into the order's `notes.session_id`, which Razorpay copies onto the resulting payment.
  That's how a webhook, given only a Razorpay payment payload, finds the Medusa session (and from it
  the cart) without any extra lookup table.
- **Authorization reads Razorpay's API, not the client's callback.** `authorizePayment` calls
  `fetchOrderPayments(order_id)` and looks for a captured payment — the checkout-signature verifier
  (`verifyCheckoutSignature`) is kept as a fast client-side sanity check, but the thing that actually
  decides whether an order gets created is this live server-side lookup, so a forged client callback
  cannot create a paid order.
- **Webhooks use Medusa's built-in `/hooks/payment/:provider` route**, not a custom one: it already
  queues the event and runs `processPaymentWorkflow`, which resolves session → cart and completes it
  — this is what makes "customer paid, closed the browser before the redirect" work with no extra
  code. The URL is `/hooks/payment/razorpay_razorpay` (Medusa prefixes the route param with `pp_`, so
  the param must be the provider id _after_ that prefix, i.e. `<module-id>_<identifier>` — easy to
  get wrong; the route answers 200 either way since verification happens inside the provider).
  Signature verification (HMAC-SHA256 of the raw body) happens first, inside
  `getWebhookActionAndData`, before any state changes.
- **Idempotency is a real unique constraint, not a convention.** A `webhook_event` module logs
  `(provider, key)` with `key = "<event>:<razorpay-payment-id>"`; a duplicate delivery hits the
  unique index and is a no-op, verified by actually delivering the same webhook twice in a live test
  and confirming only one order and one `webhook_event` row exist. The provider's container can't
  resolve other modules (the same constraint as the GST tax provider, ADR 0006), so this writes
  through the raw Postgres connection with `ON CONFLICT ... DO NOTHING` — and because the model's
  unique index is partial (`WHERE deleted_at IS NULL`, Medusa's soft-delete convention), the SQL has
  to repeat that predicate or Postgres refuses to infer the conflict target.
- **No overselling, including the concurrency case, needed no new code.** Medusa v2 only checks
  availability (not a hard reservation) when a line item is added to a cart; the actual reservation
  is created atomically at `/store/carts/:id/complete`. Verified live: two carts both add the last
  unit successfully, both get a payment session, and completing them concurrently lets exactly one
  through — the other gets a clear `not_allowed` "Not enough stock available" error, cart intact.
- **COD is a payment provider, not a special case in checkout.** `initiatePayment`/`authorizePayment`
  both return `authorized` immediately (no money moves online); eligibility — order-value cap,
  blocked pincodes, OTP confirmation — is enforced by the checkout route before a COD session is ever
  created (`src/lib/cod-eligibility.ts`), not by the provider. "Capture" on COD happens when the
  parcel is marked delivered (Phase 5/6 admin action); refunds are a manual bank/UPI transfer an
  admin records, not an API call.
- **A dev-only payment simulator** (`POST /store/dev/razorpay/simulate`, 404 the moment real
  `RAZORPAY_KEY_ID`/`SECRET` are set) stands in for the Razorpay Checkout popup — used by the backend
  integration tests and by local/staging demos, never reachable once live keys are configured.
- **Reconciliation job** (`src/jobs/reconcile-payments.ts`, every 15 minutes): finds payment
  sessions still `pending` after 10 minutes, asks the provider for the live status, and completes the
  cart if Razorpay actually captured it — the fallback for a webhook that never arrived.
- **Invoices**: GST-compliant PDF per order, number series from the `invoice` setting
  (`T9-<year>-<seq>`), generated on order placement and downloadable from the account order page
  (Phase 6 admin screen) — GSTIN and business address are placeholders pending the owner's details.

## Consequences

Razorpay test-mode keys, the webhook URL (`https://techno9sports.in/hooks/payment/razorpay_razorpay`),
and the webhook secret are owner action items before Phase 10 go-live (test mode only until then).
