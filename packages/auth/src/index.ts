import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import { createDb } from "@chewbuu/db";
import { env } from "@chewbuu/env/server";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { username } from "better-auth/plugins/username";
import Stripe from "stripe";

import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import {
  ADMIN_MEMBERSHIP_TIER,
  DEFAULT_MEMBERSHIP_TIER,
  MEMBERSHIP_TIERS,
  parseAdminEmails,
} from "./membership";

const RESERVED_USERNAMES = new Set(["chewbuu", "chewbuusync"]);

export const isReservedUsername = (value: string) =>
  RESERVED_USERNAMES.has(value.trim().replace(/^@/, "").toLowerCase());

const promoteConfiguredAdmin = async (
  db: ReturnType<typeof createDb>,
  adminEmails: Set<string>,
  userId: string,
  email: string
) => {
  if (!adminEmails.has(email.trim().toLowerCase())) {
    return;
  }

  await db
    .updateTable("user")
    .set({
      daily_date_limit: ADMIN_MEMBERSHIP_TIER.dailyDateLimit,
      membership_tier: ADMIN_MEMBERSHIP_TIER.id,
      role: "admin",
    })
    .where("id", "=", userId)
    .execute();
};

export const buildStripePlans = async (db?: ReturnType<typeof createDb>) => {
  const executor = db ?? createDb();
  try {
    const plans = await executor
      .selectFrom("membership_plan")
      .selectAll()
      .where("active", "=", true)
      .execute();

    const planByTier = new Map(plans.map((plan) => [plan.tier, plan]));
    const minglePlan = planByTier.get("mingle");
    const sugarPlan = planByTier.get("sugar");

    return [
      {
        annualDiscountPriceId:
          minglePlan?.annual_stripe_price_id ||
          env.STRIPE_MINGLE_ANNUAL_PRICE_ID,
        limits: {
          canCoverDutchDates: MEMBERSHIP_TIERS.mingle.canCoverDutchDates,
          dailyDateLimit: MEMBERSHIP_TIERS.mingle.dailyDateLimit,
          partyLimit: MEMBERSHIP_TIERS.mingle.partyLimit,
        },
        name: MEMBERSHIP_TIERS.mingle.name,
        priceId: minglePlan?.stripe_price_id || env.STRIPE_MINGLE_PRICE_ID,
      },
      {
        annualDiscountPriceId:
          sugarPlan?.annual_stripe_price_id || env.STRIPE_SUGAR_ANNUAL_PRICE_ID,
        limits: {
          canCoverDutchDates: MEMBERSHIP_TIERS.sugar.canCoverDutchDates,
          dailyDateLimit: MEMBERSHIP_TIERS.sugar.dailyDateLimit,
          partyLimit: MEMBERSHIP_TIERS.sugar.partyLimit,
        },
        name: MEMBERSHIP_TIERS.sugar.name,
        priceId: sugarPlan?.stripe_price_id || env.STRIPE_SUGAR_PRICE_ID,
      },
    ];
  } catch {
    return [
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
  }
};

export const createAuth = () => {
  const db = createDb();
  const adminEmails = parseAdminEmails(
    process.env.BETTER_AUTH_ADMIN_EMAILS ??
      process.env.ADMIN_EMAILS ??
      env.BETTER_AUTH_ADMIN_EMAILS
  );
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
      ipAddress: {
        ipAddressHeaders: ["x-forwarded-for"],
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
    account: {
      accountLinking: {
        allowDifferentEmails: true,
        // A verified Google identity can link to an email/password account
        // before the local verification email has been opened.
        requireLocalEmailVerified: false,
        enabled: true,
      },
      fields: {
        accessToken: "access_token",
        accessTokenExpiresAt: "access_token_expires_at",
        accountId: "account_id",
        createdAt: "created_at",
        idToken: "id_token",
        password: "password",
        providerId: "provider_id",
        refreshToken: "refresh_token",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        updatedAt: "updated_at",
        userId: "user_id",
      },
    },
    verification: {
      fields: {
        createdAt: "created_at",
        expiresAt: "expires_at",
        updatedAt: "updated_at",
      },
    },
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            const user = await db
              .selectFrom("user")
              .select("email")
              .where("id", "=", session.userId)
              .executeTakeFirst();
            if (user) {
              await promoteConfiguredAdmin(
                db,
                adminEmails,
                session.userId,
                user.email
              );
            }
          },
        },
      },
      user: {
        create: {
          after: async (user) => {
            await promoteConfiguredAdmin(db, adminEmails, user.id, user.email);
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
      username({
        usernameValidator: (value) => !isReservedUsername(value),
        schema: {
          user: {
            fields: {
              displayUsername: "display_username",
              username: "username",
            },
          },
        },
      }),
      passkey({
        schema: {
          passkey: {
            fields: {
              aaguid: "aaguid",
              backedUp: "backed_up",
              counter: "counter",
              createdAt: "created_at",
              credentialID: "credential_id",
              deviceType: "device_type",
              publicKey: "public_key",
              transports: "transports",
              userId: "user_id",
            },
          },
        },
      }),
      organization({
        allowUserToCreateOrganization: false,
        requireEmailVerificationOnInvitation: true,
      }),
      admin({
        adminRoles: ["admin"],
        defaultRole: "user",
        schema: {
          session: {
            fields: {
              impersonatedBy: "impersonated_by",
            },
          },
          user: {
            fields: {
              banExpires: "ban_expires",
              banReason: "ban_reason",
              banned: "banned",
              role: "role",
            },
          },
        },
      }),
      ...(stripeEnabled
        ? [
            stripe({
              createCustomerOnSignUp: true,
              stripeClient: new Stripe(env.STRIPE_SECRET_KEY as string),
              stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET as string,
              subscription: {
                enabled: true,
                plans: () => buildStripePlans(db),
              },
              schema: {
                subscription: {
                  fields: {
                    billingInterval: "billing_interval",
                    cancelAt: "cancel_at",
                    cancelAtPeriodEnd: "cancel_at_period_end",
                    canceledAt: "canceled_at",
                    endedAt: "ended_at",
                    periodEnd: "period_end",
                    periodStart: "period_start",
                    plan: "plan",
                    referenceId: "reference_id",
                    seats: "seats",
                    status: "status",
                    stripeCustomerId: "stripe_customer_id",
                    stripeScheduleId: "stripe_schedule_id",
                    stripeSubscriptionId: "stripe_subscription_id",
                    trialEnd: "trial_end",
                    trialStart: "trial_start",
                  },
                },
                user: {
                  fields: {
                    stripeCustomerId: "stripe_customer_id",
                  },
                },
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
      fields: {
        lastRequest: "last_request",
      },
      max: 100,
      modelName: "rate_limit",
      storage: "database",
      window: 60,
    },
    secret: env.BETTER_AUTH_SECRET,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
      fields: {
        createdAt: "created_at",
        expiresAt: "expires_at",
        impersonatedBy: "impersonated_by",
        ipAddress: "ip_address",
        token: "token",
        updatedAt: "updated_at",
        userAgent: "user_agent",
        userId: "user_id",
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
      fields: {
        createdAt: "created_at",
        emailVerified: "email_verified",
        updatedAt: "updated_at",
      },
      additionalFields: {
        dailyDateLimit: {
          defaultValue: DEFAULT_MEMBERSHIP_TIER.dailyDateLimit,
          fieldName: "daily_date_limit",
          input: false,
          required: false,
          type: "number",
        },
        hasCompletedOnboarding: {
          defaultValue: false,
          fieldName: "has_completed_onboarding",
          input: false,
          required: false,
          type: "boolean",
        },
        hasIntroVideo: {
          defaultValue: false,
          fieldName: "has_intro_video",
          input: false,
          required: false,
          type: "boolean",
        },
        hasProfilePhoto: {
          defaultValue: false,
          fieldName: "has_profile_photo",
          input: false,
          required: false,
          type: "boolean",
        },
        membershipTier: {
          defaultValue: DEFAULT_MEMBERSHIP_TIER.id,
          fieldName: "membership_tier",
          input: false,
          required: false,
          type: "string",
        },
        stripeCustomerId: {
          fieldName: "stripe_customer_id",
          input: false,
          required: false,
          type: "string",
        },
      },
    },
  });
};

export const auth = createAuth();
