import { AppSetting } from "@aws-blocks/bb-app-setting";
import {
  Database,
  createKyselyAdapter,
  fromExisting,
} from "@aws-blocks/bb-data";
import { Scope } from "@aws-blocks/blocks";
import { getStackName } from "@aws-blocks/blocks/scripts";
import { normalizeConnectionString } from "@chewbuu/db/connection-string";
import type { ColumnType, Kysely } from "kysely";

import { DATABASE_CA_CERT } from "../generated/database.ca";

const dbConnectionParameterName = (stackName: string) => `/${stackName}-db-url`;

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type JsonColumn<T> = ColumnType<T, T | string | undefined, T | string>;

/**
 * Serialize a JS value as a JSON string for a jsonb column write.
 *
 * The pg-client engine hands values to node-postgres, which serializes JS
 * objects as JSON but non-empty JS arrays as Postgres array literals (e.g.
 * `{solo}`) — invalid jsonb input. Passing an explicit JSON string is safe for
 * every bb-data engine (pg-client, Data API) and casts cleanly to jsonb.
 */
export const jsonb = (value: unknown): string => JSON.stringify(value);

export interface ChatRoomTable {
  active_date_id: string | null;
  created_at: Timestamp;
  id: string;
  kind: string;
  match_id: string | null;
  phase: string;
  title: string;
  updated_at: Timestamp;
}

export interface ChatParticipantTable {
  avatar_url: string | null;
  display_name: string;
  id: string;
  room_id: string;
  user_id: string | null;
}

export interface ChatMessageTable {
  created_at: Timestamp;
  duration_sec: number | null;
  id: string;
  kind: string;
  media_thumb_url: string | null;
  media_url: string | null;
  room_id: string;
  sender_id: string;
  system_icon: string | null;
  text: string | null;
}

export interface ChatReadStateTable {
  last_read_at: Timestamp;
  room_id: string;
  user_id: string;
}

export interface UserTable {
  daily_date_limit: number;
  display_username: string | null;
  email: string;
  has_completed_onboarding: boolean;
  has_intro_video: boolean;
  has_profile_photo: boolean;
  id: string;
  membership_tier: string;
  name: string;
  username: string | null;
}

export interface SubscriptionTable {
  billing_interval: string | null;
  cancel_at: Timestamp | null;
  cancel_at_period_end: boolean;
  canceled_at: Timestamp | null;
  created_at: Timestamp;
  ended_at: Timestamp | null;
  id: string;
  period_end: Timestamp | null;
  period_start: Timestamp | null;
  plan: string;
  reference_id: string;
  seats: number | null;
  status: string;
  stripe_customer_id: string | null;
  stripe_schedule_id: string | null;
  stripe_subscription_id: string | null;
  trial_end: Timestamp | null;
  trial_start: Timestamp | null;
  updated_at: Timestamp;
}

export interface MembershipPlanTable {
  active: boolean;
  annual_price_cents: number;
  annual_stripe_price_id: string | null;
  created_at: Timestamp;
  cta: string;
  description: string;
  features: JsonColumn<string[]>;
  id: string;
  monthly_price_cents: number;
  name: string;
  sort_order: number;
  stats: JsonColumn<string[]>;
  stripe_price_id: string | null;
  tier: string;
  updated_at: Timestamp;
}

export interface ProfileTable {
  age_range_max: number | null;
  age_range_min: number | null;
  area: string | null;
  bio: string | null;
  birthday: string | null;
  can_date: boolean;
  created_at: Timestamp;
  contribution_score: number;
  dating_modes: JsonColumn<string[]>;
  distance_miles: number;
  favorite_things: JsonColumn<string[]>;
  favorite_places: JsonColumn<Record<string, unknown>>;
  height: string | null;
  id: string;
  interest_details: JsonColumn<Record<string, string[]>>;
  interested_in: JsonColumn<string[]>;
  interests: JsonColumn<string[]>;
  intro_video_url: string | null;
  latitude: string | null;
  longitude: string | null;
  looking_for: JsonColumn<string[]>;
  onboarded: boolean;
  onboarding_completed_at: Timestamp | null;
  profile_photo_url: string | null;
  reliability_score: number;
  safety_opt_in: boolean;
  sex: string | null;
  sexuality: string | null;
  updated_at: Timestamp;
  user_id: string;
  weight: string | null;
  wants_kids: string | null;
  phone: string | null;
  occupation: string | null;
  race: string | null;
  kids: string | null;
  marital_status: string | null;
  politics: string | null;
  religion: string | null;
}

