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

export interface MembershipPlanTable {
  active: boolean;
  annual_price_cents: number;
  annual_stripe_price_id: string | null;
  created_at: Timestamp;
  cta: string;
  description: string;
  features: ColumnType<
    string[],
    string[] | string | undefined,
    string[] | string
  >;
  id: string;
  monthly_price_cents: number;
  name: string;
  sort_order: number;
  stats: ColumnType<string[], string[] | string | undefined, string[] | string>;
  stripe_currency: string;
  stripe_mode: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  stripe_sync_status: string;
  stripe_synced_at: Timestamp | null;
  tier: string;
  updated_at: Timestamp;
}

export interface SyncPlanTable {
  active: boolean;
  code: string;
  created_at: Timestamp;
  description: string;
  id: string;
  max_staff: number;
  monthly_price_cents: number;
  monthly_stripe_price_id: string | null;
  name: string;
  referral_reward_cents: number;
  stripe_currency: string;
  stripe_mode: string | null;
  stripe_product_id: string | null;
  stripe_sync_status: string;
  stripe_synced_at: Timestamp | null;
  updated_at: Timestamp;
}

export interface OrganizationTable {
  created_at: Timestamp;
  id: string;
  logo: string | null;
  metadata: string | null;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
}

export interface Database {
  membership_plan: MembershipPlanTable;
  organization: OrganizationTable;
  sync_plan: SyncPlanTable;
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
