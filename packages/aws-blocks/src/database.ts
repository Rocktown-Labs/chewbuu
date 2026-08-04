import { AppSetting } from "@aws-blocks/bb-app-setting";
import {
  Database,
  createKyselyAdapter,
  fromExisting,
} from "@aws-blocks/bb-data";
import { Scope } from "@aws-blocks/blocks";
import { getStackName } from "@aws-blocks/blocks/scripts";
import type { ColumnType, Kysely } from "kysely";

import { DATABASE_CA_CERT } from "../generated/database.ca";

const dbConnectionParameterName = (stackName: string) => `/${stackName}-db-url`;

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type JsonColumn<T> = ColumnType<T, T | undefined, T>;

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
  id: string;
  name: string;
  owner_user_id: string;
}

export interface CircleMemberTable {
  circle_id: string;
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
  profile: ProfileTable;
  profile_media: ProfileMediaTable;
  recap: RecapTable;
  referral: ReferralTable;
  trusted_contact: TrustedContactTable;
  user: UserTable;
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

export const getDatabaseUrl = async () =>
  process.env.DATABASE_URL ?? (await databaseUrl.get());

const database = new Database(scope, "postgres", {
  connection: fromExisting({
    connectionString: process.env.DATABASE_URL ?? {
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
