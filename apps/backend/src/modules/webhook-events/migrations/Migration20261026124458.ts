import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261026124458 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "webhook_event" drop constraint if exists "webhook_event_provider_key_unique";`,
    )
    this.addSql(
      `create table if not exists "webhook_event" ("id" text not null, "provider" text not null, "key" text not null, "payload" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_event_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_event_deleted_at" ON "webhook_event" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_webhook_event_provider_key_unique" ON "webhook_event" ("provider", "key") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "webhook_event" cascade;`)
  }
}
