import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261023204104 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "otp_challenge" ("id" text not null, "phone" text not null, "purpose" text check ("purpose" in ('login', 'cod')) not null, "code_hash" text not null, "expires_at" timestamptz not null, "attempts" integer not null default 0, "consumed_at" timestamptz null, "context" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "otp_challenge_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_otp_challenge_deleted_at" ON "otp_challenge" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_otp_challenge_phone_purpose" ON "otp_challenge" ("phone", "purpose") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "otp_challenge" cascade;`)
  }
}
