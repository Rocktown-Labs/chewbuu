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

export interface BlocksDatabase {
  chat_message: ChatMessageTable;
  chat_participant: ChatParticipantTable;
  chat_read_state: ChatReadStateTable;
  chat_room: ChatRoomTable;
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

const resolveDatabaseUrl = async () =>
  process.env.DATABASE_URL ?? (await databaseUrl.get());

const database = new Database(scope, "postgres", {
  connection: fromExisting({
    connectionString: process.env.DATABASE_URL ?? {
      get: resolveDatabaseUrl,
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
