import { randomUUID } from "node:crypto"

/** Just the part of knex a payment-provider container exposes (same constraint as the tax provider). */
type Knex = {
  raw: (sql: string, bindings: unknown[]) => Promise<{ rows: unknown[] }>
}
type Container = { __pg_connection__: Knex }

/**
 * Records that an external event was processed. Returns false (and records nothing) if this exact
 * (provider, key) was already seen, so the caller can skip reprocessing — the core of webhook
 * idempotency. A payment-provider module only sees its own container, not other modules (the same
 * constraint the GST tax provider has), so this writes through the raw connection. The table's
 * unique index is partial (`WHERE deleted_at IS NULL`, Medusa's soft-delete convention), so the
 * conflict target has to repeat that predicate or Postgres refuses to infer it. The unique index is
 * what actually makes this race-safe: two concurrent deliveries both try to insert and only one wins.
 */
export async function claimWebhookEvent(
  container: Container,
  provider: string,
  key: string,
  payload?: unknown,
): Promise<boolean> {
  const id = `whev_${randomUUID().replace(/-/g, "")}`
  const { rows } = await container.__pg_connection__.raw(
    `insert into "webhook_event" ("id", "provider", "key", "payload", "created_at", "updated_at")
     values (?, ?, ?, ?, now(), now())
     on conflict ("provider", "key") where "deleted_at" is null do nothing
     returning "id"`,
    [id, provider, key, payload ? JSON.stringify(payload) : null],
  )
  return rows.length > 0
}
