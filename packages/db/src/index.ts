import { env } from "@chewbuu/env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let migrationChecked = false;

export async function ensureSchemaMigrated() {
  if (
    migrationChecked ||
    process.env.NODE_ENV === "test" ||
    env.DATABASE_URL.includes("mock")
  ) {
    return;
  }
  migrationChecked = true;
  try {
    const sql = neon(env.DATABASE_URL);
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "display_username" text;`;
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;`;
    await sql`
      CREATE TABLE IF NOT EXISTS "passkey" (
        "backed_up" boolean DEFAULT false NOT NULL,
        "counter" integer NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "credential_id" text NOT NULL,
        "device_type" text NOT NULL,
        "id" text PRIMARY KEY NOT NULL,
        "name" text,
        "public_key" text NOT NULL,
        "transports" text,
        "user_id" text NOT NULL
      );
    `;
  } catch (error) {
    console.error("Schema migration check error:", error);
  }
}

export function createDb() {
  void ensureSchemaMigrated();
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export const db = createDb();