export interface ProfileMediaTable {
  created_at: Timestamp;
  id: string;
  is_primary: boolean;
  kind: string;
  sort_order: number;
  url: string;
  user_id: string;
}

export interface TrustedContactTable {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  user_id: string;
}

export interface FriendInviteTable {
  circle_id: string | null;
  created_at: Timestamp;
  email: string | null;
  id: string;
  invite_purpose: string;
  invite_token: string;
  name: string | null;
  phone: string | null;
  relationship: string;
  status: string;
  user_id: string;
}

export interface CircleTable {
  created_at: Timestamp;
  description: string | null;
  handle: string | null;
  id: string;
  kind: string;
  name: string;
  owner_user_id: string;
  style: JsonColumn<Record<string, string>>;
  updated_at: Timestamp;
}

export interface CircleMemberTable {
  circle_id: string;
  created_at?: Timestamp;
  id: string;
  invite_id: string | null;
  role: string;
  status: string;
  user_id: string;
}

export interface ReferralTable {
  accepted_at: Timestamp | null;
  friend_invite_id: string | null;
  id: string;
  referred_email: string | null;
  referred_phone: string | null;
  referred_user_id: string | null;
  referral_type: string;
  referrer_user_id: string;
  reward_status: string;
  source: string;
  status: string;
  updated_at: Timestamp;
}

export interface DateRequestTable {
  actual_end_at: Timestamp | null;
  actual_start_at: Timestamp | null;
  created_at: Timestamp;
  chime_meeting_id: string | null;
  filters: JsonColumn<string[]>;
  id: string;
  party_size: number;
  payment_mode: string;
  scheduled_at: Timestamp;
  search_area: string;
  status: string;
  updated_at: Timestamp;
  user_id: string;
  what: JsonColumn<string[]>;
}

export interface DateRequestPartyMemberTable {
  display_name: string;
  id: string;
  invited_user_id: string | null;
  request_id: string;
  source: string;
  status: string;
}

export interface DateRequestPlaceTable {
  address: string | null;
  id: string;
  name: string;
  place_id: string;
  rating: string | null;
  request_id: string;
  selected: boolean;
  types: JsonColumn<string[]>;
}

export interface DateMatchTable {
  compatibility: number;
  display_name: string;
  group_id: string | null;
  id: string;
  intro_video_url: string;
  profile_photo_url: string | null;
  profile_summary: string;
  request_id: string;
  match_kind: string;
  status: string;
  user_id: string;
  video_replies_required: number;
}

export interface DateReviewTable {
  completed_at: Timestamp | null;
  date_request_id: string;
  id: string;
  person_comment: string | null;
  person_criteria: JsonColumn<Record<string, number>>;
  person_rating: number | null;
  place_comment: string | null;
  place_criteria: JsonColumn<Record<string, number>>;
  place_rating: number | null;
  required: boolean;
  user_id: string;
}

export interface DateMediaTable {
  created_at: Timestamp;
  date_request_id: string;
  id: string;
  kind: string;
  thumbnail_url: string | null;
  uploaded_by_user_id: string;
  url: string;
}

export interface DateReviewMediaTable {
  date_media_id: string;
  review_id: string;
}

export interface FriendshipTable {
  accepted_at: Timestamp | null;
  created_at: Timestamp;
  friend_user_id: string;
  id: string;
  status: string;
  user_id: string;
}

export interface RecapTable {
  author_user_id: string;
  caption: string | null;
  created_at: Timestamp;
  date_request_id: string;
  id: string;
  published_at: Timestamp | null;
  review_id: string | null;
  story_expires_at: Timestamp | null;
  thumbnail_url: string | null;
  video_url: string;
}

export interface NotificationTable {
  body: string;
  created_at: Timestamp;
  dedupe_key: string;
  entity_id: string | null;
  entity_type: string | null;
  id: string;
  kind: string;
  read_at: Timestamp | null;
  title: string;
  user_id: string;
}

