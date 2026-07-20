import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const getVercelOrigin = () => {
  const vercelUrl =
    process.env.VERCEL_ENV === "production"
      ? (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL)
      : (process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!vercelUrl) {
    return;
  }
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
};

const vercelOrigin = getVercelOrigin();

const runtimeEnv = {
  ...process.env,
  // Public auth base: /api/auth bypasses the rewrite's path strip, so the
  // same URL works for incoming matching and generated callbacks
  BETTER_AUTH_URL:
    process.env.BETTER_AUTH_URL ??
    (vercelOrigin ? `${vercelOrigin}/api/auth` : undefined),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? vercelOrigin,
};

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv,
  server: {
    BETTER_AUTH_ADMIN_EMAILS: z.string().default("cg@rocktownlabs.com"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    DATABASE_URL: z.string().min(1),
    GOOGLE_PLACES_API_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.url().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    STRIPE_MINGLE_ANNUAL_PRICE_ID: z.string().optional(),
    STRIPE_MINGLE_PRICE_ID: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_SUGAR_ANNUAL_PRICE_ID: z.string().optional(),
    STRIPE_SUGAR_PRICE_ID: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STREAM_API_KEY: z.string().optional(),
    STREAM_API_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().default("Chewbuu <onboarding@chewbuu.com>"),
    SENT_DM_API_KEY: z.string().optional(),
    SENT_DM_BASE_URL: z.url().default("https://api.sent.dm"),
    SENT_DM_FROM: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
