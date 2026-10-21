import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261021085317 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "size_chart" drop constraint if exists "size_chart_handle_unique";`,
    )
    this.addSql(
      `create table if not exists "size_chart" ("id" text not null, "handle" text not null, "name" text not null, "unit" text check ("unit" in ('in', 'cm', 'mm')) not null default 'in', "columns" text[] not null, "sizes" text[] not null, "rows" jsonb not null, "how_to_measure" text null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "size_chart_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_size_chart_handle_unique" ON "size_chart" ("handle") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_size_chart_deleted_at" ON "size_chart" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "size_chart" cascade;`)
  }
}