export interface VenueOrganizationTable {
  created_at: Timestamp;
  created_by_user_id: string;
  description: string | null;
  handle: string | null;
  id: string;
  name: string;
  slug: string;
  status: string;
  style: JsonColumn<Record<string, string>>;
  updated_at: Timestamp;
}

export interface VenueLocationTable {
  address: string | null;
  claimed_at: Timestamp | null;
  created_at: Timestamp;
  description: string | null;
  discovery_place_id: string | null;
  handle: string | null;
  id: string;
  menu_url: string | null;
  name: string;
  organization_id: string;
  phone: string | null;
  status: string;
  style: JsonColumn<Record<string, string>>;
  submitted_by_user_id: string | null;
  stripe_account_id: string | null;
  updated_at: Timestamp;
  verified_at: Timestamp | null;
  website_url: string | null;
}

export interface VenueMemberTable {
  created_at: Timestamp;
  id: string;
  organization_id: string;
  role: string;
  status: string;
  updated_at: Timestamp;
  user_id: string;
}

export interface SyncSubscriptionTable {
  created_at: Timestamp;
  ended_at: Timestamp | null;
  id: string;
  organization_id: string | null;
  plan: string;
  status: string;
  stripe_subscription_id: string | null;
  updated_at: Timestamp;
  user_id: string;
}

export interface VenueMemberInviteTable {
  created_at: Timestamp;
  email: string;
  id: string;
  invite_token: string;
  name: string | null;
  organization_id: string;
  role: string;
  status: string;
  invited_by_user_id: string;
}

export interface VenueContributionTable {
  created_at: Timestamp;
  id: string;
  kind: string;
  location_id: string;
  media_urls: JsonColumn<string[]>;
  payload: JsonColumn<Record<string, unknown>>;
  reviewed_at: Timestamp | null;
  reviewed_by_user_id: string | null;
  status: string;
  submitted_by_user_id: string;
  updated_at: Timestamp;
}

export interface VenueMenuTable {
  created_at: Timestamp;
  extracted_data: JsonColumn<Record<string, unknown>>;
  id: string;
  location_id: string;
  published_at: Timestamp | null;
  reviewed_at: Timestamp | null;
  source_kind: string;
  source_url: string | null;
  status: string;
  submitted_by_user_id: string | null;
  updated_at: Timestamp;
}

export interface VenueMediaTable {
  created_at: Timestamp;
  id: string;
  kind: string;
  location_id: string;
  source: string;
  status: string;
  uploaded_by_user_id: string;
  url: string;
}

export interface VenueFollowTable {
  created_at: Timestamp;
  id: string;
  location_id: string;
  user_id: string;
}

export interface VenueReferralTable {
  created_at: Timestamp;
  id: string;
  location_id: string;
  paid_at: Timestamp | null;
  referrer_user_id: string;
  reward_amount_cents: number;
  reward_payout_id: string | null;
  status: string;
  updated_at: Timestamp;
}

export interface VenueShiftTable {
  created_at: Timestamp;
  end_at: Timestamp;
  id: string;
  location_id: string;
  role: string;
  start_at: Timestamp;
  status: string;
  updated_at: Timestamp;
  user_id: string;
}

export interface VenueShiftSwapTable {
  created_at: Timestamp;
  id: string;
  manager_note: string | null;
  replacement_user_id: string | null;
  requester_user_id: string;
  shift_id: string;
  status: string;
  updated_at: Timestamp;
}

export interface VenueReservationTable {
  assigned_staff_user_id: string | null;
  created_at: Timestamp;
  guest_user_id: string;
  id: string;
  location_id: string;
  notes: string | null;
  party_size: number;
  requested_at: Timestamp;
  status: string;
  table_label: string | null;
  updated_at: Timestamp;
}

export interface VenueDiningSessionTable {
  ended_at: Timestamp | null;
  id: string;
  location_id: string;
  reservation_id: string | null;
  started_at: Timestamp;
  table_label: string | null;
  user_id: string;
}

