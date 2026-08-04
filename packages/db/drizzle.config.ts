import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.BLOCKS_DB_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  "";

export default defineConfig({
  dbCredentials: {
    url: dbUrl,
  },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema",
});
