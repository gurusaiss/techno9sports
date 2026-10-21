import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261021085316 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "fabric_technology" drop constraint if exists "fabric_technology_handle_unique";`,
    )
    this.addSql(
      `create table if not exists "fabric_technology" ("id" text not null, "handle" text not null, "name" text not null, "tagline" text null, "description" text null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "fabric_technology_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_fabric_technology_handle_unique" ON "fabric_technology" ("handle") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_fabric_technology_deleted_at" ON "fabric_technology" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "fabric_technology" cascade;`)
  }
}