export interface VenueOrderTable {
  assigned_staff_user_id: string | null;
  created_at: Timestamp;
  currency: string;
  dining_session_id: string | null;
  id: string;
  location_id: string;
  payment_status: string;
  reservation_id: string | null;
  status: string;
  stripe_payment_intent_id: string | null;
  subtotal_cents: number;
  tip_cents: number;
  total_cents: number;
  updated_at: Timestamp;
  user_id: string;
}

export interface VenueOrderItemTable {
  created_at: Timestamp;
  id: string;
  name: string;
  notes: string | null;
  order_id: string;
  quantity: number;
  unit_price_cents: number;
}

export interface VenueTipAllocationTable {
  amount_cents: number;
  beneficiary_kind: string;
  beneficiary_user_id: string | null;
  created_at: Timestamp;
  id: string;
  order_id: string;
  status: string;
}

export interface BlocksDatabase {
  circle: CircleTable;
  circle_member: CircleMemberTable;
  chat_message: ChatMessageTable;
  chat_participant: ChatParticipantTable;
  chat_read_state: ChatReadStateTable;
  chat_room: ChatRoomTable;
  date_match: DateMatchTable;
  date_media: DateMediaTable;
  date_request: DateRequestTable;
  date_request_party_member: DateRequestPartyMemberTable;
  date_request_place: DateRequestPlaceTable;
  date_review: DateReviewTable;
  date_review_media: DateReviewMediaTable;
  friend_invite: FriendInviteTable;
  friendship: FriendshipTable;
  membership_plan: MembershipPlanTable;
  notification: NotificationTable;
  subscription: SubscriptionTable;
  sync_subscription: SyncSubscriptionTable;
  profile: ProfileTable;
  profile_media: ProfileMediaTable;
  recap: RecapTable;
  referral: ReferralTable;
  trusted_contact: TrustedContactTable;
  user: UserTable;
  venue_contribution: VenueContributionTable;
  venue_dining_session: VenueDiningSessionTable;
  venue_follow: VenueFollowTable;
  venue_location: VenueLocationTable;
  venue_media: VenueMediaTable;
  venue_member: VenueMemberTable;
  venue_member_invite: VenueMemberInviteTable;
  venue_menu: VenueMenuTable;
  venue_order: VenueOrderTable;
  venue_order_item: VenueOrderItemTable;
  venue_organization: VenueOrganizationTable;
  venue_referral: VenueReferralTable;
  venue_reservation: VenueReservationTable;
  venue_shift: VenueShiftTable;
  venue_shift_swap: VenueShiftSwapTable;
  venue_tip_allocation: VenueTipAllocationTable;
}

const scope = new Scope("chewbuu");
let databaseParameterName = process.env.BLOCKS_SSM_PARAM_DB_URL;
if (!databaseParameterName && process.env.BLOCKS_STAGE) {
  databaseParameterName = dbConnectionParameterName(
    getStackName({ sandbox: process.env.BLOCKS_STAGE !== "production" })
  );
}
const databaseUrl = AppSetting.fromExisting(scope, "database-url", {
  name: databaseParameterName ?? "local",
  secret: true,
});

export const getDatabaseUrl = async (): Promise<string> => {
  const value =
    normalizeConnectionString(process.env.DATABASE_URL) ??
    normalizeConnectionString(await databaseUrl.get());
  if (!value) {
    throw new Error("Database URL is not configured.");
  }
  return value;
};

const configuredDatabaseUrl = normalizeConnectionString(
  process.env.DATABASE_URL
);

const database = new Database(scope, "postgres", {
  connection: fromExisting({
    connectionString: configuredDatabaseUrl ?? {
      get: getDatabaseUrl,
    },
    ssl:
      (process.env.DATABASE_CA_CERT ?? DATABASE_CA_CERT)
        ? {
            ca: process.env.DATABASE_CA_CERT ?? DATABASE_CA_CERT,
            rejectUnauthorized: true,
          }
        : { rejectUnauthorized: true },
  }),
});

let dbPromise: Promise<Kysely<BlocksDatabase>> | undefined;

export const getDb = async (): Promise<Kysely<BlocksDatabase>> => {
  dbPromise ??= Promise.resolve(createKyselyAdapter<BlocksDatabase>(database));
  return dbPromise;
};
