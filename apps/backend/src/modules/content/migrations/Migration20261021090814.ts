import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261021090814 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "content_block" ("id" text not null, "page" text not null default 'home', "type" text check ("type" in ('offer_strip', 'hero_carousel', 'usp_strip', 'category_tiles', 'product_rail', 'technology_highlights', 'promo_banner', 'newsletter')) not null, "label" text not null, "position" integer not null default 0, "is_active" boolean not null default true, "starts_at" timestamptz null, "ends_at" timestamptz null, "data" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_block_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_content_block_deleted_at" ON "content_block" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_content_block_page_position" ON "content_block" ("page", "position") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_block" cascade;`)
  }
}
