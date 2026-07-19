import { expo } from "@better-auth/expo";
import { stripe } from "@better-auth/stripe";
import { createDb, ensureSchemaMigrated } from "@chewbuu/db";
import * as schema from "@chewbuu/db/schema/auth";
import { env } from "@chewbuu/env/server";
import { Redis } from "@upstash/redis";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

import {
  ADMIN_MEMBERSHIP_TIER,
  DEFAULT_MEMBERSHIP_TIER,
  MEMBERSHIP_TIERS,
  parseAdminEmails,
} from "./membership";

const buildStripePlans = () => [
  {
    annualDiscountPriceId: env.STRIPE_MINGLE_ANNUAL_PRICE_ID,
    limits: {
      canCoverDutchDates: MEMBERSHIP_TIERS.mingle.canCoverDutchDates,
      dailyDateLimit: MEMBERSHIP_TIERS.mingle.dailyDateLimit,
      partyLimit: MEMBERSHIP_TIERS.mingle.partyLimit,
    },
    name: MEMBERSHIP_TIERS.mingle.name,
    priceId: env.STRIPE_MINGLE_PRICE_ID,
  },
  {
    annualDiscountPriceId: env.STRIPE_SUGAR_ANNUAL_PRICE_ID,
    limits: {
      canCoverDutchDates: MEMBERSHIP_TIERS.sugar.canCoverDutchDates,
      dailyDateLimit: MEMBERSHIP_TIERS.sugar.dailyDateLimit,
      partyLimit: MEMBERSHIP_TIERS.sugar.partyLimit,
    },
    name: MEMBERSHIP_TIERS.sugar.name,
    priceId: env.STRIPE_SUGAR_PRICE_ID,
  },
];

export const getRedisClient = () => {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    token: env.UPSTASH_REDIS_REST_TOKEN,
    url: env.UPSTASH_REDIS_REST_URL,
  });
};

export const createAuth = () => {
  void ensureSchemaMigrated();
  const db = createDb();
  const adminEmails = parseAdminEmails(env.BETTER_AUTH_ADMIN_EMAILS);
  const stripeEnabled = Boolean(
    env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
  );
  const redis = getRedisClient();

  const secondaryStorage = redis
    ? {
        delete: async (key: string) => {
          await redis.del(key);
        },
        get: async (key: string) => {
          const val = await redis.get<string | object>(key);
          if (!val) return null;
          return typeof val === "string" ? val : JSON.stringify(val);
        },
        set: async (key: string, value: string, ttl?: number) => {
          await (ttl
            ? redis.set(key, value, { ex: ttl })
            : redis.set(key, value));
        },
      }
    : undefined;

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
    },
    baseURL: {
      allowedHosts: [
        "localhost:3000",
        "localhost:5173",
        "localhost:4173",
        "localhost",
        "chewbuu.com",
        "*.chewbuu.com",
        "*.vercel.app",
      ],
      fallback: env.BETTER_AUTH_URL,
      protocol: process.env.NODE_ENV === "development" ? "http" : "https",
    },
    database: drizzleAdapter(db, {
      provider: "pg",

      schema,
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (!adminEmails.has(user.email.toLowerCase())) {
              return;
            }

            await db
              .update(schema.user)
              .set({
                dailyDateLimit: ADMIN_MEMBERSHIP_TIER.dailyDateLimit,
                membershipTier: ADMIN_MEMBERSHIP_TIER.id,
                role: "admin",
              })
              .where(eq(schema.user.id, user.id));
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      expo(),
      username(),
      admin({
        adminRoles: ["admin"],
        defaultRole: "user",
      }),
      ...(stripeEnabled
        ? [
            stripe({
              createCustomerOnSignUp: true,
              stripeClient: new Stripe(env.STRIPE_SECRET_KEY as string),
              stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET as string,
              subscription: {
                enabled: true,
                plans: buildStripePlans,
              },
            }),
          ]
        : []),
    ],
    rateLimit: {
      customRules: {
        "/sign-in/email": {
          max: 10,
          window: 60,
        },
        "/sign-up/email": {
          max: 5,
          window: 60,
        },
      },
      enabled: true,
      max: 100,
      storage: secondaryStorage ? "secondary-storage" : "memory",
      window: 60,
    },
    secondaryStorage,
    secret: env.BETTER_AUTH_SECRET,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
      expiresIn: 7 * 24 * 60 * 60,
      storeSessionInDatabase: true,
      updateAge: 24 * 60 * 60,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "demo-google-client-id",
        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET || "demo-google-client-secret",
        enabled: true,
      },
    },
    trustedOrigins: [
      env.CORS_ORIGIN,
      "chewbuu://",
      "exp://",
      "http://localhost:8081",
      "https://*.vercel.app",
    ],
    user: {
      additionalFields: {
        dailyDateLimit: {
          defaultValue: DEFAULT_MEMBERSHIP_TIER.dailyDateLimit,
          input: false,
          required: false,
          type: "number",
        },
        hasCompletedOnboarding: {
          defaultValue: false,
          input: false,
          required: false,
          type: "boolean",
        },
        hasIntroVideo: {
          defaultValue: false,
          input: false,
          required: false,
          type: "boolean",
        },
        hasProfilePhoto: {
          defaultValue: false,
          input: false,
          required: false,
          type: "boolean",
        },
        membershipTier: {
          defaultValue: DEFAULT_MEMBERSHIP_TIER.id,
          input: false,
          required: false,
          type: "string",
        },
        stripeCustomerId: {
          input: false,
          required: false,
          type: "string",
        },
      },
    },
  });
};

export const auth = createAuth();
