import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import { createDb } from "@chewbuu/db";
import { env } from "@chewbuu/env/server";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import Stripe from "stripe";

import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
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
    baseURL: {
      allowedHosts: [
        "localhost:3000",
        "localhost:5173",
        "localhost:4173",
        "localhost",
        "chewbuu.com",
        "*.chewbuu.com",
        "*.vercel.app",
        "*.cloudfront.net",
      ],
      fallback: env.BETTER_AUTH_URL,
      protocol: process.env.NODE_ENV === "development" ? "http" : "https",
    },
    database: {
      casing: "snake",
      db,
      transaction: true,
      type: "postgres",
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (!adminEmails.has(user.email.toLowerCase())) {
              return;
            }

            await db
              .updateTable("user")
              .set({
                daily_date_limit: ADMIN_MEMBERSHIP_TIER.dailyDateLimit,
                membership_tier: ADMIN_MEMBERSHIP_TIER.id,
                role: "admin",
              })
              .where("id", "=", user.id)
              .execute();
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: sendPasswordResetEmail,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail,
    },
    plugins: [
      expo(),
      username(),
      passkey(),
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
      storage: "database",
      window: 60,
    },
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
      "https://*.cloudfront.net",
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
