import { env } from "@chewbuu/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const pool = new Pool({
  allowExitOnIdle: true,
  connectionString: env.DATABASE_URL,
  max: 5,
});

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
    await pool.query(
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "display_username" text;'
    );
    await pool.query(
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;'
    );
    await pool.query(`
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
    `);
    await pool.query(
      'ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "aaguid" text;'
    );
  } catch (error) {
    console.error("Schema migration check error:", error);
  }
}

export function createDb() {
  void ensureSchemaMigrated();
  return drizzle(pool, { schema });
}

export const db = createDb();
