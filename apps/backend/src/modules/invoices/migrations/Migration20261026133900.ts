import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261026133900 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "invoice" drop constraint if exists "invoice_number_unique";`,
    )
    this.addSql(
      `alter table if exists "invoice" drop constraint if exists "invoice_order_id_unique";`,
    )
    this.addSql(
      `create table if not exists "invoice" ("id" text not null, "order_id" text not null, "number" text not null, "issued_at" timestamptz not null, "gst_scheme" text check ("gst_scheme" in ('intra', 'inter')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_order_id_unique" ON "invoice" ("order_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_number_unique" ON "invoice" ("number") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_invoice_deleted_at" ON "invoice" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "invoice" cascade;`)
  }
}
