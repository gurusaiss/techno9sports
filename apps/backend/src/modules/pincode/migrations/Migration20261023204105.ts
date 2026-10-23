import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261023204105 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "pincode" drop constraint if exists "pincode_pincode_unique";`,
    )
    this.addSql(
      `create table if not exists "pincode" ("id" text not null, "pincode" text not null, "city" text not null, "district" text null, "state" text not null, "state_code" text not null, "serviceable" boolean not null default true, "cod_allowed" boolean not null default true, "days_min" integer not null default 3, "days_max" integer not null default 7, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pincode_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pincode_pincode_unique" ON "pincode" ("pincode") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pincode_deleted_at" ON "pincode" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pincode" cascade;`)
  }
}
