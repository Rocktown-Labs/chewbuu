import { env } from "@chewbuu/env/server";
import { Kysely, PostgresDialect, type ColumnType } from "kysely";
import { Pool } from "pg";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface AuthUserTable {
  daily_date_limit: number;
  display_username: string | null;
  email: string;
  has_completed_onboarding: boolean;
  has_intro_video: boolean;
  has_profile_photo: boolean;
  id: string;
  membership_tier: string;
  name: string;
  role: string | null;
  stripe_customer_id: string | null;
  updated_at: Timestamp;
  username: string | null;
}

export interface Database {
  user: AuthUserTable;
}

export const pool = new Pool({
  allowExitOnIdle: true,
  connectionString: env.DATABASE_URL,
  max: 5,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

export const createDb = (): Kysely<Database> => db;
