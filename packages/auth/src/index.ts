import { expo } from "@better-auth/expo";
import { stripe } from "@better-auth/stripe";
import { createDb } from "@chewbuu/db";
import * as schema from "@chewbuu/db/schema/auth";
import { env } from "@chewbuu/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
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
    limits: {
      canCoverDutchDates: MEMBERSHIP_TIERS.mingle.canCoverDutchDates,
      dailyDateLimit: MEMBERSHIP_TIERS.mingle.dailyDateLimit,
      partyLimit: MEMBERSHIP_TIERS.mingle.partyLimit,
    },
    name: MEMBERSHIP_TIERS.mingle.name,
    priceId: env.STRIPE_MINGLE_PRICE_ID,
  },
  {
    limits: {
      canCoverDutchDates: MEMBERSHIP_TIERS.sugar.canCoverDutchDates,
      dailyDateLimit: MEMBERSHIP_TIERS.sugar.dailyDateLimit,
      partyLimit: MEMBERSHIP_TIERS.sugar.partyLimit,
    },
    name: MEMBERSHIP_TIERS.sugar.name,
    priceId: env.STRIPE_SUGAR_PRICE_ID,
  },
];

export const createAuth = () => {
  const db = createDb();
  const adminEmails = parseAdminEmails(env.BETTER_AUTH_ADMIN_EMAILS);
  const stripeEnabled = Boolean(
    env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
  );

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
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
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      env.CORS_ORIGIN,
      "chewbuu://",
      "exp://",
      "http://localhost:8081",
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
