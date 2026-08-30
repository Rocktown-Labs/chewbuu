import { google } from "@ai-sdk/google";
import { AppSetting } from "@aws-blocks/bb-app-setting";
import { Dashboard } from "@aws-blocks/bb-dashboard";
import { DistributedTable } from "@aws-blocks/bb-distributed-table";
import { EmailClient } from "@aws-blocks/bb-email-client";
import { FileBucket } from "@aws-blocks/bb-file-bucket";
import { KVStore } from "@aws-blocks/bb-kv-store";
import { Logger, type LogLevel } from "@aws-blocks/bb-logger";
import { Metrics, type MetricDatum } from "@aws-blocks/bb-metrics";
import type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";
import { Tracer } from "@aws-blocks/bb-tracer";
import {
  ApiNamespace,
  AsyncJob,
  CronJob,
  Realtime,
  Scope,
} from "@aws-blocks/blocks";
import { RawRoute, type BlocksContext } from "@aws-blocks/core";
import {
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
  GetMeetingCommand,
} from "@aws-sdk/client-chime-sdk-meetings";
import { resolveAuthModule } from "@chewbuu/auth/runtime";
import {
  createStripeClient,
  getStripeMode,
  stripeIdempotencyKey,
} from "@chewbuu/stripe";
import { convertToModelMessages, generateText } from "ai";
import type { Kysely, Transaction } from "kysely";
import type Stripe from "stripe";
import webpush from "web-push";
import { z } from "zod";

import {
  acceptCommunityInvite,
  createCommunity as createCommunityPlatform,
  getCircles as getCommunities,
  inviteCommunityMembers,
  updateCommunity,
} from "./community-platform";
import type { CommunityActor } from "./community-platform";
import { getDatabaseUrl, getDb, jsonb } from "./database";
import type { BlocksDatabase } from "./database";
import { nextDateLifecycleStatus } from "./date-lifecycle";
import {
  createIdentityVerificationSession,
  getIdentityVerificationStatus,
} from "./identity";
import {
  adjustReliabilityScore,
  calculateMatchScore,
  distanceBetweenMiles,
  hasLocation,
} from "./matching";
import {
  createReferrerConnectOnboarding,
  createVenueCheckoutSession,
  createVenueConnectOnboarding,
  createVenueRefund,
  createWorkerConnectOnboarding,
  getStripePayment,
  getVenueConnectStatus,
  getStripeIntegrationHealth,
  ingestStripeWebhookEvent,
  processStripeWebhookEvent,
  syncStripeWebhookEndpoints,
} from "./stripe-marketplace";
import type {
  ApiChatMessage,
  ApiChatParticipant,
  AccountEntitlementsResponse,
  ApiChatRoom,
  IdentityVerificationSession,
  VenueIdentityVerificationSession,
  AiMessage,
  ApiNotification,
  CheckInInput,
  BrandStyle,
  CheckInResponse,
  ChimeMeetingResponse,
  CreateCommunityInput,
  DateMediaResponse,
  DatingMatchResponse,
  DatingProfileResponse,
  DatingRequestResponse,
  DatingSummaryResponse,
  InviteCommunityMembersInput,
  InviteVenueMembersInput,
  PendingReviewResponse,
  PlacePhotoResponse,
  PlaceSuggestion,
  PlaceSuggestionInput,
  PublicSpotDetails,
  PublicSpotMenuResponse,
  PublicSpotSearchInput,
  SpotCaptureOffer,
  SpotCaptureRewardConfig,
  SpotContributionInput,
  SpotContributionResponse,
  MembershipPlan,
  PublishRecapInput,
  RecapResponse,
  ReviewInput,
  ReviewPromptResponse,
  ReviewResponse,
  SendChatMessageInput,
  UploadDateMediaInput,
  MediaUploadInput,
  VenueMediaKind,
  VenueMediaUploadInput,
  NotificationChannelClient,
  NotificationsResponse,
  StripeConnectStatus,
  SyncPricingPlansResponse,
  UpdateCommunityInput,
  UpdateVenueBrandInput,
} from "./types";
import {
  approveUsernameChange,
  getUsernameChangeStatus,
  listUsernameChangeRequests,
  requestUsernameChange,
  verifyUsernameChange,
} from "./username-change";
import {
  createVenueSpecial,
  endVenueDiningSession,
  getVenueAnalytics,
  getVenuePublicSummary,
  getVenueTimeline,
  listPublicVenueLocations,
  listPublicVenueSpecials,
  listVenueSpecials,
  listVenueTables,
  recordVenueOperationalEvent,
  setVenuePublicAnalytics,
  updateVenueSpecial,
  upsertVenueTable,
} from "./venue-analytics";
import {
  listVenueMenuItems,
  upsertVenueMenuItem,
  upsertVenueMenuModifierGroup,
  upsertVenueMenuModifierOption,
} from "./venue-catalog";
import { previewVenueMenu } from "./venue-menu";
import {
  clockInVenueShift,
  createVenueServiceCustomer,
  createVenueServiceOrder,
  getVenueServiceBoard,
  getVenueServiceConfig,
  getVenueStaffStatus,
  listVenueJobListings,
  listVenueServiceCustomers,
  listVenueSyncChannels,
  reportVenueStaffLate,
  updateVenueAttendance,
  updateVenueServiceOrder,
  updateVenueServiceConfig,
  updateVenueStaff,
  upsertVenueJobListing,
  upsertVenueShift,
} from "./venue-operations";
import {
  acceptVenueInvite,
  approveVenueClaim,
  captureVenueMenu,
  createVenueLocation,
  createVenueOrder,
  createVenueReferral,
  followVenue,
  getVenueLocations,
  getVenueWorkspace,
  requestVenueClaim,
  requestVenueReservation,
  requestVenueShiftSwap,
  startVenueDiningSession,
  updateVenueBrand,
  updateVenueOrder,
  updateVenueReservation,
  inviteVenueMembers,
} from "./venue-platform";
import {
  createVenueIdentityVerificationSession,
  getVenueIdentityVerificationStatus,
} from "./venue-vendor";

type BlocksDbExecutor = Kysely<BlocksDatabase> | Transaction<BlocksDatabase>;

const scope = new Scope("chewbuu-api");
const venueEmailClient = new EmailClient(scope, "venue-email-client", {
  fromAddress: process.env.VENUE_EMAIL_FROM ?? "noreply@chewbuu.com",
});
const venueAppUrl = (
  process.env.VENUE_APP_URL ?? "https://chewbuu.com"
).replace(/\/$/, "");
const LOG_LEVELS = new Set<LogLevel>(["debug", "error", "info", "warn"]);
const deploymentStage =
  process.env.CHEWBUU_STAGE ??
  (process.env.PR_NUMBER
    ? `preview-pr-${process.env.PR_NUMBER}`
    : "production");
const logLevel = LOG_LEVELS.has(process.env.LOG_LEVEL as LogLevel)
  ? (process.env.LOG_LEVEL as LogLevel)
  : "info";
const logger = new Logger(scope, "logger", {
  defaultContext: {
    service: "chewbuu-api",
    stage: deploymentStage,
  },
  level: logLevel,
});
const metrics = new Metrics(scope, "metrics", {
  defaultDimensions: {
    service: "chewbuu-api",
    stage: deploymentStage,
  },
  namespace: "Chewbuu/Application",
});
const tracer = new Tracer(scope, "tracer");
const dashboard = new Dashboard(scope, "dashboard", {
  dashboardName: `chewbuu-${deploymentStage}-api`,
  defaultTimeRange: "-PT8H",
  logger,
  metricConfigs: [
    { name: "ApiRequestCount", period: 60, stat: "Sum", title: "API requests" },
    { name: "ApiErrorCount", period: 60, stat: "Sum", title: "API errors" },
    { name: "ApiLatency", period: 60, stat: "p95", title: "API latency p95" },
    { name: "ScheduledJobCount", period: 60, stat: "Sum" },
    { name: "ScheduledJobErrorCount", period: 60, stat: "Sum" },
  ],
  metrics,
  routePath: "/admin/observability/aws-blocks",
  title: `Chewbuu API - ${deploymentStage}`,
  tracer,
});
void dashboard;

const webSsrDashboardRedirect = new RawRoute(
  scope,
  "web-ssr-dashboard-redirect",
  {
    method: "GET",
    path: "/admin/observability/aws-blocks-web",
    handler: async (ctx) => {
      const url = process.env.WEB_SSR_DASHBOARD_URL;
      if (!url) {
        ctx.response.status = 503;
        ctx.response.headers.set("Content-Type", "application/json");
        ctx.response.send({
          message: "The web SSR dashboard is only available after deployment.",
        });
        return;
      }

      ctx.response.status = 302;
      ctx.response.headers.set("Location", url);
      ctx.response.send("");
    },
  }
);
void webSsrDashboardRedirect;

const errorFields = (error: unknown) =>
  error instanceof Error
    ? { errorMessage: error.message, errorName: error.name }
    : { errorMessage: "Unknown error", errorName: "UnknownError" };

const emitOperationMetrics = (
  operation: string,
  status: "error" | "success",
  durationMs: number
) => {
  const metricBatch: MetricDatum[] = [
    {
      dimensions: { operation, status },
      name: "ApiRequestCount",
      unit: "Count",
      value: 1,
    },
    {
      dimensions: { operation, status },
      name: "ApiLatency",
      unit: "Milliseconds",
      value: durationMs,
    },
  ];

  if (status === "error") {
    metricBatch.push({
      dimensions: { operation, status },
      name: "ApiErrorCount",
      unit: "Count",
      value: 1,
    });
  }

  metrics.emitBatch(metricBatch);
};

const observeOperation = async <Result>(
  operation: string,
  handler: () => Promise<Result>
): Promise<Result> => {
  const startedAt = performance.now();
  tracer.addAnnotation("operation", operation);

  return tracer.startSegment(operation, async (segment) => {
    segment.addAnnotation("operation", operation);

    try {
      const result = await handler();
      const durationMs = Math.round(performance.now() - startedAt);
      segment.setHttpStatus(200);
      emitOperationMetrics(operation, "success", durationMs);
      logger.info("api operation completed", {
        durationMs,
        operation,
        status: "success",
        traceId: tracer.getTraceId(),
      });
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const fields = errorFields(error);
      segment.addError(
        error instanceof Error ? error : new Error(fields.errorName)
      );
      segment.setHttpStatus(500);
      emitOperationMetrics(operation, "error", durationMs);
      logger.error("api operation failed", {
        ...fields,
        durationMs,
        operation,
        status: "error",
        traceId: tracer.getTraceId(),
      });
      throw error;
    }
  });
};

const observeScheduledJob = async <Result>(
  operation: string,
  handler: () => Promise<Result>
): Promise<Result> => {
  const startedAt = performance.now();

  try {
    const result = await observeOperation(operation, handler);
    metrics.emit("ScheduledJobCount", 1, {
      dimensions: { operation, status: "success" },
      unit: "Count",
    });
    return result;
  } catch (error) {
    metrics.emit("ScheduledJobErrorCount", 1, {
      dimensions: { operation, status: "error" },
      unit: "Count",
    });
    logger.error("scheduled job failed", {
      ...errorFields(error),
      durationMs: Math.round(performance.now() - startedAt),
      operation,
      traceId: tracer.getTraceId(),
    });
    throw error;
  }
};

const chime = new ChimeSDKMeetingsClient({
  region: process.env.CHIME_REGION ?? "us-east-1",
});
const betterAuthSecret = AppSetting.fromExisting(scope, "better-auth-secret", {
  name: process.env.BLOCKS_AUTH_SECRET_PARAMETER ?? "/chewbuu-prod-auth-secret",
  secret: true,
});
const stripeConnectSecretKey = AppSetting.fromExisting(
  scope,
  "stripe-connect-secret-key",
  {
    name:
      process.env.BLOCKS_STRIPE_CONNECT_SECRET_PARAMETER ??
      "/chewbuu-prod-stripe-connect-secret-key",
    secret: true,
  }
);
const spotCaptureRewardSetting = new AppSetting(
  scope,
  "spot-capture-reward-cents",
  {
    name:
      process.env.SPOT_CAPTURE_REWARD_PARAMETER ??
      "/chewbuu-prod-spot-capture-reward-cents",
    schema: z.number().int().min(0).max(100_000),
    value: 500,
  }
);
const stripeConnectWebhookSecret = AppSetting.fromExisting(
  scope,
  "stripe-connect-webhook-secret",
  {
    name:
      process.env.BLOCKS_STRIPE_CONNECT_WEBHOOK_PARAMETER ??
      "/chewbuu-prod-stripe-connect-webhook-secret",
    secret: true,
  }
);

const readStripeSetting = async (setting: AppSetting<string>) => {
  try {
    return (await setting.get()) || null;
  } catch {
    return null;
  }
};

const getStripeWebhookSecret = async (
  kind: "billing" | "commerce" | "connect"
) => {
  if (kind === "billing") {
    return (
      process.env.STRIPE_BILLING_WEBHOOK_SECRET ??
      process.env.STRIPE_WEBHOOK_SECRET ??
      null
    );
  }
  if (kind === "commerce") {
    return process.env.STRIPE_COMMERCE_WEBHOOK_SECRET ?? null;
  }
  return (
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET ??
    (await readStripeSetting(stripeConnectWebhookSecret))
  );
};

const markStripeEvent = async (
  eventId: string,
  status: "failed" | "processed",
  errorMessage?: string
) => {
  const db = await getDb();
  await db
    .updateTable("stripe_event")
    .set({
      ...(status === "processed" ? { processed_at: new Date() } : {}),
      ...(errorMessage ? { error_message: errorMessage } : {}),
      status,
      updated_at: new Date(),
    })
    .where("id", "=", eventId)
    .execute();
};

const stripeWebhookProcessingJob = new AsyncJob(
  scope,
  "stripe-webhook-processing",
  {
    handler: async (payload: { eventId: string }) => {
      await processStripeWebhookEvent(payload.eventId);
    },
    schema: z.object({ eventId: z.string().min(1) }),
  }
);

const handleStripeWebhook = async (
  ctx: BlocksContext,
  kind: "billing" | "commerce" | "connect"
) => {
  const secret = await getStripeWebhookSecret(kind);
  const signature = ctx.request.headers.get("stripe-signature");
  if (!secret || !signature) {
    ctx.response.status = 400;
    ctx.response.send({ message: "Stripe webhook is not configured." });
    return;
  }
  const body = await ctx.request.text();
  let result: Awaited<ReturnType<typeof ingestStripeWebhookEvent>>;
  try {
    result = await ingestStripeWebhookEvent({
      body,
      kind,
      secret,
      signature,
    });
  } catch (error) {
    logger.warn("stripe webhook signature rejected", {
      error: error instanceof Error ? error.message : "unknown error",
      kind,
    });
    ctx.response.status = 400;
    ctx.response.send({ message: "Invalid Stripe webhook signature." });
    return;
  }
  if (result.duplicate && result.status === "processed") {
    ctx.response.status = 200;
    ctx.response.send({ received: true });
    return;
  }
  if (
    result.duplicate &&
    result.eventId &&
    (kind !== "billing" || result.status === "received")
  ) {
    try {
      await stripeWebhookProcessingJob.submit({ eventId: result.eventId });
      ctx.response.status = 200;
      ctx.response.send({ received: true });
    } catch (error) {
      await markStripeEvent(
        result.eventId,
        "failed",
        error instanceof Error ? error.message : "Stripe job submission failed."
      );
      ctx.response.status = 500;
      ctx.response.send({
        message: "Stripe webhook processing could not be queued.",
      });
    }
    return;
  }
  if (!result.eventId) {
    ctx.response.status = 500;
    ctx.response.send({ message: "Stripe event could not be recorded." });
    return;
  }
  if (kind === "billing") {
    try {
      const auth = await getBetterAuth();
      const authRequest = new Request(
        new URL("/api/auth/stripe/webhook", ctx.request.url),
        {
          body,
          headers: {
            "content-type": "application/json",
            "stripe-signature": signature,
          },
          method: "POST",
        }
      );
      const response = await auth.handler(authRequest);
      if (!response.ok) {
        throw new Error(`Better Auth webhook returned ${response.status}.`);
      }
      await stripeWebhookProcessingJob.submit({ eventId: result.eventId });
    } catch (error) {
      await markStripeEvent(
        result.eventId,
        "failed",
        error instanceof Error ? error.message : "Billing webhook failed."
      );
      ctx.response.status = 500;
      ctx.response.send({ message: "Billing webhook processing failed." });
      return;
    }
  } else {
    try {
      await stripeWebhookProcessingJob.submit({ eventId: result.eventId });
    } catch (error) {
      await markStripeEvent(
        result.eventId,
        "failed",
        error instanceof Error ? error.message : "Stripe job submission failed."
      );
      ctx.response.status = 500;
      ctx.response.send({
        message: "Stripe webhook processing could not be queued.",
      });
      return;
    }
  }
  ctx.response.status = 200;
  ctx.response.send({ received: true });
};

const stripeBillingWebhook = new RawRoute(scope, "stripe-billing-webhook", {
  method: "POST",
  path: "/webhooks/stripe/billing",
  handler: async (ctx) => handleStripeWebhook(ctx, "billing"),
});
void stripeBillingWebhook;

const stripeCommerceWebhook = new RawRoute(scope, "stripe-commerce-webhook", {
  method: "POST",
  path: "/webhooks/stripe/commerce",
  handler: async (ctx) => handleStripeWebhook(ctx, "commerce"),
});
void stripeCommerceWebhook;

const stripeConnectWebhook = new RawRoute(scope, "stripe-connect-webhook", {
  method: "POST",
  path: "/webhooks/stripe/connect",
  handler: async (ctx) => handleStripeWebhook(ctx, "connect"),
});
void stripeConnectWebhook;

const mediaBucket = new FileBucket(scope, "media", {
  corsRules: [
    {
      allowedHeaders: ["content-type"],
      allowedMethods: ["GET", "HEAD", "PUT"],
      allowedOrigins: [
        "https://chewbuu.com",
        "http://localhost:3000",
        "http://localhost:5173",
      ],
    },
  ],
});

const mediaLimits = {
  intro_video: { accept: "video/", maxBytes: 250 * 1024 * 1024 },
  photo: { accept: "image/", maxBytes: 12 * 1024 * 1024 },
  profile_photo: { accept: "image/", maxBytes: 12 * 1024 * 1024 },
} as const;

const cleanMediaFileName = (name: string) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80) || "upload";

const mediaPath = (userId: string, input: MediaUploadInput) =>
  `profiles/${userId}/${input.slot}/${crypto.randomUUID()}-${cleanMediaFileName(input.fileName)}`;

const mediaPathIsValid = (path: string) =>
  path.startsWith("profiles/") && !path.includes("..") && !path.includes("\\");

const venueMediaPath = (locationId: string, input: VenueMediaUploadInput) =>
  `venues/${locationId}/${input.kind}/${crypto.randomUUID()}-${cleanMediaFileName(input.fileName)}`;

const venueMediaPathIsValid = (path: string, locationId: string) =>
  path.startsWith(`venues/${locationId}/`) &&
  !path.includes("..") &&
  !path.includes("\\");

const mediaPathFromStoredValue = (stored: string | null) => {
  if (!stored) return null;
  if (!stored.startsWith("http")) return stored;
  try {
    return decodeURIComponent(new URL(stored).pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
};

const mintStoredMediaUrl = async (stored: string | null) => {
  const pathname = mediaPathFromStoredValue(stored);
  if (!pathname || !mediaPathIsValid(pathname)) return;
  return mediaBucket.getUrl(pathname, { expiresIn: 3600 });
};

const chatMessageSchema = z.object({
  createdAt: z.string(),
  durationSec: z.number().optional(),
  id: z.string(),
  kind: z.enum(["photo", "system", "text", "video", "voice"]),
  mediaThumbUrl: z.string().optional(),
  mediaUrl: z.string().optional(),
  roomId: z.string(),
  senderId: z.string(),
  systemIcon: z
    .enum(["user", "check", "calendar", "branch", "heart", "block"])
    .optional(),
  text: z.string().optional(),
});

const venueEventSchema = z.object({
  detail: z.string(),
  id: z.string(),
  kind: z.enum(["order_created", "reservation_requested", "venue_created"]),
  locationId: z.string(),
  occurredAt: z.string(),
  status: z.string(),
  title: z.string(),
});

const realtime = new Realtime(scope, "chat", {
  namespaces: {
    messages: Realtime.namespace(chatMessageSchema),
    typing: Realtime.namespace(
      z.object({
        isTyping: z.boolean(),
        roomId: z.string(),
        userId: z.string(),
      })
    ),
    notifications: Realtime.namespace(
      z.object({
        body: z.string(),
        createdAt: z.string(),
        entityId: z.string().optional(),
        entityType: z.string().optional(),
        id: z.string(),
        kind: z.string(),
        readAt: z.string().nullable(),
        title: z.string(),
      })
    ),
    venueEvents: Realtime.namespace(venueEventSchema),
  },
});

const roomProjectionSchema = z.object({
  kind: z.string(),
  phase: z.string(),
  roomId: z.string(),
  roomKey: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  userId: z.string(),
});

const roomProjection = new DistributedTable(scope, "room-list", {
  indexes: {
    byUpdatedAt: { partitionKey: "userId", sortKey: "updatedAt" },
  },
  key: { partitionKey: "userId", sortKey: "roomKey" },
  schema: roomProjectionSchema,
});

const pushSubscriptionSchema = z.object({
  auth: z.string(),
  createdAt: z.number(),
  endpoint: z.string(),
  p256dh: z.string(),
  updatedAt: z.number(),
  userId: z.string(),
});

export const pushSubscriptionTable = new DistributedTable(
  scope,
  "push-subscriptions",
  {
    indexes: {
      byUserId: { partitionKey: "userId", sortKey: "updatedAt" },
    },
    key: { partitionKey: "userId", sortKey: "endpoint" },
    schema: pushSubscriptionSchema,
  }
);

const roomListCache = new KVStore(scope, "room-list-cache", {
  schema: z.object({ expiresAt: z.number(), roomIds: z.array(z.string()) }),
});

const placeSuggestionSchema = z.object({
  address: z.string().optional(),
  attributions: z.array(z.string()).optional(),
  dataSource: z.enum(["google", "sync"]).optional(),
  googleMapsUri: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  name: z.string(),
  openNow: z.boolean().optional(),
  photoAttributions: z.array(z.string()).optional(),
  photoName: z.string().optional(),
  photoUrl: z.string().optional(),
  phone: z.string().optional(),
  placeId: z.string(),
  priceLevel: z.string().optional(),
  rating: z.string().optional(),
  syncLocationId: z.string().optional(),
  types: z.array(z.string()),
  userRatingCount: z.number().optional(),
  websiteUri: z.string().optional(),
});

const placeSearchCache = new KVStore(scope, "place-search-cache", {
  schema: z.object({
    expiresAt: z.number(),
    places: z.array(placeSuggestionSchema),
  }),
});

const placeSearchRateLimit = new KVStore(scope, "place-search-rate-limit", {
  schema: z.object({
    count: z.number().int().nonnegative(),
    windowStartedAt: z.number(),
  }),
});

const notificationPresence = new KVStore(scope, "notification-presence", {
  schema: z.object({
    latestId: z.string().nullable(),
    unreadCount: z.number().int().min(0),
    updatedAt: z.number(),
  }),
});

const configuredAdminEmails = () =>
  new Set(
    (
      process.env.BETTER_AUTH_ADMIN_EMAILS ??
      process.env.ADMIN_EMAILS ??
      "camstewart7@gmail.com"
    )
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

const isConfiguredAdminEmail = (email: string) =>
  configuredAdminEmails().has(email.toLowerCase());

interface SessionUser {
  dailyDateLimit?: number;
  email: string;
  hasCompletedOnboarding?: boolean;
  hasIntroVideo?: boolean;
  hasProfilePhoto?: boolean;
  id: string;
  membershipTier?: string;
  name: string;
  username?: string | null;
}

let authEnvironmentPromise: Promise<void> | undefined;
let betterAuthPromise:
  | Promise<ReturnType<typeof resolveAuthModule>>
  | undefined;

const initializeAuthEnvironment = async () => {
  authEnvironmentPromise ??= (async () => {
    process.env.DATABASE_URL ??= await getDatabaseUrl();
    process.env.BETTER_AUTH_SECRET ??= await betterAuthSecret.get();
    process.env.BETTER_AUTH_URL ??= "https://chewbuu.com/api/auth";
    process.env.CORS_ORIGIN ??= "https://chewbuu.com";
  })();
  await authEnvironmentPromise;
};

const getBetterAuth = async (): Promise<
  ReturnType<typeof resolveAuthModule>
> => {
  await initializeAuthEnvironment();
  betterAuthPromise ??= (async () =>
    resolveAuthModule(await import("@chewbuu/auth")))();
  return betterAuthPromise;
};

const provisionAdminTestEntitlements = async (user: {
  email: string;
  id: string;
}) => {
  if (!isConfiguredAdminEmail(user.email)) return;
  const db = await getDb();
  const now = new Date();
  await db.transaction().execute(async (tx) => {
    await tx
      .updateTable("user")
      .set({
        daily_date_limit: 24,
        membership_tier: "sugar",
        role: "admin",
      })
      .where("id", "=", user.id)
      .execute();

    const sugarSubscription = await tx
      .selectFrom("subscription")
      .select("id")
      .where("reference_id", "=", user.id)
      .where("plan", "in", ["sugar", "Sugar"])
      .where("status", "in", ["active", "trialing"])
      .executeTakeFirst();
    if (!sugarSubscription) {
      await tx
        .insertInto("subscription")
        .values({
          billing_interval: "month",
          cancel_at: null,
          cancel_at_period_end: false,
          canceled_at: null,
          created_at: now,
          ended_at: null,
          id: crypto.randomUUID(),
          period_end: null,
          period_start: now,
          plan: "sugar",
          reference_id: user.id,
          seats: null,
          status: "active",
          stripe_customer_id: null,
          stripe_schedule_id: null,
          stripe_subscription_id: null,
          trial_end: null,
          trial_start: null,
          updated_at: now,
        })
        .execute();
    }

    const syncSubscription = await tx
      .selectFrom("sync_subscription")
      .select("id")
      .where("user_id", "=", user.id)
      .where("organization_id", "is", null)
      .where("plan", "=", "sync")
      .where("status", "in", ["active", "trialing"])
      .executeTakeFirst();
    if (!syncSubscription) {
      await tx
        .insertInto("sync_subscription")
        .values({
          created_at: now,
          ended_at: null,
          id: crypto.randomUUID(),
          organization_id: null,
          plan: "sync",
          status: "active",
          stripe_subscription_id: null,
          updated_at: now,
          user_id: user.id,
        })
        .execute();
    }
  });
};

const adminEntitlementLocks = new Map<string, Promise<void>>();

const ensureAdminTestEntitlements = async (user: {
  email: string;
  id: string;
}) => {
  if (!isConfiguredAdminEmail(user.email)) return;
  const existing = adminEntitlementLocks.get(user.id);
  if (existing) {
    await existing;
    return;
  }
  const pending = provisionAdminTestEntitlements(user);
  adminEntitlementLocks.set(user.id, pending);
  try {
    await pending;
  } finally {
    adminEntitlementLocks.delete(user.id);
  }
};

const requireSession = async (headers: Headers): Promise<SessionUser> => {
  const auth = await getBetterAuth();
  const session = await auth.api.getSession({ headers });
  if (!session?.user) throw new Error("Authentication required");
  await ensureAdminTestEntitlements(session.user);
  const isAdmin = isConfiguredAdminEmail(session.user.email);
  return {
    dailyDateLimit: isAdmin ? 24 : (session.user.dailyDateLimit ?? undefined),
    email: session.user.email,
    hasCompletedOnboarding: session.user.hasCompletedOnboarding ?? false,
    hasIntroVideo: session.user.hasIntroVideo ?? false,
    hasProfilePhoto: session.user.hasProfilePhoto ?? false,
    id: session.user.id,
    membershipTier: isAdmin
      ? "sugar"
      : (session.user.membershipTier ?? "social"),
    name: session.user.name,
    username: session.user.username ?? null,
  };
};

const toIso = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : null;

const toNotification = (notification: {
  body: string;
  created_at: Date | string;
  entity_id: string | null;
  entity_type: string | null;
  id: string;
  kind: string;
  read_at: Date | string | null;
  title: string;
}): ApiNotification => ({
  body: notification.body,
  createdAt: new Date(notification.created_at).toISOString(),
  ...(notification.entity_id ? { entityId: notification.entity_id } : {}),
  ...(notification.entity_type ? { entityType: notification.entity_type } : {}),
  id: notification.id,
  kind: notification.kind,
  readAt: toIso(notification.read_at),
  title: notification.title,
});

const refreshNotificationPresence = async (userId: string) => {
  const db = await getDb();
  const [latest, unread] = await Promise.all([
    db
      .selectFrom("notification")
      .select("id")
      .where("user_id", "=", userId)
      .orderBy("created_at", "desc")
      .limit(1)
      .executeTakeFirst(),
    db
      .selectFrom("notification")
      .select((expression) => expression.fn.countAll<number>().as("count"))
      .where("user_id", "=", userId)
      .where("read_at", "is", null)
      .executeTakeFirst(),
  ]);
  const unreadCount = Number(unread?.count ?? 0);
  await notificationPresence.put(userId, {
    latestId: latest?.id ?? null,
    unreadCount,
    updatedAt: Date.now(),
  });
  return unreadCount;
};

const createNotification = async (input: {
  body: string;
  dedupeKey: string;
  entityId?: string;
  entityType?: string;
  kind: string;
  title: string;
  userId: string;
}) => {
  const db = await getDb();
  const [created] = await db
    .insertInto("notification")
    .values({
      body: input.body,
      created_at: new Date(),
      dedupe_key: input.dedupeKey,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType ?? null,
      id: crypto.randomUUID(),
      kind: input.kind,
      read_at: null,
      title: input.title,
      user_id: input.userId,
    })
    .onConflict((conflict) =>
      conflict.columns(["user_id", "dedupe_key"]).doNothing()
    )
    .returningAll()
    .execute();
  if (!created) return null;

  const notification = toNotification(created);
  const unreadCount = await refreshNotificationPresence(input.userId);
  try {
    await realtime.publish("notifications", input.userId, notification);
  } catch {
    // PostgreSQL remains the durable source of truth when realtime is offline.
  }
  try {
    await sendPushNotification({
      body: input.body,
      data: {
        entityId: input.entityId,
        entityType: input.entityType,
        kind: input.kind,
      },
      title: input.title,
      url: "/me?tab=notifications",
      userId: input.userId,
    });
  } catch {
    // Web push is best-effort dispatch
  }
  return { notification, unreadCount };
};

const savePushSubscription = async (
  sessionUser: SessionUser,
  input: { auth: string; endpoint: string; p256dh: string }
) => {
  const now = Date.now();
  await pushSubscriptionTable.put({
    auth: input.auth,
    createdAt: now,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    updatedAt: now,
    userId: sessionUser.id,
  });
  return { ok: true as const };
};

const getVapidPublicKey = async () => {
  return {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  };
};

const sendPushNotification = async (input: {
  badge?: string;
  body: string;
  data?: Record<string, unknown>;
  icon?: string;
  tag?: string;
  title: string;
  url?: string;
  userId?: string;
}) => {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@chewbuu.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.info("VAPID keys not configured, skipping web push dispatch", {
      userId: input.userId,
    });
    return { deliveredCount: 0, failedCount: 0, skipped: true };
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  if (!input.userId) {
    return { deliveredCount: 0, failedCount: 0, skipped: true };
  }

  const subscriptions = await Array.fromAsync(
    pushSubscriptionTable.query({
      index: "byUserId",
      where: { userId: { equals: input.userId } },
    })
  );

  if (!subscriptions.length) {
    return { deliveredCount: 0, failedCount: 0, skipped: true };
  }

  const payload = JSON.stringify({
    badge: input.badge || "/brand/chewbuu-logo-500-trans.png",
    body: input.body,
    data: {
      url: input.url || "/me",
      ...input.data,
    },
    icon: input.icon || "/brand/chewbuu-logo-500.png",
    tag: input.tag || "chewbuu-notification",
    title: input.title,
    url: input.url || "/me",
  });

  let deliveredCount = 0;
  let failedCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          },
          payload
        );
        deliveredCount += 1;
      } catch (error: any) {
        failedCount += 1;
        logger.warn("Failed to send web push notification", {
          endpoint: sub.endpoint,
          error: error instanceof Error ? error.message : String(error),
          statusCode: error?.statusCode,
          userId: input.userId,
        });

        if (error?.statusCode === 404 || error?.statusCode === 410) {
          try {
            await pushSubscriptionTable.delete({
              endpoint: sub.endpoint,
              userId: sub.userId,
            });
          } catch {
            // ignore deletion errors
          }
        }
      }
    })
  );

  return { deliveredCount, failedCount };
};

const getNotifications = async (
  userId: string
): Promise<NotificationsResponse> => {
  const db = await getDb();
  const rows = await db
    .selectFrom("notification")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("created_at", "desc")
    .limit(50)
    .execute();
  const unreadCount = await refreshNotificationPresence(userId);
  return { notifications: rows.map(toNotification), unreadCount };
};

const markNotificationsRead = async (
  userId: string,
  notificationIds: string[]
) => {
  if (notificationIds.length) {
    const db = await getDb();
    await db
      .updateTable("notification")
      .set({ read_at: new Date() })
      .where("user_id", "=", userId)
      .where("id", "in", notificationIds)
      .where("read_at", "is", null)
      .execute();
  }
  return { unreadCount: await refreshNotificationPresence(userId) };
};

const ensureAcceptedFriendship = async (
  db: BlocksDbExecutor,
  userId: string,
  friendUserId: string,
  now: Date
) => {
  const existing = await db
    .selectFrom("friendship")
    .select("id")
    .where((expression) =>
      expression.or([
        expression("user_id", "=", userId).and(
          expression("friend_user_id", "=", friendUserId)
        ),
        expression("user_id", "=", friendUserId).and(
          expression("friend_user_id", "=", userId)
        ),
      ])
    )
    .executeTakeFirst();
  if (existing) {
    await db
      .updateTable("friendship")
      .set({ accepted_at: now, status: "accepted" })
      .where("id", "=", existing.id)
      .execute();
    return;
  }
  await db
    .insertInto("friendship")
    .values({
      accepted_at: now,
      created_at: now,
      friend_user_id: friendUserId,
      id: crypto.randomUUID(),
      status: "accepted",
      user_id: userId,
    })
    .onConflict((conflict) =>
      conflict.columns(["user_id", "friend_user_id"]).doUpdateSet({
        accepted_at: now,
        status: "accepted",
      })
    )
    .execute();
};

const runDateLifecycleInternal = async (at?: string) => {
  const now = at ? new Date(at) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Lifecycle time is invalid");
  const db = await getDb();
  const requests = await db
    .selectFrom("date_request")
    .selectAll()
    .where("status", "in", ["checked_in", "review_due"])
    .where("scheduled_at", "<=", now)
    .execute();
  let processed = 0;
  for (const request of requests) {
    const pendingReviews = await db
      .selectFrom("date_review")
      .select("id")
      .where("date_request_id", "=", request.id)
      .where("required", "=", true)
      .where("completed_at", "is", null)
      .execute();
    const nextStatus = nextDateLifecycleStatus({
      hasPendingReviews: pendingReviews.length > 0,
      now,
      scheduledAt: new Date(request.scheduled_at),
      status: request.status as "checked_in" | "review_due",
    });
    if (nextStatus === request.status) continue;
    await db.transaction().execute(async (tx) => {
      await tx
        .updateTable("date_request")
        .set({
          actual_end_at:
            nextStatus === "review_due" ? now : request.actual_end_at,
          status: nextStatus,
          updated_at: now,
        })
        .where("id", "=", request.id)
        .where("status", "=", request.status)
        .execute();
      if (nextStatus === "review_due") {
        await tx
          .insertInto("date_review")
          .values({
            completed_at: null,
            date_request_id: request.id,
            id: crypto.randomUUID(),
            person_comment: null,
            person_criteria: jsonb({}),
            person_rating: null,
            place_comment: null,
            place_criteria: jsonb({}),
            place_rating: null,
            required: true,
            user_id: request.user_id,
          })
          .onConflict((conflict) =>
            conflict.columns(["date_request_id", "user_id"]).doNothing()
          )
          .execute();
      } else if (nextStatus === "completed") {
        const acceptedMatch = await tx
          .selectFrom("date_match")
          .select("user_id")
          .where("request_id", "=", request.id)
          .where("status", "=", "accepted")
          .executeTakeFirst();
        if (acceptedMatch) {
          await ensureAcceptedFriendship(
            tx,
            request.user_id,
            acceptedMatch.user_id,
            now
          );
        }
      }
    });
    processed += 1;
    if (nextStatus === "review_due") {
      await createNotification({
        body: "Complete your date review before booking another date.",
        dedupeKey: `date-request:${request.id}:review`,
        entityId: request.id,
        entityType: "date_request",
        kind: "review_due",
        title: "Your date review is ready",
        userId: request.user_id,
      });
    }
  }
  return { processed };
};

export const runDateLifecycle = async (at?: string) =>
  observeScheduledJob("runDateLifecycle", () => runDateLifecycleInternal(at));

export const dateLifecycleCron = new CronJob(scope, "date-lifecycle-cron", {
  description:
    "Recurring dating lifecycle state transitions and review settlement",
  handler: async () => {
    await runDateLifecycle();
  },
  schedule: "rate(1 minute)",
});

export const notificationDeliveryJob = new AsyncJob(
  scope,
  "notification-delivery",
  {
    handler: async (payload: {
      body: string;
      dedupeKey: string;
      entityId?: string;
      entityType?: string;
      kind: string;
      title: string;
      userId: string;
    }) => {
      await createNotification(payload);
    },
    schema: z.object({
      body: z.string(),
      dedupeKey: z.string(),
      entityId: z.string().optional(),
      entityType: z.string().optional(),
      kind: z.string(),
      title: z.string(),
      userId: z.string(),
    }),
  }
);

export const venueEmailJob = new AsyncJob(scope, "venue-email", {
  handler: async (payload: {
    body: string;
    html?: string;
    subject: string;
    to: string;
  }) => {
    await venueEmailClient.send(payload);
  },
  schema: z.object({
    body: z.string().min(1),
    html: z.string().optional(),
    subject: z.string().min(1),
    to: z.email(),
  }),
});

export const mediaProcessingJob = new AsyncJob(scope, "media-processing", {
  handler: async (
    payload: {
      mediaId: string;
      slot?: string;
      userId: string;
    },
    ctx
  ) => {
    logger.info("processing media background job", {
      jobId: ctx.jobId,
      mediaId: payload.mediaId,
      userId: payload.userId,
    });
  },
  schema: z.object({
    mediaId: z.string(),
    slot: z.string().optional(),
    userId: z.string(),
  }),
});

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const isConfiguredAdmin = (sessionUser: SessionUser) =>
  isConfiguredAdminEmail(sessionUser.email);

const publishVenueEvent = async (event: {
  detail: string;
  id: string;
  kind: "order_created" | "reservation_requested" | "venue_created";
  locationId: string;
  status: string;
  title: string;
}) => {
  const venueEvent = {
    ...event,
    occurredAt: new Date().toISOString(),
  } satisfies z.infer<typeof venueEventSchema>;
  await realtime.publish("venueEvents", event.locationId, venueEvent);

  const db = await getDb();
  const members = await db
    .selectFrom("member")
    .innerJoin(
      "venue_location",
      "venue_location.organization_id",
      "member.organization_id"
    )
    .innerJoin("user", "user.id", "member.user_id")
    .select(["user.id", "user.email"])
    .where("venue_location.id", "=", event.locationId)
    .execute();

  const recipients = new Map(
    members.map((member) => [member.id, member.email])
  );
  const adminEmails = (process.env.ADMIN_EMAILS ?? "camstewart7@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const admins = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where("email", "in", adminEmails)
    .execute();
  for (const admin of admins) {
    recipients.set(admin.id, admin.email);
  }

  await Promise.all(
    Array.from(recipients.entries()).map(async ([recipientId, email]) => {
      await Promise.all([
        notificationDeliveryJob.submit({
          body: event.detail,
          dedupeKey: `venue-event:${event.id}:${recipientId}`,
          entityId: event.id,
          entityType: event.kind,
          kind: `venue_${event.kind}`,
          title: event.title,
          userId: recipientId,
        }),
        venueEmailJob.submit({
          body: `${event.title}\n\n${event.detail}`,
          html: `<h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.detail)}</p><p><a href="${venueAppUrl}/venues/${encodeURIComponent(event.locationId)}">Open Chewbuu Sync to handle it</a>.</p>`,
          subject: event.title,
          to: email,
        }),
      ]);
    })
  );
};

const notifyVenueGuest = async (
  userId: string,
  event: { detail: string; id: string; kind: string; title: string }
) => {
  const db = await getDb();
  const guest = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!guest) return;

  await Promise.all([
    notificationDeliveryJob.submit({
      body: event.detail,
      dedupeKey: `venue-guest-event:${event.id}`,
      entityId: event.id,
      entityType: event.kind,
      kind: `venue_${event.kind}`,
      title: event.title,
      userId: guest.id,
    }),
    venueEmailJob.submit({
      body: `${event.title}\n\n${event.detail}`,
      html: `<h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.detail)}</p><p><a href="${venueAppUrl}/me">We’ll keep you posted in Chewbuu.</a></p>`,
      subject: event.title,
      to: guest.email,
    }),
  ]);
};

const loadProfile = async (userId: string, sessionUser: SessionUser) => {
  const db = await getDb();
  const storedProfile = await db
    .selectFrom("profile")
    .selectAll()
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!storedProfile) return null;

  const [media, contacts, invites, identity] = await Promise.all([
    db
      .selectFrom("profile_media")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("sort_order", "asc")
      .execute(),
    db
      .selectFrom("trusted_contact")
      .selectAll()
      .where("user_id", "=", userId)
      .execute(),
    db
      .selectFrom("friend_invite")
      .selectAll()
      .where("user_id", "=", userId)
      .execute(),
    db
      .selectFrom("user")
      .select(["identity_status", "identity_verified_name", "username"])
      .where("id", "=", userId)
      .executeTakeFirst(),
  ]);

  const [profilePhotoUrl, introVideoUrl, resolvedMedia] = await Promise.all([
    mintStoredMediaUrl(storedProfile.profile_photo_url),
    mintStoredMediaUrl(storedProfile.intro_video_url),
    Promise.all(
      media.map(async (item) => ({
        id: item.id,
        isPrimary: item.is_primary,
        kind: item.kind,
        sortOrder: item.sort_order,
        url: (await mintStoredMediaUrl(item.url)) ?? item.url,
      }))
    ),
  ]);

  return {
    ...storedProfile,
    intro_video_url: introVideoUrl,
    profile_photo_url: profilePhotoUrl,
    email: sessionUser.email,
    favoritePlaces: storedProfile.favorite_places ?? {},
    friendInvites: invites,
    identityStatus:
      identity?.identity_status as IdentityVerificationSession["status"],
    ...(identity?.identity_verified_name
      ? { identityVerifiedName: identity.identity_verified_name }
      : {}),
    media: resolvedMedia,
    name: sessionUser.name,
    trustedContacts: contacts,
    userId,
    username: identity?.username ?? sessionUser.username ?? "",
  } satisfies DatingProfileResponse;
};

const loadPendingReviews = async (
  userId: string
): Promise<PendingReviewResponse[]> => {
  const db = await getDb();
  const rows = await db
    .selectFrom("date_review as review")
    .innerJoin(
      "date_request as request",
      "request.id",
      "review.date_request_id"
    )
    .select([
      "review.completed_at as completedAt",
      "review.date_request_id as dateRequestId",
      "review.id",
      "review.required",
      "request.scheduled_at as scheduledAt",
      "request.search_area as searchArea",
    ])
    .where("review.user_id", "=", userId)
    .where("review.required", "=", true)
    .where("review.completed_at", "is", null)
    .orderBy("request.scheduled_at", "desc")
    .execute();

  return rows.map((row) => ({
    ...row,
    completedAt: toIso(row.completedAt),
    scheduledAt: new Date(row.scheduledAt).toISOString(),
  }));
};

const loadDatingSummary = async (
  sessionUser: SessionUser
): Promise<DatingSummaryResponse> => {
  const db = await getDb();
  const [profile, pendingReviews, requests, identity] = await Promise.all([
    db
      .selectFrom("profile")
      .select([
        "area",
        "can_date as canDate",
        "dating_enabled as datingEnabled",
        "latitude",
        "longitude",
        "onboarded",
      ])
      .where("user_id", "=", sessionUser.id)
      .executeTakeFirst(),
    loadPendingReviews(sessionUser.id),
    db
      .selectFrom("date_request")
      .selectAll()
      .where((expression) =>
        expression.or([
          expression("user_id", "=", sessionUser.id),
          expression(
            "id",
            "in",
            expression
              .selectFrom("date_match")
              .select("request_id")
              .where("user_id", "=", sessionUser.id)
          ),
        ])
      )
      .orderBy("scheduled_at", "desc")
      .execute(),
    db
      .selectFrom("user")
      .select("identity_status")
      .where("id", "=", sessionUser.id)
      .executeTakeFirst(),
  ]);
  const identityVerified = identity?.identity_status === "verified";
  if (!profile || !hasLocation(profile)) {
    return {
      membershipTier: sessionUser.membershipTier ?? "social",
      pendingReviews: pendingReviews.length,
      readiness: {
        canDate: false,
        datingEnabled: false,
        identityVerified,
        onboarded: Boolean(profile?.onboarded),
        pendingReviews: pendingReviews.length,
      },
      requests: [],
    };
  }

  const [matches, places, partyMembers, requesters] = requests.length
    ? await Promise.all([
        db
          .selectFrom("date_match")
          .select([
            "compatibility",
            "display_name as displayName",
            "id",
            "intro_video_url as introVideoUrl",
            "profile_photo_url as profilePhotoUrl",
            "profile_summary as profileSummary",
            "request_id as requestId",
            "status",
            "user_id as userId",
            "video_replies_required as videoRepliesRequired",
          ])
          .where(
            "request_id",
            "in",
            requests.map((request) => request.id)
          )
          .execute(),
        db
          .selectFrom("date_request_place")
          .selectAll()
          .where(
            "request_id",
            "in",
            requests.map((request) => request.id)
          )
          .execute(),
        db
          .selectFrom("date_request_party_member")
          .selectAll()
          .where(
            "request_id",
            "in",
            requests.map((request) => request.id)
          )
          .execute(),
        db
          .selectFrom("profile")
          .innerJoin("user", "user.id", "profile.user_id")
          .select([
            "profile.bio",
            "profile.profile_photo_url as avatar",
            "profile.user_id as userId",
            "user.name",
          ])
          .where(
            "profile.user_id",
            "in",
            Array.from(new Set(requests.map((request) => request.user_id)))
          )
          .execute(),
      ])
    : [[], [], [], []];
  const requesterProfiles = await Promise.all(
    requesters.map(async (requester) => ({
      avatar: (await mintStoredMediaUrl(requester.avatar)) ?? null,
      bio: requester.bio ?? "",
      name: requester.name,
      userId: requester.userId,
    }))
  );
  const requesterByUserId = new Map(
    requesterProfiles.map((requester) => [requester.userId, requester])
  );
  const resolvedMatches = await Promise.all(
    matches.map(async (match) => ({
      ...match,
      introVideoUrl:
        (await mintStoredMediaUrl(match.introVideoUrl)) ?? match.introVideoUrl,
      profilePhotoUrl:
        (await mintStoredMediaUrl(match.profilePhotoUrl)) ??
        match.profilePhotoUrl,
    }))
  );

  return {
    membershipTier: sessionUser.membershipTier ?? "social",
    pendingReviews: pendingReviews.length,
    readiness: {
      canDate:
        Boolean(profile?.canDate) &&
        Boolean(profile?.datingEnabled) &&
        Boolean(profile?.onboarded) &&
        identityVerified &&
        pendingReviews.length === 0,
      datingEnabled: Boolean(profile?.datingEnabled),
      identityVerified,
      onboarded: Boolean(profile?.onboarded),
      pendingReviews: pendingReviews.length,
    },
    requests: requests.map((request) => ({
      createdAt: new Date(request.created_at).toISOString(),
      filters: request.filters,
      id: request.id,
      isRequester: request.user_id === sessionUser.id,
      matches: resolvedMatches
        .filter((match) => match.requestId === request.id)
        .map(({ requestId: _requestId, ...match }) => match),
      partyMembers: partyMembers
        .filter((member) => member.request_id === request.id)
        .map((member) => ({ displayName: member.display_name })),
      partySize: request.party_size,
      paymentMode: request.payment_mode,
      requester: requesterByUserId.get(request.user_id) ?? {
        avatar: null,
        bio: "",
        name: "Chewbuu member",
        userId: request.user_id,
      },
      places: places
        .filter((place) => place.request_id === request.id)
        .map((place) => ({
          address: place.address ?? undefined,
          name: place.name,
          placeId: place.place_id,
          rating: place.rating ?? undefined,
          types: place.types,
        })),
      scheduledAt: new Date(request.scheduled_at).toISOString(),
      searchArea: request.search_area,
      status: request.status,
      what: request.what,
    })),
  };
};

const setDatingAvailability = async (
  sessionUser: SessionUser,
  input: unknown
) => {
  const body = z.object({ enabled: z.boolean() }).parse(input);
  const db = await getDb();
  const profile = await db
    .selectFrom("profile")
    .select(["can_date", "onboarded"])
    .where("user_id", "=", sessionUser.id)
    .executeTakeFirst();

  if (!profile) throw new Error("Complete your profile before dating.");
  if (body.enabled && (!profile.onboarded || !profile.can_date)) {
    throw new Error("Complete onboarding before you start dating.");
  }

  await db
    .updateTable("profile")
    .set({ dating_enabled: body.enabled, updated_at: new Date() })
    .where("user_id", "=", sessionUser.id)
    .execute();

  const summary = await loadDatingSummary(sessionUser);
  return { readiness: summary.readiness };
};

const profileMediaInputSchema = z.object({
  isPrimary: z.boolean().default(false),
  kind: z.enum(["profile_photo", "photo", "intro_video"]),
  sortOrder: z.number().int().min(0).default(0),
  url: z.string().url(),
});

const favoritePlaceInputSchema = z.object({
  address: z.string().optional(),
  category: z.string().trim().min(1),
  googleMapsUri: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  name: z.string().trim().min(1),
  placeId: z.string().trim().min(1),
  types: z.array(z.string()).default([]),
});

const profileInputSchema = z.object({
  ageRangeMax: z.number().int().min(18).max(99).optional(),
  ageRangeMin: z.number().int().min(18).max(99).optional(),
  area: z.string().trim().min(1),
  bio: z.string().optional(),
  birthday: z.string().trim().min(1),
  datingModes: z.array(z.string()).default([]),
  distanceMiles: z.number().int().min(1).max(250).default(25),
  favoriteThings: z.array(z.string()).default([]),
  favoritePlaces: z
    .record(z.string(), z.array(favoritePlaceInputSchema))
    .default({}),
  friendInvites: z.array(z.record(z.string(), z.unknown())).default([]),
  height: z.string().optional(),
  interestDetails: z.record(z.string(), z.array(z.string())).default({}),
  interestedIn: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  kids: z.string().optional(),
  latitude: z.string().optional(),
  lookingFor: z.array(z.string()).default([]),
  longitude: z.string().optional(),
  maritalStatus: z.string().optional(),
  media: z.array(profileMediaInputSchema).max(7).default([]),
  name: z.string().optional(),
  occupation: z.string().optional(),
  politics: z.string().optional(),
  phone: z.string().optional(),
  race: z.string().optional(),
  religion: z.string().optional(),
  safetyOptIn: z.boolean().default(false),
  sex: z.string().trim().min(1),
  sexuality: z.string().trim().min(1),
  trustedContacts: z.array(z.record(z.string(), z.unknown())).default([]),
  username: z.string().optional(),
  weight: z.string().optional(),
  wantsKids: z.string().optional(),
});
const profileDraftInputSchema = z.object({
  ageRangeMax: z.number().int().min(18).max(99).optional().nullable(),
  ageRangeMin: z.number().int().min(18).max(99).optional().nullable(),
  area: z.string().trim().optional().nullable(),
  bio: z.string().optional().nullable(),
  birthday: z.string().trim().optional().nullable(),
  datingModes: z.array(z.string()).default([]),
  distanceMiles: z.number().int().min(1).max(250).default(25),
  favoriteThings: z.array(z.string()).default([]),
  favoritePlaces: z
    .record(z.string(), z.array(favoritePlaceInputSchema))
    .default({}),
  friendInvites: z.array(z.record(z.string(), z.unknown())).default([]),
  height: z.string().optional().nullable(),
  interestDetails: z.record(z.string(), z.array(z.string())).default({}),
  interestedIn: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  kids: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  lookingFor: z.array(z.string()).default([]),
  longitude: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  media: z.array(profileMediaInputSchema).max(7).default([]),
  name: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  politics: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  race: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  safetyOptIn: z.boolean().default(false),
  sex: z.string().trim().optional().nullable(),
  sexuality: z.string().trim().optional().nullable(),
  trustedContacts: z.array(z.record(z.string(), z.unknown())).default([]),
  username: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  wantsKids: z.string().optional().nullable(),
});

const dateRequestInputSchema = z.object({
  filters: z.array(z.string()).default([]),
  friendUserId: z.string().min(1).optional(),
  partyMembers: z
    .array(
      z.object({
        displayName: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .max(3)
    .default([]),
  paymentMode: z.enum(["dutch", "requester_covers"]),
  places: z
    .array(
      z.object({
        address: z.string().optional(),
        name: z.string().min(1),
        placeId: z.string().min(1),
        rating: z.string().optional(),
        types: z.array(z.string()).default([]),
      })
    )
    .min(1)
    .max(3),
  scheduledAt: z.iso.datetime(),
  searchArea: z.string().min(1),
  what: z.array(z.enum(["eat", "drink", "play"])).min(1),
});

const getAge = (birthday: string) => {
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  if (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  ) {
    age -= 1;
  }
  return age;
};

const saveProfile = async (
  sessionUser: SessionUser,
  input: unknown,
  draft: boolean
) => {
  const body = draft
    ? profileDraftInputSchema.parse(input)
    : profileInputSchema.parse(input);
  const age = body.birthday ? getAge(body.birthday) : null;
  if (!draft) {
    if (age === null || age < 18) {
      throw new Error("Chewbuu is for users 18 and older.");
    }
  } else if (age !== null && age < 18) {
    throw new Error("Chewbuu is for users 18 and older.");
  }

  const hasProfilePhoto = (body.media ?? []).some(
    (item) => item.kind === "profile_photo"
  );
  const hasIntroVideo = (body.media ?? []).some(
    (item) => item.kind === "intro_video"
  );
  const locationReady = hasLocation(body);
  const db = await getDb();
  const [userState, existingProfile] = await Promise.all([
    db
      .selectFrom("user")
      .select(["identity_status", "username"])
      .where("id", "=", sessionUser.id)
      .executeTakeFirst(),
    db
      .selectFrom("profile")
      .select("dating_enabled")
      .where("user_id", "=", sessionUser.id)
      .executeTakeFirst(),
  ]);
  const identityVerified = userState?.identity_status === "verified";
  const usernameToSave = userState?.username || body.username;
  const canDateEligible =
    hasProfilePhoto && hasIntroVideo && locationReady && identityVerified;
  const datingEnabled = existingProfile?.dating_enabled ?? false;
  const onboarded =
    !draft &&
    Boolean(
      hasProfilePhoto &&
      hasIntroVideo &&
      identityVerified &&
      usernameToSave &&
      body.area &&
      locationReady &&
      body.birthday &&
      body.sex &&
      body.sexuality &&
      (body.safetyOptIn ||
        (body.trustedContacts && body.trustedContacts.length > 0))
    );
  const now = new Date();

  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("profile")
      .values({
        age_range_max: body.ageRangeMax ?? null,
        age_range_min: body.ageRangeMin ?? null,
        area: body.area || null,
        bio: body.bio || null,
        birthday: body.birthday || null,
        can_date: canDateEligible,
        contribution_score: 0,
        created_at: now,
        dating_enabled: false,
        dating_modes: jsonb(body.datingModes ?? []),
        distance_miles: body.distanceMiles ?? 25,
        favorite_things: jsonb(body.favoriteThings ?? []),
        favorite_places: jsonb(body.favoritePlaces ?? {}),
        height: body.height || null,
        id: crypto.randomUUID(),
        interest_details: jsonb(body.interestDetails ?? {}),
        interested_in: jsonb(body.interestedIn ?? []),
        interests: jsonb(body.interests ?? []),
        intro_video_url:
          body.media?.find((item) => item.kind === "intro_video")?.url ?? null,
        kids: body.kids || null,
        latitude: body.latitude || null,
        looking_for: jsonb(body.lookingFor ?? []),
        longitude: body.longitude || null,
        marital_status: body.maritalStatus || null,
        onboarded,
        onboarding_completed_at: onboarded ? now : null,
        occupation: body.occupation || null,
        politics: body.politics || null,
        profile_photo_url:
          body.media?.find((item) => item.kind === "profile_photo")?.url ??
          null,
        phone: body.phone || null,
        race: body.race || null,
        religion: body.religion || null,
        reliability_score: 100,
        safety_opt_in: body.safetyOptIn ?? false,
        sex: body.sex || null,
        sexuality: body.sexuality || null,
        updated_at: now,
        user_id: sessionUser.id,
        weight: body.weight || null,
        wants_kids: body.wantsKids || null,
      })
      .onConflict((conflict) =>
        conflict.column("user_id").doUpdateSet({
          age_range_max: body.ageRangeMax ?? null,
          age_range_min: body.ageRangeMin ?? null,
          area: body.area || null,
          bio: body.bio || null,
          birthday: body.birthday || null,
          can_date: canDateEligible,
          dating_modes: jsonb(body.datingModes ?? []),
          distance_miles: body.distanceMiles ?? 25,
          favorite_things: jsonb(body.favoriteThings ?? []),
          favorite_places: jsonb(body.favoritePlaces ?? {}),
          height: body.height || null,
          interest_details: jsonb(body.interestDetails ?? {}),
          interested_in: jsonb(body.interestedIn ?? []),
          interests: jsonb(body.interests ?? []),
          intro_video_url:
            body.media?.find((item) => item.kind === "intro_video")?.url ??
            null,
          kids: body.kids || null,
          latitude: body.latitude || null,
          looking_for: jsonb(body.lookingFor ?? []),
          longitude: body.longitude || null,
          marital_status: body.maritalStatus || null,
          onboarded,
          onboarding_completed_at: onboarded ? now : null,
          occupation: body.occupation || null,
          politics: body.politics || null,
          profile_photo_url:
            body.media?.find((item) => item.kind === "profile_photo")?.url ??
            null,
          phone: body.phone || null,
          race: body.race || null,
          religion: body.religion || null,
          safety_opt_in: body.safetyOptIn ?? false,
          sex: body.sex || null,
          sexuality: body.sexuality || null,
          updated_at: now,
          weight: body.weight || null,
          wants_kids: body.wantsKids || null,
        })
      )
      .execute();

    await tx
      .deleteFrom("profile_media")
      .where("user_id", "=", sessionUser.id)
      .execute();
    if (body.media && body.media.length) {
      await tx
        .insertInto("profile_media")
        .values(
          body.media.map((item) => ({
            created_at: now,
            id: crypto.randomUUID(),
            is_primary: item.isPrimary,
            kind: item.kind,
            sort_order: item.sortOrder,
            url: item.url,
            user_id: sessionUser.id,
          }))
        )
        .execute();
    }

    await tx
      .updateTable("user")
      .set({
        has_completed_onboarding: onboarded,
        has_intro_video: hasIntroVideo,
        has_profile_photo: hasProfilePhoto,
        ...(usernameToSave ? { username: usernameToSave } : {}),
      })
      .where("id", "=", sessionUser.id)
      .execute();
  });

  const pendingReviewRows = await loadPendingReviews(sessionUser.id);
  const pendingReviews = pendingReviewRows.length;
  const savedProfile = await loadProfile(sessionUser.id, {
    ...sessionUser,
    username: usernameToSave ?? sessionUser.username,
  });
  return {
    profile: savedProfile as DatingProfileResponse,
    readiness: {
      canDate:
        canDateEligible && datingEnabled && onboarded && pendingReviews === 0,
      datingEnabled,
      identityVerified,
      onboarded,
      pendingReviews,
    },
  };
};

const isProtectedYoungAdult = (age: number) => age >= 18 && age <= 21;

const createDateRequest = async (
  sessionUser: SessionUser,
  input: unknown
): Promise<{
  matches: DatingMatchResponse[];
  request: DatingRequestResponse;
}> => {
  const body = dateRequestInputSchema.parse(input);
  const { friendUserId } = body;
  const pendingReviews = await loadPendingReviews(sessionUser.id);
  if (pendingReviews.length > 0) {
    throw new Error("Complete pending reviews before booking another date.");
  }

  const db = await getDb();
  const requesterProfile = await db
    .selectFrom("profile")
    .selectAll()
    .where("user_id", "=", sessionUser.id)
    .executeTakeFirst();
  if (!requesterProfile || !hasLocation(requesterProfile)) {
    throw new Error(
      "Add your area and enable location before requesting a date."
    );
  }
  if (
    !requesterProfile.onboarded ||
    !requesterProfile.can_date ||
    !requesterProfile.dating_enabled
  ) {
    throw new Error("Complete onboarding and start dating before requesting.");
  }
  const requestId = crypto.randomUUID();
  const now = new Date();
  const partySize = body.partyMembers.length + 1;
  if (sessionUser.membershipTier === "social" && partySize > 1) {
    throw new Error("Social members can only create solo dates.");
  }
  if (
    body.paymentMode === "requester_covers" &&
    sessionUser.membershipTier !== "sugar"
  ) {
    throw new Error("Upgrade to Sugar to cover the date.");
  }

  const directTarget = friendUserId
    ? await db
        .selectFrom("profile")
        .innerJoin("user", "user.id", "profile.user_id")
        .select([
          "profile.age_range_max as ageRangeMax",
          "profile.age_range_min as ageRangeMin",
          "profile.area",
          "profile.birthday",
          "profile.distance_miles as distanceMiles",
          "profile.user_id as userId",
          "profile.interests",
          "profile.interested_in as interestedIn",
          "profile.sex",
          "user.name as displayName",
          "profile.intro_video_url as introVideoUrl",
          "profile.profile_photo_url as profilePhotoUrl",
          "profile.bio as profileSummary",
          "profile.latitude",
          "profile.longitude",
          "profile.reliability_score as reliabilityScore",
          "profile.contribution_score as contributionScore",
        ])
        .where("profile.user_id", "=", friendUserId)
        .executeTakeFirst()
    : undefined;
  if (friendUserId) {
    const friendship = await db
      .selectFrom("friendship")
      .select("id")
      .where("status", "=", "accepted")
      .where((expression) =>
        expression.or([
          expression("user_id", "=", sessionUser.id).and(
            expression("friend_user_id", "=", friendUserId)
          ),
          expression("user_id", "=", friendUserId).and(
            expression("friend_user_id", "=", sessionUser.id)
          ),
        ])
      )
      .executeTakeFirst();
    if (!friendship) throw new Error("Accepted friendship required");
    if (!directTarget) throw new Error("Friend profile not found");
  }

  const candidateRows = friendUserId
    ? directTarget
      ? [directTarget]
      : []
    : await db
        .selectFrom("profile")
        .innerJoin("user", "user.id", "profile.user_id")
        .select([
          "profile.age_range_max as ageRangeMax",
          "profile.age_range_min as ageRangeMin",
          "profile.area",
          "profile.birthday",
          "profile.distance_miles as distanceMiles",
          "profile.user_id as userId",
          "profile.interests",
          "profile.interested_in as interestedIn",
          "profile.sex",
          "user.name as displayName",
          "profile.intro_video_url as introVideoUrl",
          "profile.profile_photo_url as profilePhotoUrl",
          "profile.bio as profileSummary",
          "profile.latitude",
          "profile.longitude",
          "profile.reliability_score as reliabilityScore",
          "profile.contribution_score as contributionScore",
        ])
        .where("profile.user_id", "!=", sessionUser.id)
        .where("profile.can_date", "=", true)
        .where("profile.dating_enabled", "=", true)
        .where("profile.onboarded", "=", true)
        .where("profile.latitude", "is not", null)
        .where("profile.longitude", "is not", null)
        .execute();
  const pendingCandidateRows = friendUserId
    ? []
    : await db
        .selectFrom("date_review")
        .select("user_id")
        .where("required", "=", true)
        .where("completed_at", "is", null)
        .execute();
  const pendingCandidateIds = new Set(
    pendingCandidateRows.map((row) => row.user_id)
  );
  const requesterAge = requesterProfile?.birthday
    ? getAge(requesterProfile.birthday)
    : null;
  const candidates = candidateRows
    .filter((candidate) => {
      const candidateAge = candidate.birthday
        ? getAge(candidate.birthday)
        : null;
      if (
        requesterAge !== null &&
        candidateAge !== null &&
        isProtectedYoungAdult(candidateAge) &&
        requesterAge > candidateAge
      ) {
        return false;
      }
      if (friendUserId) return true;
      if (pendingCandidateIds.has(candidate.userId)) return false;
      const requesterInterestedIn = requesterProfile?.interested_in ?? [];
      const candidateInterestedIn = candidate.interestedIn ?? [];
      if (
        requesterInterestedIn.length > 0 &&
        (!candidate.sex || !requesterInterestedIn.includes(candidate.sex))
      ) {
        return false;
      }
      if (
        candidateInterestedIn.length > 0 &&
        !candidateInterestedIn.includes(requesterProfile?.sex ?? "")
      ) {
        return false;
      }
      if (requesterAge === null || candidateAge === null) return false;
      if (
        requesterProfile?.age_range_min !== null &&
        requesterProfile?.age_range_min !== undefined &&
        candidateAge < requesterProfile.age_range_min
      ) {
        return false;
      }
      if (
        requesterProfile?.age_range_max !== null &&
        requesterProfile?.age_range_max !== undefined &&
        candidateAge > requesterProfile.age_range_max
      ) {
        return false;
      }
      if (
        candidate.ageRangeMin !== null &&
        candidateAge < candidate.ageRangeMin
      ) {
        return false;
      }
      if (
        candidate.ageRangeMax !== null &&
        candidateAge > candidate.ageRangeMax
      ) {
        return false;
      }
      const distance = distanceBetweenMiles(
        requesterProfile.latitude,
        requesterProfile.longitude,
        candidate.latitude,
        candidate.longitude
      );
      return distance !== null && distance <= requesterProfile.distance_miles;
    })
    .toSorted((first, second) => {
      const firstDistance = distanceBetweenMiles(
        requesterProfile.latitude,
        requesterProfile.longitude,
        first.latitude,
        first.longitude
      );
      const secondDistance = distanceBetweenMiles(
        requesterProfile.latitude,
        requesterProfile.longitude,
        second.latitude,
        second.longitude
      );
      return (
        (firstDistance ?? Number.POSITIVE_INFINITY) -
        (secondDistance ?? Number.POSITIVE_INFINITY)
      );
    })
    .slice(0, 3);

  const matches = candidates.map((candidate) => ({
    compatibility: calculateMatchScore(requesterProfile.interests, {
      contributionScore: candidate.contributionScore,
      distanceMiles:
        distanceBetweenMiles(
          requesterProfile.latitude,
          requesterProfile.longitude,
          candidate.latitude,
          candidate.longitude
        ) ?? Number.POSITIVE_INFINITY,
      interests: candidate.interests,
      reliabilityScore: candidate.reliabilityScore,
    }),
    ...(distanceBetweenMiles(
      requesterProfile.latitude,
      requesterProfile.longitude,
      candidate.latitude,
      candidate.longitude
    ) !== null
      ? {
          distanceMiles: distanceBetweenMiles(
            requesterProfile.latitude,
            requesterProfile.longitude,
            candidate.latitude,
            candidate.longitude
          ) as number,
        }
      : {}),
    displayName: candidate.displayName,
    id: crypto.randomUUID(),
    introVideoUrl: candidate.introVideoUrl ?? "",
    profilePhotoUrl: candidate.profilePhotoUrl,
    profileSummary: candidate.profileSummary ?? "",
    status: friendUserId ? "accepted" : "suggested",
    userId: candidate.userId,
    videoRepliesRequired: 3,
  }));

  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("date_request")
      .values({
        actual_end_at: null,
        actual_start_at: null,
        created_at: now,
        filters: jsonb(body.filters),
        id: requestId,
        party_size: partySize,
        payment_mode: body.paymentMode,
        scheduled_at: new Date(body.scheduledAt),
        search_area: body.searchArea,
        status: friendUserId ? "matched" : "match_pending",
        updated_at: now,
        user_id: sessionUser.id,
        what: body.what,
      })
      .execute();
    if (body.partyMembers.length) {
      await tx
        .insertInto("date_request_party_member")
        .values(
          body.partyMembers.map((member) => ({
            display_name:
              member.displayName ?? member.name ?? member.email ?? "Guest",
            id: crypto.randomUUID(),
            invited_user_id: null,
            request_id: requestId,
            source: "friend",
            status: "invited",
          }))
        )
        .execute();
    }
    await tx
      .insertInto("date_request_place")
      .values(
        body.places.map((place) => ({
          address: place.address ?? null,
          id: crypto.randomUUID(),
          name: place.name,
          place_id: place.placeId,
          rating: place.rating ?? null,
          request_id: requestId,
          selected: true,
          types: jsonb(place.types),
        }))
      )
      .execute();
    if (matches.length) {
      await tx
        .insertInto("date_match")
        .values(
          matches.map((match) => ({
            compatibility: match.compatibility,
            display_name: match.displayName,
            group_id: null,
            id: match.id,
            intro_video_url: match.introVideoUrl,
            match_kind: partySize > 1 ? "group" : "individual",
            profile_photo_url: match.profilePhotoUrl,
            profile_summary: match.profileSummary,
            request_id: requestId,
            status: match.status,
            user_id: match.userId,
            video_replies_required: match.videoRepliesRequired,
          }))
        )
        .execute();
    }
  });

  if (matches.length) {
    await createNotification({
      body: friendUserId
        ? "Your friend date request is ready to review."
        : `${matches.length} match${matches.length === 1 ? "" : "es"} are ready to review.`,
      dedupeKey: `date-request:${requestId}:matches`,
      entityId: requestId,
      entityType: "date_request",
      kind: friendUserId ? "date_request" : "matches_ready",
      title: friendUserId
        ? "Friend date request"
        : "Your date matches are ready",
      userId: sessionUser.id,
    });
    if (friendUserId) {
      await createNotification({
        body: "You have a direct friend date request.",
        dedupeKey: `date-request:${requestId}:friend`,
        entityId: requestId,
        entityType: "date_request",
        kind: "date_request",
        title: "Friend date request",
        userId: friendUserId,
      });
    }
  }

  return {
    matches,
    request: {
      filters: body.filters,
      id: requestId,
      partyMembers: body.partyMembers.map((member) => ({
        displayName:
          member.displayName ?? member.name ?? member.email ?? "Guest",
      })),
      partySize,
      paymentMode: body.paymentMode,
      places: body.places,
      scheduledAt: body.scheduledAt,
      searchArea: body.searchArea,
      status: matches.length ? "matched" : "no_match",
      what: body.what,
    },
  };
};

const getDateMeeting = async (
  requestOrMatchId: string,
  sessionUser: SessionUser
): Promise<ChimeMeetingResponse> => {
  const db = await getDb();
  const request = await db
    .selectFrom("date_request")
    .leftJoin("date_match", "date_match.request_id", "date_request.id")
    .select([
      "date_request.chime_meeting_id as chimeMeetingId",
      "date_request.id",
      "date_request.party_size as partySize",
    ])
    .where((expression) =>
      expression.or([
        expression("date_request.id", "=", requestOrMatchId),
        expression("date_match.id", "=", requestOrMatchId),
      ])
    )
    .where((expression) =>
      expression.or([
        expression("date_request.user_id", "=", sessionUser.id),
        expression("date_match.user_id", "=", sessionUser.id),
      ])
    )
    .executeTakeFirst();
  if (!request) throw new Error("Date request not found");
  if (request.partySize === null || request.partySize < 2)
    throw new Error("Solo dates do not use video calls");

  let meetingId = request.chimeMeetingId;
  let mediaPlacement: Record<string, string>;
  if (meetingId) {
    const meeting = await chime.send(
      new GetMeetingCommand({ MeetingId: meetingId })
    );
    mediaPlacement = (meeting.Meeting?.MediaPlacement ?? {}) as Record<
      string,
      string
    >;
  } else {
    const meeting = await chime.send(
      new CreateMeetingCommand({
        ClientRequestToken: crypto.randomUUID(),
        ExternalMeetingId: request.id,
        MediaRegion: process.env.CHIME_MEDIA_REGION ?? "us-east-1",
      })
    );
    meetingId = meeting.Meeting?.MeetingId ?? null;
    mediaPlacement = (meeting.Meeting?.MediaPlacement ?? {}) as Record<
      string,
      string
    >;
    if (!meetingId) throw new Error("Unable to create video meeting");
    await db
      .updateTable("date_request")
      .set({ chime_meeting_id: meetingId, updated_at: new Date() })
      .where("id", "=", request.id)
      .execute();
  }

  const attendee = await chime.send(
    new CreateAttendeeCommand({
      ExternalUserId: sessionUser.id.slice(0, 64),
      MeetingId: meetingId,
    })
  );
  if (!attendee.Attendee?.AttendeeId || !attendee.Attendee.JoinToken) {
    throw new Error("Unable to create video attendee");
  }

  return {
    attendee: {
      attendeeId: attendee.Attendee.AttendeeId,
      externalUserId: attendee.Attendee.ExternalUserId ?? sessionUser.id,
      joinToken: attendee.Attendee.JoinToken,
    },
    meeting: {
      externalMeetingId: request.id,
      mediaPlacement,
      meetingId,
    },
  };
};

const toMessage = async (message: {
  created_at: Date;
  duration_sec: number | null;
  id: string;
  kind: string;
  media_thumb_url: string | null;
  media_url: string | null;
  room_id: string;
  sender_id: string;
  system_icon: string | null;
  text: string | null;
}): Promise<ApiChatMessage> => ({
  createdAt: message.created_at.toISOString(),
  durationSec: message.duration_sec ?? undefined,
  id: message.id,
  kind: chatMessageSchema.shape.kind.parse(message.kind),
  mediaThumbUrl: await mintStoredMediaUrl(message.media_thumb_url),
  mediaUrl: await mintStoredMediaUrl(message.media_url),
  roomId: message.room_id,
  senderId: message.sender_id,
  systemIcon: message.system_icon
    ? chatMessageSchema.shape.systemIcon.parse(message.system_icon)
    : undefined,
  text: message.text ?? undefined,
});

const toParticipant = (participant: ApiChatParticipant) => participant;

const toRoom = async (
  room: {
    active_date_id: string | null;
    id: string;
    kind: string;
    match_id: string | null;
    phase: string;
    title: string;
    updated_at: Date;
  },
  participants: ApiChatParticipant[],
  messages: ApiChatMessage[],
  unreadCount: number
): Promise<ApiChatRoom> => ({
  activeDateId: room.active_date_id ?? undefined,
  id: room.id,
  kind: room.kind,
  matchId: room.match_id ?? undefined,
  messages,
  participants: participants.map(toParticipant),
  phase: room.phase,
  realtimeChannel: (await realtime.getChannel(
    "messages",
    room.id
  )) as unknown as RealtimeChannelClient<ApiChatMessage>,
  title: room.title,
  typingChannel: (await realtime.getChannel(
    "typing",
    room.id
  )) as unknown as RealtimeChannelClient<{
    isTyping: boolean;
    roomId: string;
    userId: string;
  }>,
  unreadCount,
  updatedAt: room.updated_at.toISOString(),
});

const loadRoomsFromDatabase = async (userId: string, roomIds?: string[]) => {
  const db = await getDb();
  let roomQuery = db
    .selectFrom("chat_room as room")
    .innerJoin(
      "chat_participant as membership",
      "membership.room_id",
      "room.id"
    )
    .selectAll("room")
    .where("membership.user_id", "=", userId)
    .where("room.kind", "!=", "sync_staff")
    .orderBy("room.updated_at", "desc");

  if (roomIds?.length) roomQuery = roomQuery.where("room.id", "in", roomIds);

  const rooms = await roomQuery.execute();
  if (rooms.length === 0) return [];
  const ids = rooms.map((room) => room.id);

  const [participants, messages, readStates] = await Promise.all([
    db
      .selectFrom("chat_participant")
      .selectAll()
      .where("room_id", "in", ids)
      .execute(),
    db
      .selectFrom("chat_message")
      .selectAll()
      .where("room_id", "in", ids)
      .orderBy("created_at", "asc")
      .execute(),
    db
      .selectFrom("chat_read_state")
      .selectAll()
      .where("user_id", "=", userId)
      .where("room_id", "in", ids)
      .execute(),
  ]);

  const result = await Promise.all(
    rooms.map(async (room) => {
      const roomMessages = messages.filter(
        (message) => message.room_id === room.id
      );
      const readState = readStates.find((state) => state.room_id === room.id);
      const unreadCount = roomMessages.filter(
        (message) =>
          message.sender_id !== userId &&
          (!readState || message.created_at > readState.last_read_at)
      ).length;
      return toRoom(
        room,
        participants
          .filter((participant) => participant.room_id === room.id)
          .map((participant) => ({
            avatarUrl: participant.avatar_url ?? undefined,
            displayName: participant.display_name,
            id: participant.id,
            userId: participant.user_id ?? undefined,
          })),
        await Promise.all(roomMessages.slice(-50).map(toMessage)),
        unreadCount
      );
    })
  );

  await roomProjection.putBatch(
    rooms.map((room) => ({
      kind: room.kind,
      phase: room.phase,
      roomId: room.id,
      roomKey: `${room.updated_at.getTime()}#${room.id}`,
      title: room.title,
      updatedAt: room.updated_at.getTime(),
      userId,
    }))
  );
  await roomListCache.put(userId, {
    expiresAt: Date.now() + 30_000,
    roomIds: rooms.map((room) => room.id),
  });
  return result;
};

const loadRooms = async (userId: string) => {
  const cached = await roomListCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    const rooms = await loadRoomsFromDatabase(userId, cached.roomIds);
    if (rooms.length) return rooms;
  }

  const projected = await Array.fromAsync(
    roomProjection.query({
      where: { userId: { equals: userId } },
      order: "desc",
    })
  );
  return loadRoomsFromDatabase(
    userId,
    projected.length ? projected.map((room) => room.roomId) : undefined
  );
};

const getOwnedRoom = async (roomId: string, userId: string) => {
  const db = await getDb();
  const room = await db
    .selectFrom("chat_room as room")
    .innerJoin(
      "chat_participant as membership",
      "membership.room_id",
      "room.id"
    )
    .selectAll("room")
    .where("room.id", "=", roomId)
    .where("membership.user_id", "=", userId)
    .executeTakeFirst();
  if (!room) throw new Error("Chat room not found");
  return room;
};

const sendMessageSchema = z
  .object({
    durationSec: z.number().int().positive().optional(),
    kind: z.enum(["photo", "text", "video", "voice"]).default("text"),
    mediaThumbUrl: z.string().url().optional(),
    mediaUrl: z.string().url().optional(),
    text: z.string().trim().max(4000).optional(),
  })
  .refine((value) => Boolean(value.text || value.mediaUrl), {
    message: "Message text or media is required.",
  });

const placeSuggestionInputSchema = z.object({
  area: z.string().trim().min(1),
  filters: z.array(z.string().trim().min(1)).default([]),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  query: z.string().trim().max(200).optional(),
  searchKind: z.enum(["place", "signal", "venue"]).default("signal"),
  what: z.array(z.string().trim().min(1)).min(1),
});

const publicSpotSearchInputSchema = z.object({
  area: z.string().trim().max(160).optional(),
  category: z.enum(["all", "drink", "eat", "play"]).default("all"),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  query: z.string().trim().max(200).optional(),
});

const reviewInputSchema = z.object({
  mediaIds: z.array(z.string()).default([]),
  personComment: z.string().trim().max(1000).optional(),
  personCriteria: z.record(z.string(), z.number().int().min(1).max(5)),
  personRating: z.number().int().min(1).max(5),
  placeComment: z.string().trim().max(1000).optional(),
  placeCriteria: z.record(z.string(), z.number().int().min(1).max(5)),
  placeRating: z.number().int().min(1).max(5),
});

const membershipPlanSchema = z.object({
  active: z.boolean(),
  annualPriceCents: z.number().int().min(0),
  annualStripePriceId: z.string(),
  cta: z.string().trim().min(1),
  description: z.string().trim().min(1),
  features: z.array(z.string()),
  id: z.string(),
  monthlyPriceCents: z.number().int().min(0),
  name: z.string().trim().min(1),
  sortOrder: z.number().int().min(0),
  stats: z.array(z.string()),
  stripePriceId: z.string(),
  tier: z.enum(["social", "mingle", "sugar"]),
});

const checkInSchema = z.object({
  code: z.string().optional(),
  dateRequestId: z.string().min(1),
  partnerId: z.string().optional(),
});

const spotCaptureOfferSchema = z.object({
  dateRequestId: z.string().min(1),
  googlePlaceId: z.string().trim().min(1),
});

const spotCaptureRewardConfigSchema = z.object({
  rewardCents: z.number().int().min(0).max(100_000),
});

const spotContributionReviewSchema = z.object({
  contributionId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});

const uploadDateMediaSchema = z.object({
  dateRequestId: z.string().min(1),
  kind: z.string().trim().min(1),
  thumbnailUrl: z.string().url().optional(),
  url: z.string().url(),
});

const spotContributionSchema = z.object({
  dateMediaId: z.string().min(1),
  dateRequestId: z.string().min(1),
  googlePlaceId: z.string().trim().min(1),
  kind: z.enum(["menu_photo", "spot_photo"]),
});

const publishRecapSchema = z
  .object({
    caption: z.string().trim().max(2000).optional(),
    dateRequestId: z.string().min(1),
    mediaIds: z.array(z.string().min(1)).max(20).optional(),
    reviewId: z.string().optional(),
    storyHours: z.number().int().min(1).max(24).optional(),
    thumbnailUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
  })
  .refine((value) => Boolean(value.videoUrl || value.mediaIds?.length), {
    message: "A recap needs a video or at least one attached media item.",
  });

const placeSearchKeywords: Record<string, string> = {
  drink: "bar drinks wine beer coffee cocktail",
  eat: "food restaurant",
  move: "fitness gym activity workout",
  play: "fun entertainment things to do",
  talk: "conversation topics",
  watch: "movies shows entertainment",
};

export const buildBlocksPlaceSearchTextQuery = (
  input: PlaceSuggestionInput
) => {
  const filters = input.filters.join(" ");
  const area = input.area.trim();
  const areaSuffix = area ? ` near ${area}` : "";
  if (input.searchKind === "venue") {
    return input.query?.trim() || filters || area;
  }
  if (input.searchKind === "place" && filters) {
    const normalizedFilters = filters.trim().toLowerCase();
    const expandedFilters =
      normalizedFilters === "steak" || normalizedFilters === "steakhouse"
        ? `${filters} steakhouse restaurant`
        : filters;
    return `${expandedFilters}${areaSuffix}`;
  }
  const categories = input.what.map(
    (item) => placeSearchKeywords[item] ?? item
  );
  return `${[filters, ...categories].filter(Boolean).join(" ")}${areaSuffix}`;
};

type GooglePlaceRecord = {
  currentOpeningHours?: { openNow?: boolean };
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  id?: string;
  internationalPhoneNumber?: string;
  location?: { latitude?: number; longitude?: number };
  photos?: {
    authorAttributions?: { displayName?: string }[];
    name?: string;
  }[];
  priceLevel?: string;
  rating?: number;
  types?: string[];
  userRatingCount?: number;
  websiteUri?: string;
};

const toGooglePlaceSuggestion = (
  place: GooglePlaceRecord
): PlaceSuggestion | null => {
  const name = place.displayName?.text;
  const placeId = place.id;
  if (!name || !placeId) return null;

  const photo = place.photos?.[0];
  const photoAttributions = (photo?.authorAttributions ?? []).flatMap(
    (attribution) => (attribution.displayName ? [attribution.displayName] : [])
  );

  return {
    ...(place.formattedAddress ? { address: place.formattedAddress } : {}),
    dataSource: "google",
    ...(place.googleMapsUri ? { googleMapsUri: place.googleMapsUri } : {}),
    ...(place.location?.latitude !== undefined &&
    place.location.longitude !== undefined
      ? {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
        }
      : {}),
    ...(place.currentOpeningHours?.openNow !== undefined
      ? { openNow: place.currentOpeningHours.openNow }
      : {}),
    ...(place.internationalPhoneNumber
      ? { phone: place.internationalPhoneNumber }
      : {}),
    ...(place.priceLevel ? { priceLevel: place.priceLevel } : {}),
    ...(place.rating !== undefined ? { rating: place.rating.toFixed(1) } : {}),
    ...(photoAttributions.length > 0 ? { photoAttributions } : {}),
    ...(photo?.name ? { photoName: photo.name } : {}),
    name,
    placeId,
    ...(place.types ? { types: place.types } : { types: [] }),
    ...(place.userRatingCount !== undefined
      ? { userRatingCount: place.userRatingCount }
      : {}),
    ...(place.websiteUri ? { websiteUri: place.websiteUri } : {}),
  };
};

const requestGooglePlaces = async (
  input: PlaceSuggestionInput,
  area: string
): Promise<{
  places: PlaceSuggestion[];
  reason?: "google_not_configured" | "unavailable";
}> => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return { places: [], reason: "google_not_configured" };

  const latitudeNumber = Number(input.latitude);
  const longitudeNumber = Number(input.longitude);
  const hasCoordinates =
    Number.isFinite(latitudeNumber) && Number.isFinite(longitudeNumber);

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        body: JSON.stringify({
          pageSize: 12,
          textQuery: buildBlocksPlaceSearchTextQuery({ ...input, area }),
          ...(hasCoordinates
            ? {
                locationBias: {
                  circle: {
                    center: {
                      latitude: latitudeNumber,
                      longitude: longitudeNumber,
                    },
                    radius: 50_000,
                  },
                },
              }
            : {}),
        }),
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
          "x-goog-fieldmask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.types,places.photos,places.priceLevel,places.googleMapsUri,places.websiteUri,places.location,places.currentOpeningHours,places.userRatingCount,places.internationalPhoneNumber",
        },
        method: "POST",
      }
    );
    if (!response.ok) return { places: [], reason: "unavailable" };

    const data = (await response.json()) as { places?: GooglePlaceRecord[] };
    return {
      places: (data.places ?? []).flatMap((place) => {
        const normalized = toGooglePlaceSuggestion(place);
        return normalized ? [normalized] : [];
      }),
    };
  } catch {
    return { places: [], reason: "unavailable" };
  }
};

const getGooglePlaceDetails = async (
  placeId: string
): Promise<PlaceSuggestion | null> => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey || !/^places\/[^/]+$/.test(placeId)) return null;

  const resourceName = `places/${encodeURIComponent(placeId.slice("places/".length))}`;
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/${resourceName}`,
      {
        headers: {
          "x-goog-api-key": apiKey,
          "x-goog-fieldmask":
            "id,displayName,formattedAddress,rating,types,photos,priceLevel,googleMapsUri,websiteUri,location,currentOpeningHours,userRatingCount,internationalPhoneNumber",
        },
        method: "GET",
      }
    );
    if (!response.ok) return null;
    return toGooglePlaceSuggestion(
      (await response.json()) as GooglePlaceRecord
    );
  } catch {
    return null;
  }
};

const acquirePlaceSearchRateLimit = async (userId: string) => {
  const windowMs = 60_000;
  const maxRequests = 30;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await placeSearchRateLimit.get(userId);
    const now = Date.now();
    if (!current || now - current.windowStartedAt >= windowMs) {
      try {
        await placeSearchRateLimit.put(
          userId,
          { count: 1, windowStartedAt: now },
          current ? { ifValueEquals: current } : { ifNotExists: true }
        );
        return;
      } catch {
        continue;
      }
    }
    if (current.count >= maxRequests) {
      throw new Error("Place search limit reached. Try again in a minute.");
    }
    try {
      await placeSearchRateLimit.put(
        userId,
        { ...current, count: current.count + 1 },
        { ifValueEquals: current }
      );
      return;
    } catch {
      continue;
    }
  }
  throw new Error("Place search is busy. Try again shortly.");
};

const generateFallbackPlaces = (
  area: string,
  categories: string[],
  filters: string[]
) => {
  const primaryCategory = categories[0]?.toLowerCase() || "eat";
  const primaryFilter = filters[0] || "Trending";
  const sanitizedArea = area.trim() || "Downtown";
  const id1 = `spot_${crypto.randomUUID().slice(0, 8)}`;
  const id2 = `spot_${crypto.randomUUID().slice(0, 8)}`;
  const id3 = `spot_${crypto.randomUUID().slice(0, 8)}`;

  return [
    {
      address: `${sanitizedArea}`,
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${primaryFilter} ${primaryCategory} ${sanitizedArea}`)}`,
      id: id1,
      name: `${primaryFilter} Lounge & Social`,
      openNow: true,
      placeId: id1,
      priceLevel: "PRICE_LEVEL_MODERATE",
      rating: "4.8",
      types: [primaryCategory, "restaurant", "point_of_interest"],
      userRatingCount: 248,
    },
    {
      address: `${sanitizedArea}`,
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${primaryCategory} spot ${sanitizedArea}`)}`,
      id: id2,
      name: `The Local ${primaryCategory === "drink" ? "Cocktail Bar" : primaryCategory === "play" ? "Game Parlor" : "Kitchen & Bar"}`,
      openNow: true,
      placeId: id2,
      priceLevel: "PRICE_LEVEL_MODERATE",
      rating: "4.7",
      types: [primaryCategory, "bar", "point_of_interest"],
      userRatingCount: 185,
    },
    {
      address: `${sanitizedArea}`,
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${sanitizedArea} date spot`)}`,
      id: id3,
      name: "Moonlight Rendezvous",
      openNow: true,
      placeId: id3,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      rating: "4.9",
      types: ["restaurant", "night_club", "point_of_interest"],
      userRatingCount: 312,
    },
  ];
};

const suggestPlaces = async (userId: string, input: unknown) => {
  const body = placeSuggestionInputSchema.parse(input);
  const db = await getDb();
  const profile = await db
    .selectFrom("profile")
    .select(["area", "latitude", "longitude"])
    .where("user_id", "=", userId)
    .executeTakeFirst();

  const area = body.area.trim() || profile?.area || "Austin, TX";
  const latitude = body.latitude ?? profile?.latitude;
  const longitude = body.longitude ?? profile?.longitude;
  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);
  const hasCoordinates =
    Number.isFinite(latitudeNumber) && Number.isFinite(longitudeNumber);

  await acquirePlaceSearchRateLimit(userId);
  const cacheKey = JSON.stringify({
    area: area.toLowerCase(),
    filters: [...body.filters].toSorted(),
    latitude,
    longitude,
    query: body.query,
    searchKind: body.searchKind,
    what: [...body.what].toSorted(),
  });
  const cached = await placeSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      places: await enrichPlacesWithApprovedSpotMedia(db, cached.places),
    };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    if (body.searchKind === "venue" || body.searchKind === "place") {
      return { places: [], reason: "google_not_configured" as const };
    }
    const fallback = generateFallbackPlaces(area, body.what, body.filters);
    await placeSearchCache.put(cacheKey, {
      expiresAt: Date.now() + 1000 * 60 * 60,
      places: fallback,
    });
    return { places: fallback };
  }

  try {
    const textQuery = buildBlocksPlaceSearchTextQuery({ ...body, area });
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        body: JSON.stringify({
          pageSize: 12,
          textQuery,
          ...(hasCoordinates
            ? {
                locationBias: {
                  circle: {
                    center: {
                      latitude: latitudeNumber,
                      longitude: longitudeNumber,
                    },
                    radius: 50_000,
                  },
                },
              }
            : {}),
        }),
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
          "x-goog-fieldmask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.types,places.photos,places.priceLevel,places.googleMapsUri,places.websiteUri,places.location,places.currentOpeningHours,places.userRatingCount,places.internationalPhoneNumber",
        },
        method: "POST",
      }
    );
    if (!response.ok) {
      if (body.searchKind === "venue" || body.searchKind === "place") {
        return { places: [], reason: "unavailable" as const };
      }
      const fallback = generateFallbackPlaces(area, body.what, body.filters);
      return { places: fallback };
    }

    const data = (await response.json()) as {
      places?: {
        currentOpeningHours?: { openNow?: boolean };
        displayName?: { text?: string };
        formattedAddress?: string;
        googleMapsUri?: string;
        id?: string;
        location?: { latitude?: number; longitude?: number };
        photos?: {
          authorAttributions?: { displayName?: string }[];
          name?: string;
        }[];
        internationalPhoneNumber?: string;
        priceLevel?: string;
        rating?: number;
        types?: string[];
        userRatingCount?: number;
        websiteUri?: string;
      }[];
    };
    const places = (data.places ?? []).flatMap((place) => {
      const { id, displayName } = place;
      const name = displayName?.text;
      if (!id || !name) return [];
      return [
        {
          ...(place.formattedAddress
            ? { address: place.formattedAddress }
            : {}),
          dataSource: "google" as const,
          ...(place.googleMapsUri
            ? { googleMapsUri: place.googleMapsUri }
            : {}),
          ...(place.location?.latitude !== undefined &&
          place.location.longitude !== undefined
            ? {
                latitude: place.location.latitude,
                longitude: place.location.longitude,
              }
            : {}),
          ...(place.currentOpeningHours?.openNow !== undefined
            ? { openNow: place.currentOpeningHours.openNow }
            : {}),
          ...(place.internationalPhoneNumber
            ? { phone: place.internationalPhoneNumber }
            : {}),
          ...(place.priceLevel ? { priceLevel: place.priceLevel } : {}),
          ...(place.rating !== undefined
            ? { rating: place.rating.toFixed(1) }
            : {}),
          ...(place.photos?.[0]?.name
            ? { photoName: place.photos[0].name }
            : {}),
          ...(place.photos?.[0]?.authorAttributions
            ? {
                photoAttributions: place.photos[0].authorAttributions.flatMap(
                  (attribution) =>
                    attribution.displayName ? [attribution.displayName] : []
                ),
              }
            : {}),
          ...(place.userRatingCount !== undefined
            ? { userRatingCount: place.userRatingCount }
            : {}),
          ...(place.websiteUri ? { websiteUri: place.websiteUri } : {}),
          name,
          placeId: id,
          types: place.types ?? [],
        },
      ];
    });

    const resultPlaces =
      places.length > 0 ||
      body.searchKind === "venue" ||
      body.searchKind === "place"
        ? places
        : generateFallbackPlaces(area, body.what, body.filters);
    const enrichedPlaces = await enrichPlacesWithApprovedSpotMedia(
      db,
      resultPlaces
    );

    await placeSearchCache.put(cacheKey, {
      expiresAt: Date.now() + 1000 * 60 * 60,
      places: enrichedPlaces,
    });
    return { places: enrichedPlaces };
  } catch {
    if (body.searchKind === "venue" || body.searchKind === "place") {
      return { places: [], reason: "unavailable" as const };
    }
    const fallback = generateFallbackPlaces(area, body.what, body.filters);
    return { places: fallback };
  }
};

const publicVenueStatuses = ["claimed", "live", "verified"] as const;

const publicVenueLocationFields = [
  "address",
  "discovery_place_id",
  "handle",
  "id",
  "latitude",
  "longitude",
  "name",
  "phone",
  "status",
  "stripe_identity_status",
  "website_url",
] as const;

const toPublicSyncPlace = (location: {
  address: string | null;
  discovery_place_id: string | null;
  handle: string | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  phone: string | null;
  website_url: string | null;
}): PlaceSuggestion => ({
  ...(location.address ? { address: location.address } : {}),
  dataSource: "sync",
  ...(location.discovery_place_id
    ? {
        googleMapsUri: `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(location.discovery_place_id)}`,
      }
    : {}),
  ...(location.latitude !== null ? { latitude: location.latitude } : {}),
  ...(location.longitude !== null ? { longitude: location.longitude } : {}),
  name: location.name,
  ...(location.phone ? { phone: location.phone } : {}),
  placeId: location.discovery_place_id ?? `sync:${location.id}`,
  syncLocationId: location.id,
  types: ["sync_venue"],
  ...(location.website_url ? { websiteUri: location.website_url } : {}),
});

const listPublicSyncPlaces = async (
  db: Kysely<BlocksDatabase>,
  input: {
    area?: string;
    latitude?: number;
    longitude?: number;
    query?: string;
  } = {}
) => {
  const normalizedArea = input.area?.trim();
  const normalizedQuery = input.query?.trim();
  let locationQuery = db
    .selectFrom("venue_location")
    .select(publicVenueLocationFields)
    .where("status", "in", publicVenueStatuses)
    .where("stripe_identity_status", "=", "verified");

  if (normalizedQuery) {
    locationQuery = locationQuery.where((expression) =>
      expression.or([
        expression("name", "ilike", `%${normalizedQuery}%`),
        expression("address", "ilike", `%${normalizedQuery}%`),
      ])
    );
  }

  const { latitude } = input;
  const { longitude } = input;
  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  if (hasCoordinates) {
    locationQuery = locationQuery
      .where("latitude", ">=", latitude - 0.5)
      .where("latitude", "<=", latitude + 0.5)
      .where("longitude", ">=", longitude - 0.65)
      .where("longitude", "<=", longitude + 0.65);
  } else if (normalizedArea) {
    locationQuery = locationQuery.where((expression) =>
      expression.or([
        expression("name", "ilike", `%${normalizedArea}%`),
        expression("address", "ilike", `%${normalizedArea}%`),
      ])
    );
  }

  const locations = await locationQuery
    .orderBy("name", "asc")
    .limit(100)
    .execute();

  return locations.map((location) =>
    toPublicSyncPlace({
      address: location.address,
      discovery_place_id: location.discovery_place_id,
      handle: location.handle,
      id: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      phone: location.phone,
      website_url: location.website_url,
    })
  );
};

const searchPublicSpots = async (input: unknown) => {
  const body = publicSpotSearchInputSchema.parse(input);
  const db = await getDb();
  const area = body.area?.trim() ?? "";
  const query = body.query?.trim();
  const syncPlaces = await listPublicSyncPlaces(db, {
    area,
    latitude: body.latitude,
    longitude: body.longitude,
    query,
  });
  const hasCoordinates =
    body.latitude !== undefined && body.longitude !== undefined;
  const cacheKey = JSON.stringify({
    area: area.toLowerCase(),
    category: body.category,
    latitude: body.latitude,
    longitude: body.longitude,
    query,
    scope: "public",
  });
  const cached = await placeSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      places: await enrichPlacesWithApprovedSpotMedia(db, cached.places),
    };
  }

  const googlePlaces =
    query || hasCoordinates
      ? await requestGooglePlaces(
          {
            area,
            filters: query ? [query] : [],
            latitude:
              body.latitude !== undefined ? String(body.latitude) : undefined,
            longitude:
              body.longitude !== undefined ? String(body.longitude) : undefined,
            searchKind: "place",
            what:
              body.category === "all"
                ? ["eat", "drink", "play"]
                : [body.category],
          },
          area
        )
      : { places: [] as PlaceSuggestion[] };
  const syncByDiscoveryId = new Map(
    syncPlaces.map((place) => [place.placeId, place] as const)
  );
  const mergedPlaces = new Map<string, PlaceSuggestion>();
  for (const place of syncPlaces) {
    mergedPlaces.set(place.placeId, place);
  }
  for (const place of googlePlaces.places) {
    const syncPlace = syncByDiscoveryId.get(place.placeId);
    mergedPlaces.set(
      place.placeId,
      syncPlace
        ? {
            ...place,
            dataSource: "sync",
            syncLocationId: syncPlace.syncLocationId,
          }
        : place
    );
  }

  const places = await enrichPlacesWithApprovedSpotMedia(
    db,
    Array.from(mergedPlaces.values())
  );
  await placeSearchCache.put(cacheKey, {
    expiresAt: Date.now() + 1000 * 60 * 15,
    places,
  });
  return {
    places,
    ...(googlePlaces.reason && places.length === 0
      ? { reason: googlePlaces.reason }
      : {}),
  };
};

const getPublicSpotDetails = async (
  input: string
): Promise<PublicSpotDetails> => {
  const spotId = z.string().trim().min(1).max(300).parse(input);
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select(publicVenueLocationFields)
    .where("status", "in", publicVenueStatuses)
    .where("stripe_identity_status", "=", "verified")
    .where((expression) =>
      expression.or([
        expression("id", "=", spotId),
        expression("handle", "=", spotId),
        expression("discovery_place_id", "=", spotId),
      ])
    )
    .executeTakeFirst();

  if (location) {
    const syncSummary = await getVenuePublicSummary(location.id);
    const googlePlace = location.discovery_place_id
      ? await getGooglePlaceDetails(location.discovery_place_id)
      : null;
    const place = googlePlace
      ? {
          ...googlePlace,
          dataSource: "sync" as const,
          syncLocationId: location.id,
        }
      : toPublicSyncPlace({
          address: location.address,
          discovery_place_id: location.discovery_place_id,
          handle: location.handle,
          id: location.id,
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          phone: location.phone,
          website_url: location.website_url,
        });
    return { place, source: "sync", syncSummary };
  }

  const place = await getGooglePlaceDetails(spotId);
  if (!place) throw new Error("Spot details are unavailable");
  return { place, source: "google" };
};

const getPublicSpotMenu = async (
  input: string
): Promise<PublicSpotMenuResponse> => {
  const details = await getPublicSpotDetails(input);
  if (details.source === "sync") {
    return {
      menu: null,
      place: details.place,
      source: details.source,
      syncSummary: details.syncSummary,
    };
  }
  if (!details.place.websiteUri) {
    return {
      menu: null,
      place: details.place,
      reason: "unavailable",
      source: details.source,
    };
  }

  const result = await previewVenueMenu({ url: details.place.websiteUri });
  return {
    menu: result.preview,
    place: details.place,
    ...(result.reason ? { reason: result.reason } : {}),
    source: details.source,
  };
};

const getPlacePhoto = async (
  photoName: string
): Promise<PlacePhotoResponse> => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey || !photoName.startsWith("places/")) {
    throw new Error("Place photo is unavailable");
  }
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=960`,
    { headers: { "x-goog-api-key": apiKey }, redirect: "follow" }
  );
  if (!response.ok) throw new Error("Place photo is unavailable");
  const bytes = await response.arrayBuffer();
  return {
    contentType: response.headers.get("content-type") ?? "image/jpeg",
    data: Buffer.from(bytes).toString("base64"),
  };
};

const enrichPlacesWithApprovedSpotMedia = async (
  db: Kysely<BlocksDatabase>,
  places: PlaceSuggestion[]
): Promise<PlaceSuggestion[]> => {
  const placeIds = places.map((place) => place.placeId);
  if (placeIds.length === 0) return places;

  const mediaRows = await db
    .selectFrom("spot_contribution")
    .innerJoin("date_media", "date_media.id", "spot_contribution.date_media_id")
    .select([
      "date_media.url",
      "spot_contribution.google_place_id as googlePlaceId",
      "spot_contribution.kind",
    ])
    .where("spot_contribution.google_place_id", "in", placeIds)
    .where("spot_contribution.status", "=", "approved")
    .where("spot_contribution.kind", "in", ["menu_photo", "spot_photo"])
    .orderBy("date_media.created_at", "asc")
    .execute();

  const mediaByPlace = new Map<
    string,
    { communityPhotoUrl?: string; menuPhotoUrl?: string }
  >();
  for (const row of mediaRows) {
    const current = mediaByPlace.get(row.googlePlaceId) ?? {};
    const url = (await mintStoredMediaUrl(row.url)) ?? row.url;
    if (row.kind === "spot_photo" && !current.communityPhotoUrl) {
      current.communityPhotoUrl = url;
    }
    if (row.kind === "menu_photo" && !current.menuPhotoUrl) {
      current.menuPhotoUrl = url;
    }
    mediaByPlace.set(row.googlePlaceId, current);
  }

  return places.map((place) => {
    const media = mediaByPlace.get(place.placeId);
    return media ? { ...place, ...media } : place;
  });
};

const getOwnedRequest = async (requestId: string, userId: string) => {
  const db = await getDb();
  const request = await db
    .selectFrom("date_request")
    .selectAll()
    .where("id", "=", requestId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!request) throw new Error("Date request not found");
  return request;
};

const getSpotCaptureRewardCents = async () => {
  try {
    return await spotCaptureRewardSetting.get();
  } catch {
    return 500;
  }
};

const getSpotCaptureOffer = async (
  sessionUser: SessionUser,
  input: unknown
): Promise<{ offer: SpotCaptureOffer }> => {
  const body = spotCaptureOfferSchema.parse(input);
  await getOwnedRequest(body.dateRequestId, sessionUser.id);
  const db = await getDb();
  const requestedPlace = await db
    .selectFrom("date_request_place")
    .select("place_id")
    .where("request_id", "=", body.dateRequestId)
    .where("place_id", "=", body.googlePlaceId)
    .executeTakeFirst();
  if (!requestedPlace) throw new Error("Spot is not part of this date request");

  const location = await db
    .selectFrom("venue_location")
    .select("id")
    .where("discovery_place_id", "=", body.googlePlaceId)
    .executeTakeFirst();
  const [
    venuePhoto,
    venueMenu,
    publishedMenuItem,
    approvedContributions,
    pendingContributions,
  ] = await Promise.all([
    location
      ? db
          .selectFrom("venue_media")
          .select("id")
          .where("location_id", "=", location.id)
          .where("kind", "in", ["venue_photo", "venue_profile_photo"])
          .where("status", "=", "approved")
          .executeTakeFirst()
      : undefined,
    location
      ? db
          .selectFrom("venue_menu")
          .select("id")
          .where("location_id", "=", location.id)
          .where("status", "in", ["published", "approved"])
          .executeTakeFirst()
      : undefined,
    location
      ? db
          .selectFrom("venue_menu_item")
          .select("id")
          .where("location_id", "=", location.id)
          .where("status", "=", "published")
          .executeTakeFirst()
      : undefined,
    db
      .selectFrom("spot_contribution")
      .select("kind")
      .where("google_place_id", "=", body.googlePlaceId)
      .where("status", "=", "approved")
      .execute(),
    db
      .selectFrom("spot_contribution")
      .select("kind")
      .where("date_request_id", "=", body.dateRequestId)
      .where("google_place_id", "=", body.googlePlaceId)
      .where("submitted_by_user_id", "=", sessionUser.id)
      .where("status", "=", "pending")
      .execute(),
  ]);

  const hasApprovedContribution = (kind: SpotCaptureOffer["missing"][number]) =>
    approvedContributions.some((contribution) => contribution.kind === kind);
  const missing: SpotCaptureOffer["missing"] = [];
  if (!venuePhoto && !hasApprovedContribution("spot_photo")) {
    missing.push("spot_photo");
  }
  if (
    !venueMenu &&
    !publishedMenuItem &&
    !hasApprovedContribution("menu_photo")
  ) {
    missing.push("menu_photo");
  }
  const pending = pendingContributions
    .map((contribution) => contribution.kind)
    .filter((kind): kind is SpotCaptureOffer["missing"][number] =>
      missing.includes(kind as SpotCaptureOffer["missing"][number])
    );
  const availableMissing = missing.filter((kind) => !pending.includes(kind));

  return {
    offer: {
      googlePlaceId: body.googlePlaceId,
      missing,
      pending,
      rewardCents: await getSpotCaptureRewardCents(),
      status:
        missing.length === 0
          ? "complete"
          : availableMissing.length === 0
            ? "pending_review"
            : "available",
    },
  };
};

const toSpotContribution = (contribution: {
  created_at: Date | string;
  date_media_id: string;
  date_request_id: string;
  google_place_id: string;
  id: string;
  kind: string;
  reward_cents: number;
  reward_points: number;
  reward_status: string;
  status: string;
}): SpotContributionResponse => ({
  createdAt: new Date(contribution.created_at).toISOString(),
  dateMediaId: contribution.date_media_id,
  dateRequestId: contribution.date_request_id,
  googlePlaceId: contribution.google_place_id,
  id: contribution.id,
  kind: contribution.kind as SpotContributionResponse["kind"],
  rewardCents: contribution.reward_cents,
  rewardPoints: contribution.reward_points,
  rewardStatus: contribution.reward_status === "paid" ? "paid" : "pending",
  status: contribution.status as SpotContributionResponse["status"],
});

const listSpotContributions = async (sessionUser: SessionUser) => {
  requireAdmin(sessionUser);
  const db = await getDb();
  const contributions = await db
    .selectFrom("spot_contribution")
    .innerJoin("date_media", "date_media.id", "spot_contribution.date_media_id")
    .innerJoin("user", "user.id", "spot_contribution.submitted_by_user_id")
    .select([
      "date_media.url as mediaUrl",
      "spot_contribution.created_at",
      "spot_contribution.date_media_id",
      "spot_contribution.date_request_id",
      "spot_contribution.google_place_id",
      "spot_contribution.id",
      "spot_contribution.kind",
      "spot_contribution.reward_cents",
      "spot_contribution.reward_points",
      "spot_contribution.reward_status",
      "spot_contribution.status",
      "user.name as submitterName",
    ])
    .where("spot_contribution.status", "=", "pending")
    .orderBy("spot_contribution.created_at", "asc")
    .limit(100)
    .execute();

  return {
    contributions: await Promise.all(
      contributions.map(async (contribution) => ({
        ...toSpotContribution(contribution),
        mediaUrl:
          (await mintStoredMediaUrl(contribution.mediaUrl)) ??
          contribution.mediaUrl,
        submitterName: contribution.submitterName,
      }))
    ),
  };
};

const reviewSpotContribution = async (
  sessionUser: SessionUser,
  input: unknown
) => {
  requireAdmin(sessionUser);
  const body = spotContributionReviewSchema.parse(input);
  const db = await getDb();
  const contribution = await db
    .updateTable("spot_contribution")
    .set({
      reviewed_at: new Date(),
      status: body.status,
    })
    .where("id", "=", body.contributionId)
    .where("status", "=", "pending")
    .returningAll()
    .executeTakeFirst();
  if (!contribution) throw new Error("Pending spot contribution not found");
  return { contribution: toSpotContribution(contribution) };
};

const getParticipantRequest = async (requestId: string, userId: string) => {
  const db = await getDb();
  const request = await db
    .selectFrom("date_request")
    .leftJoin("date_match", "date_match.request_id", "date_request.id")
    .selectAll("date_request")
    .where("date_request.id", "=", requestId)
    .where((expression) =>
      expression.or([
        expression("date_request.user_id", "=", userId),
        expression("date_match.user_id", "=", userId),
      ])
    )
    .executeTakeFirst();
  if (!request) throw new Error("Date request not found");
  return request;
};

const toReview = (review: {
  completed_at: Date | string | null;
  date_request_id: string;
  id: string;
  person_comment: string | null;
  person_criteria: Record<string, number>;
  person_rating: number | null;
  place_comment: string | null;
  place_criteria: Record<string, number>;
  place_rating: number | null;
  required: boolean;
  user_id: string;
}): ReviewResponse => ({
  completedAt: toIso(review.completed_at),
  dateRequestId: review.date_request_id,
  id: review.id,
  mediaIds: [],
  personComment: review.person_comment ?? undefined,
  personCriteria: review.person_criteria,
  personRating: review.person_rating ?? 0,
  placeComment: review.place_comment ?? undefined,
  placeCriteria: review.place_criteria,
  placeRating: review.place_rating ?? 0,
  required: review.required,
  userId: review.user_id,
});

const getReviewPrompt = async (
  requestId: string,
  userId: string
): Promise<ReviewPromptResponse> => {
  const db = await getDb();
  const request = await getOwnedRequest(requestId, userId);
  const [review, places, people] = await Promise.all([
    db
      .selectFrom("date_review")
      .selectAll()
      .where("date_request_id", "=", requestId)
      .where("user_id", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("date_request_place")
      .selectAll()
      .where("request_id", "=", requestId)
      .execute(),
    db
      .selectFrom("date_match")
      .select([
        "user_id as id",
        "display_name as name",
        "profile_photo_url as photoUrl",
      ])
      .where("request_id", "=", requestId)
      .where("status", "in", ["accepted", "friended"])
      .execute(),
  ]);
  return {
    existingReview: review ? toReview(review) : null,
    people: people.map((person) => ({
      id: person.id,
      name: person.name,
      photoUrl: person.photoUrl,
    })),
    places: places.map((place) => ({
      address: place.address ?? undefined,
      name: place.name,
      placeId: place.place_id,
      rating: place.rating ?? undefined,
      types: place.types,
    })),
    request: {
      id: request.id,
      searchArea: request.search_area,
      status: request.status,
    },
  };
};

const submitReview = async (
  requestId: string,
  userId: string,
  input: unknown
) => {
  const body = reviewInputSchema.parse(input);
  await getOwnedRequest(requestId, userId);
  const db = await getDb();
  const existing = await db
    .selectFrom("date_review")
    .select("id")
    .where("date_request_id", "=", requestId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  const reviewId = existing?.id ?? crypto.randomUUID();
  const now = new Date();
  const contributionDelta = Math.min(
    10,
    1 +
      ((body.personComment?.trim().length ?? 0) >= 80 ? 2 : 0) +
      ((body.placeComment?.trim().length ?? 0) >= 80 ? 2 : 0) +
      Math.min(4, Object.keys(body.personCriteria).length) +
      Math.min(4, body.mediaIds.length * 2)
  );
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("date_review")
      .values({
        completed_at: now,
        date_request_id: requestId,
        id: reviewId,
        person_comment: body.personComment ?? null,
        person_criteria: jsonb(body.personCriteria),
        person_rating: body.personRating,
        place_comment: body.placeComment ?? null,
        place_criteria: jsonb(body.placeCriteria),
        place_rating: body.placeRating,
        required: false,
        user_id: userId,
      })
      .onConflict((conflict) =>
        conflict.columns(["date_request_id", "user_id"]).doUpdateSet({
          completed_at: now,
          person_comment: body.personComment ?? null,
          person_criteria: jsonb(body.personCriteria),
          person_rating: body.personRating,
          place_comment: body.placeComment ?? null,
          place_criteria: jsonb(body.placeCriteria),
          place_rating: body.placeRating,
          required: false,
        })
      )
      .execute();
    if (!existing) {
      await tx
        .updateTable("profile")
        .set((expression) => ({
          contribution_score: expression(
            "contribution_score",
            "+",
            contributionDelta
          ),
        }))
        .where("user_id", "=", userId)
        .execute();
    }
    const reviewedMatch = await tx
      .selectFrom("date_match")
      .select("user_id")
      .where("request_id", "=", requestId)
      .where("user_id", "!=", userId)
      .executeTakeFirst();
    if (reviewedMatch) {
      const reviewedProfile = await tx
        .selectFrom("profile")
        .select(["reliability_score"])
        .where("user_id", "=", reviewedMatch.user_id)
        .executeTakeFirst();
      if (reviewedProfile) {
        await tx
          .updateTable("profile")
          .set({
            reliability_score: adjustReliabilityScore(
              reviewedProfile.reliability_score,
              body.personRating
            ),
          })
          .where("user_id", "=", reviewedMatch.user_id)
          .execute();
      }
    }
    if (body.mediaIds.length) {
      const media = await tx
        .selectFrom("date_media")
        .select("id")
        .where("date_request_id", "=", requestId)
        .where("uploaded_by_user_id", "=", userId)
        .where("id", "in", body.mediaIds)
        .execute();
      if (media.length)
        await tx
          .insertInto("date_review_media")
          .values(
            media.map((item) => ({
              date_media_id: item.id,
              review_id: reviewId,
            }))
          )
          .onConflict((conflict) =>
            conflict.columns(["review_id", "date_media_id"]).doNothing()
          )
          .execute();
    }
    const remaining = await tx
      .selectFrom("date_review")
      .select("id")
      .where("date_request_id", "=", requestId)
      .where("required", "=", true)
      .where("completed_at", "is", null)
      .execute();
    if (remaining.length === 0) {
      await tx
        .updateTable("date_request")
        .set({ status: "completed", updated_at: now })
        .where("id", "=", requestId)
        .execute();
      const acceptedMatch = await tx
        .selectFrom("date_match")
        .select(["user_id"])
        .where("request_id", "=", requestId)
        .where("status", "=", "accepted")
        .executeTakeFirst();
      if (acceptedMatch) {
        const request = await tx
          .selectFrom("date_request")
          .select("user_id")
          .where("id", "=", requestId)
          .executeTakeFirstOrThrow();
        await ensureAcceptedFriendship(
          tx,
          request.user_id,
          acceptedMatch.user_id,
          now
        );
      }
    }
  });
  const review = await db
    .selectFrom("date_review")
    .selectAll()
    .where("id", "=", reviewId)
    .executeTakeFirstOrThrow();
  await createNotification({
    body: "Your review is saved. Thanks for keeping Chewbuu honest.",
    dedupeKey: `date-request:${requestId}:review-complete:${userId}`,
    entityId: requestId,
    entityType: "date_request",
    kind: "review_saved",
    title: "Review saved",
    userId,
  });
  return { review: toReview(review) };
};

const defaultPlans = [
  {
    active: true,
    annualPriceCents: 0,
    annualStripePriceId: "",
    cta: "Keep Social",
    description: "Solo dates, Dutch by default, and two booked dates per day.",
    features: ["Solo dating"],
    id: "plan-social",
    monthlyPriceCents: 0,
    name: "Social",
    sortOrder: 0,
    stats: ["Free"],
    stripePriceId: "",
    tier: "social",
  },
  {
    active: true,
    annualPriceCents: 19_000,
    annualStripePriceId: "",
    cta: "Unlock Mingle",
    description: "Bring friends, build circles, and match with other parties.",
    features: ["Group dates", "Friend invites"],
    id: "plan-mingle",
    monthlyPriceCents: 1900,
    name: "Mingle",
    sortOrder: 1,
    stats: ["Groups"],
    stripePriceId: "",
    tier: "mingle",
  },
  {
    active: true,
    annualPriceCents: 39_000,
    annualStripePriceId: "",
    cta: "Go Sugar",
    description:
      "Cover dates, request premium matches, and unlock every social mode.",
    features: ["Requester-covers dates", "All Mingle features"],
    id: "plan-sugar",
    monthlyPriceCents: 3900,
    name: "Sugar",
    sortOrder: 2,
    stats: ["Highest tier"],
    stripePriceId: "",
    tier: "sugar",
  },
] as const;

type StoredPlan = {
  active: boolean;
  annual_price_cents: number;
  annual_stripe_price_id: string | null;
  cta: string;
  description: string;
  features: string[];
  id: string;
  monthly_price_cents: number;
  name: string;
  sort_order: number;
  stats: string[];
  stripe_price_id: string | null;
  tier: string;
};

const mapPlan = (plan: StoredPlan): MembershipPlan => ({
  active: plan.active,
  annualPriceCents: plan.annual_price_cents,
  annualStripePriceId: plan.annual_stripe_price_id ?? "",
  cta: plan.cta,
  description: plan.description,
  features: plan.features,
  id: plan.id,
  monthlyPriceCents: plan.monthly_price_cents,
  name: plan.name,
  sortOrder: plan.sort_order,
  stats: plan.stats,
  stripePriceId: plan.stripe_price_id ?? "",
  tier: plan.tier as MembershipPlan["tier"],
});

const getPricingPlans = async () => {
  const db = await getDb();
  let plans = await db
    .selectFrom("membership_plan")
    .selectAll()
    .where("active", "=", true)
    .orderBy("sort_order", "asc")
    .execute();
  if (!plans.length) {
    await seedPricingPlans();
    plans = await db
      .selectFrom("membership_plan")
      .selectAll()
      .where("active", "=", true)
      .orderBy("sort_order", "asc")
      .execute();
  }
  return { plans: plans.map(mapPlan) };
};

const requireAdmin = (sessionUser: SessionUser) => {
  if (!isConfiguredAdmin(sessionUser)) {
    throw new Error("Administrator access required");
  }
};

const getSpotCaptureRewardConfig =
  async (): Promise<SpotCaptureRewardConfig> => ({
    rewardCents: await getSpotCaptureRewardCents(),
  });

const updateSpotCaptureRewardConfig = async (
  sessionUser: SessionUser,
  input: unknown
) => {
  requireAdmin(sessionUser);
  const body = spotCaptureRewardConfigSchema.parse(input);
  await spotCaptureRewardSetting.put(body.rewardCents);
  return getSpotCaptureRewardConfig();
};

const readStripeConnectSecret = async (setting: AppSetting<string>) => {
  try {
    const value = await setting.get();
    return value || null;
  } catch {
    return null;
  }
};

const getStripeIdentitySecret = async () =>
  process.env.STRIPE_SECRET_KEY ??
  (await readStripeConnectSecret(stripeConnectSecretKey));

const createIdentitySession = async (
  sessionUser: SessionUser
): Promise<IdentityVerificationSession> => {
  const stripeSecretKey = await getStripeIdentitySecret();
  if (!stripeSecretKey) {
    throw new Error(
      "Stripe Identity is not configured. Add a server-side Stripe key with Identity permissions."
    );
  }
  return createIdentityVerificationSession(
    sessionUser.id,
    sessionUser.email,
    stripeSecretKey,
    `${venueAppUrl}/onboarding?verification=complete#identity`
  );
};

const loadIdentityStatus = async (
  sessionUser: SessionUser
): Promise<IdentityVerificationSession> => {
  const stripeSecretKey = await getStripeIdentitySecret();
  if (!stripeSecretKey) {
    throw new Error(
      "Stripe Identity is not configured. Add a server-side Stripe key with Identity permissions."
    );
  }
  return getIdentityVerificationStatus(sessionUser.id, stripeSecretKey);
};

const createVenueIdentitySession = async (
  sessionUser: SessionUser,
  input: unknown
): Promise<VenueIdentityVerificationSession> => {
  const { locationId } = z
    .object({ locationId: z.string().min(1) })
    .parse(input);
  const stripeSecretKey = await getStripeIdentitySecret();
  if (!stripeSecretKey) {
    throw new Error(
      "Stripe Identity is not configured. Add a server-side Stripe key with Identity permissions."
    );
  }
  const returnUrl = `${venueAppUrl}/venue-portal?verification=complete&locationId=${encodeURIComponent(locationId)}`;
  return createVenueIdentityVerificationSession(
    sessionUser.id,
    locationId,
    isConfiguredAdmin(sessionUser),
    stripeSecretKey,
    returnUrl,
    sessionUser.email
  );
};

const loadVenueIdentityStatus = async (
  sessionUser: SessionUser,
  locationId: string
): Promise<VenueIdentityVerificationSession> => {
  const stripeSecretKey = await getStripeIdentitySecret();
  if (!stripeSecretKey) {
    throw new Error(
      "Stripe Identity is not configured. Add a server-side Stripe key with Identity permissions."
    );
  }
  return getVenueIdentityVerificationStatus(
    sessionUser.id,
    locationId,
    isConfiguredAdmin(sessionUser),
    stripeSecretKey
  );
};

const getStripeConnectStatus = async (
  sessionUser: SessionUser
): Promise<StripeConnectStatus> => {
  requireAdmin(sessionUser);
  const [secretKey, webhookSecret] = await Promise.all([
    process.env.STRIPE_SECRET_KEY ??
      readStripeConnectSecret(stripeConnectSecretKey),
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET ??
      readStripeConnectSecret(stripeConnectWebhookSecret),
  ]);
  if (!secretKey) {
    return {
      accountId: null,
      configured: false,
      keyLast4: null,
      mode: null,
      webhookConfigured: Boolean(webhookSecret),
    };
  }
  const stripeClient = createStripeClient(secretKey);
  await stripeClient.balance.retrieve();
  return {
    accountId: null,
    configured: true,
    keyLast4: secretKey.slice(-4),
    mode: secretKey.includes("_live_") ? "live" : "test",
    webhookConfigured: Boolean(webhookSecret),
  };
};

const getAccountEntitlements = async (
  sessionUser: SessionUser
): Promise<AccountEntitlementsResponse> => {
  const db = await getDb();
  const [user, membership, organizations, legacySync] = await Promise.all([
    db
      .selectFrom("user")
      .select("membership_tier")
      .where("id", "=", sessionUser.id)
      .executeTakeFirst(),
    db
      .selectFrom("subscription")
      .select(["plan", "status"])
      .where("reference_id", "=", sessionUser.id)
      .where("status", "in", ["active", "trialing"])
      .orderBy("created_at", "desc")
      .executeTakeFirst(),
    db
      .selectFrom("member")
      .select("organization_id")
      .where("user_id", "=", sessionUser.id)
      .execute(),
    db
      .selectFrom("sync_subscription")
      .select(["plan", "status"])
      .where("user_id", "=", sessionUser.id)
      .where("status", "in", ["active", "trialing"])
      .orderBy("created_at", "desc")
      .executeTakeFirst(),
  ]);
  const organizationIds = organizations.map(
    (organization) => organization.organization_id
  );
  const organizationSync = organizationIds.length
    ? await db
        .selectFrom("subscription")
        .select(["plan", "status"])
        .where("reference_id", "in", organizationIds)
        .where("plan", "=", "sync")
        .where("status", "in", ["active", "trialing"])
        .orderBy("created_at", "desc")
        .executeTakeFirst()
    : undefined;
  const sync = organizationSync ?? legacySync;
  return {
    isAdmin: isConfiguredAdmin(sessionUser),
    membership: {
      plan: membership?.plan ?? user?.membership_tier ?? "social",
      status: membership?.status ?? "inactive",
    },
    sync: {
      plan: sync?.plan ?? "sync",
      status: sync?.status ?? "inactive",
    },
  };
};

const seedPricingPlans = async () => {
  const db = await getDb();
  for (const plan of defaultPlans) {
    await db
      .insertInto("membership_plan")
      .values({
        active: plan.active,
        annual_price_cents: plan.annualPriceCents,
        annual_stripe_price_id: plan.annualStripePriceId || null,
        created_at: new Date(),
        cta: plan.cta,
        description: plan.description,
        features: jsonb([...plan.features]),
        id: plan.id,
        monthly_price_cents: plan.monthlyPriceCents,
        name: plan.name,
        sort_order: plan.sortOrder,
        stats: jsonb([...plan.stats]),
        stripe_currency: "usd",
        stripe_mode: null,
        stripe_price_id: plan.stripePriceId || null,
        stripe_product_id: null,
        stripe_sync_status: "pending",
        stripe_synced_at: null,
        tier: plan.tier,
        updated_at: new Date(),
      })
      .onConflict((conflict) =>
        conflict.column("tier").doUpdateSet({
          active: plan.active,
          annual_price_cents: plan.annualPriceCents,
          cta: plan.cta,
          description: plan.description,
          features: jsonb([...plan.features]),
          monthly_price_cents: plan.monthlyPriceCents,
          name: plan.name,
          sort_order: plan.sortOrder,
          stats: jsonb([...plan.stats]),
          updated_at: new Date(),
        })
      )
      .execute();
  }
  const plans = await db
    .selectFrom("membership_plan")
    .selectAll()
    .where("active", "=", true)
    .orderBy("sort_order", "asc")
    .execute();
  return { plans: plans.map(mapPlan) };
};

const updatePricingPlans = async (sessionUser: SessionUser, input: unknown) => {
  requireAdmin(sessionUser);
  const body = z
    .object({ plans: z.array(membershipPlanSchema).min(1) })
    .parse(input);
  const db = await getDb();
  for (const plan of body.plans) {
    await db
      .insertInto("membership_plan")
      .values({
        active: plan.active,
        annual_price_cents: plan.annualPriceCents,
        annual_stripe_price_id: plan.annualStripePriceId || null,
        created_at: new Date(),
        cta: plan.cta,
        description: plan.description,
        features: jsonb(plan.features),
        id: plan.id,
        monthly_price_cents: plan.monthlyPriceCents,
        name: plan.name,
        sort_order: plan.sortOrder,
        stats: jsonb(plan.stats),
        stripe_currency: "usd",
        stripe_mode: null,
        stripe_price_id: plan.stripePriceId || null,
        stripe_product_id: null,
        stripe_sync_status: "pending",
        stripe_synced_at: null,
        tier: plan.tier,
        updated_at: new Date(),
      })
      .onConflict((conflict) =>
        conflict.column("tier").doUpdateSet({
          active: plan.active,
          annual_price_cents: plan.annualPriceCents,
          annual_stripe_price_id: plan.annualStripePriceId || null,
          cta: plan.cta,
          description: plan.description,
          features: jsonb(plan.features),
          monthly_price_cents: plan.monthlyPriceCents,
          name: plan.name,
          sort_order: plan.sortOrder,
          stats: jsonb(plan.stats),
          stripe_price_id: plan.stripePriceId || null,
          updated_at: new Date(),
        })
      )
      .execute();
  }
  return getPricingPlans();
};

const reconcileRecurringPrice = async (input: {
  currency: string;
  existingPrices: Stripe.Price[];
  interval: "month" | "year";
  lookupKey: string;
  planId: string;
  priceCents: number;
  productId: string;
  stripe: Stripe;
  tier: string;
}) => {
  const matchingPrice = input.existingPrices.find(
    (price) =>
      price.recurring?.interval === input.interval &&
      price.unit_amount === input.priceCents &&
      price.currency.toLowerCase() === input.currency &&
      (price.lookup_key === input.lookupKey ||
        price.metadata?.plan_id === input.planId)
  );
  if (matchingPrice?.active) return matchingPrice;
  if (matchingPrice) {
    await input.stripe.prices.update(matchingPrice.id, { active: true });
    return matchingPrice;
  }
  const previousLookupPrice = input.existingPrices.find(
    (price) => price.lookup_key === input.lookupKey
  );
  const newPrice = await input.stripe.prices.create(
    {
      currency: input.currency,
      lookup_key: input.lookupKey,
      metadata: {
        app: "chewbuu",
        interval: input.interval,
        plan_id: input.planId,
        tier: input.tier,
      },
      product: input.productId,
      recurring: { interval: input.interval },
      transfer_lookup_key: Boolean(previousLookupPrice),
      unit_amount: input.priceCents,
    },
    {
      idempotencyKey: stripeIdempotencyKey(
        "catalog-price",
        input.planId,
        input.interval,
        input.currency,
        String(input.priceCents)
      ),
    }
  );
  for (const price of input.existingPrices) {
    if (
      price.id !== newPrice.id &&
      price.recurring?.interval === input.interval &&
      price.active
    ) {
      await input.stripe.prices.update(price.id, { active: false });
    }
  }
  return newPrice;
};

const retrieveStripeProduct = async (stripe: Stripe, productId: string) => {
  try {
    const product = await stripe.products.retrieve(productId);
    return "deleted" in product && product.deleted ? null : product;
  } catch {
    return null;
  }
};

const syncPricingPlans = async (
  sessionUser: SessionUser
): Promise<SyncPricingPlansResponse> => {
  requireAdmin(sessionUser);
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    const current = await getPricingPlans();
    return {
      message: "Stripe is not configured: STRIPE_SECRET_KEY is missing.",
      plans: current.plans,
      stripeConfigured: false,
    };
  }

  const stripe = createStripeClient(stripeKey);
  const db = await getDb();
  let currentPlans = await db
    .selectFrom("membership_plan")
    .selectAll()
    .where("active", "=", true)
    .orderBy("sort_order", "asc")
    .execute();

  if (!currentPlans.length) {
    await seedPricingPlans();
    currentPlans = await db
      .selectFrom("membership_plan")
      .selectAll()
      .where("active", "=", true)
      .orderBy("sort_order", "asc")
      .execute();
  }

  const stripeMode = getStripeMode(stripeKey);
  const stripeProducts = await stripe.products.list({ limit: 100 });

  for (const plan of currentPlans) {
    if (plan.tier === "social" || plan.monthly_price_cents === 0) continue;
    const product =
      (plan.stripe_product_id
        ? await retrieveStripeProduct(stripe, plan.stripe_product_id)
        : undefined) ??
      stripeProducts.data.find(
        (candidate) =>
          candidate.metadata?.plan_id === plan.id ||
          candidate.metadata?.tier === plan.tier ||
          candidate.name.toLowerCase() === plan.name.toLowerCase() ||
          candidate.name.toLowerCase() === `chewbuu ${plan.name.toLowerCase()}`
      ) ??
      (await stripe.products.create(
        {
          description: plan.description,
          metadata: {
            app: "chewbuu",
            plan_id: plan.id,
            tier: plan.tier,
          },
          name: `Chewbuu ${plan.name}`,
        },
        { idempotencyKey: stripeIdempotencyKey("catalog-product", plan.id) }
      ));
    const existingPrices = await stripe.prices
      .list({ limit: 100, product: product.id })
      .then((response) => response.data);
    const monthlyPrice = await reconcileRecurringPrice({
      currency: plan.stripe_currency,
      existingPrices,
      interval: "month",
      lookupKey: `chewbuu_${plan.tier}_monthly_${stripeMode}`,
      planId: plan.id,
      priceCents: plan.monthly_price_cents,
      productId: product.id,
      stripe,
      tier: plan.tier,
    });
    const annualPrice =
      plan.annual_price_cents > 0
        ? await reconcileRecurringPrice({
            currency: plan.stripe_currency,
            existingPrices,
            interval: "year",
            lookupKey: `chewbuu_${plan.tier}_annual_${stripeMode}`,
            planId: plan.id,
            priceCents: plan.annual_price_cents,
            productId: product.id,
            stripe,
            tier: plan.tier,
          })
        : null;

    await db
      .updateTable("membership_plan")
      .set({
        annual_stripe_price_id: annualPrice?.id ?? null,
        stripe_mode: stripeMode,
        stripe_price_id: monthlyPrice.id,
        stripe_product_id: product.id,
        stripe_sync_status: "synced",
        stripe_synced_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", plan.id)
      .execute();
  }

  const syncPlan = await db
    .selectFrom("sync_plan")
    .selectAll()
    .where("active", "=", true)
    .where("code", "=", "sync_50")
    .executeTakeFirst();
  if (syncPlan) {
    const product =
      (syncPlan.stripe_product_id
        ? await retrieveStripeProduct(stripe, syncPlan.stripe_product_id)
        : undefined) ??
      stripeProducts.data.find(
        (candidate) =>
          candidate.metadata?.plan_id === syncPlan.id ||
          candidate.metadata?.plan_code === syncPlan.code
      ) ??
      (await stripe.products.create(
        {
          description: syncPlan.description,
          metadata: {
            app: "chewbuu",
            plan_code: syncPlan.code,
            plan_id: syncPlan.id,
          },
          name: syncPlan.name,
        },
        { idempotencyKey: stripeIdempotencyKey("catalog-product", syncPlan.id) }
      ));
    const existingPrices = await stripe.prices
      .list({ limit: 100, product: product.id })
      .then((response) => response.data);
    const monthlyPrice = await reconcileRecurringPrice({
      currency: syncPlan.stripe_currency,
      existingPrices,
      interval: "month",
      lookupKey: `chewbuu_sync_50_monthly_${stripeMode}`,
      planId: syncPlan.id,
      priceCents: syncPlan.monthly_price_cents,
      productId: product.id,
      stripe,
      tier: syncPlan.code,
    });
    await db
      .updateTable("sync_plan")
      .set({
        monthly_stripe_price_id: monthlyPrice.id,
        stripe_mode: stripeMode,
        stripe_product_id: product.id,
        stripe_sync_status: "synced",
        stripe_synced_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", syncPlan.id)
      .execute();
  }

  const updatedPlans = await db
    .selectFrom("membership_plan")
    .selectAll()
    .where("active", "=", true)
    .orderBy("sort_order", "asc")
    .execute();

  return {
    message:
      "Stripe catalog synchronized successfully, including Chewbuu Sync.",
    plans: updatedPlans.map(mapPlan),
    stripeConfigured: true,
  };
};

const checkIn = async (
  sessionUser: SessionUser,
  input: unknown
): Promise<CheckInResponse> => {
  const body = checkInSchema.parse(input);
  await getOwnedRequest(body.dateRequestId, sessionUser.id);
  const db = await getDb();
  await db
    .updateTable("date_request")
    .set({
      actual_start_at: new Date(),
      status: "checked_in",
      updated_at: new Date(),
    })
    .where("id", "=", body.dateRequestId)
    .where("user_id", "=", sessionUser.id)
    .execute();
  return {
    dateRequestId: body.dateRequestId,
    message: "Check-in confirmed! Enjoy your date.",
    success: true,
  };
};

const startDate = async (sessionUser: SessionUser, requestId: string) => {
  const request = await getParticipantRequest(requestId, sessionUser.id);
  if (request.status === "active") {
    if (!request.actual_start_at) {
      throw new Error("Active date has no start time");
    }
    return {
      actualStartAt: new Date(request.actual_start_at).toISOString(),
      dateRequestId: request.id,
      status: "active" as const,
    };
  }
  if (
    ["completed", "review_due", "cancelled", "declined"].includes(
      request.status
    )
  ) {
    throw new Error("Date request cannot be started");
  }

  const now = new Date();
  const db = await getDb();
  const [updated] = await db
    .updateTable("date_request")
    .set({ actual_start_at: now, status: "active", updated_at: now })
    .where("id", "=", request.id)
    .where("status", "=", request.status)
    .returning(["actual_start_at", "status"])
    .execute();
  if (!updated?.actual_start_at || updated.status !== "active") {
    throw new Error("Date request changed before it could start");
  }
  return {
    actualStartAt: new Date(updated.actual_start_at).toISOString(),
    dateRequestId: request.id,
    status: "active" as const,
  };
};

const completeDate = async (sessionUser: SessionUser, requestId: string) => {
  const db = await getDb();
  const request = await getOwnedRequest(requestId, sessionUser.id);
  if (request.status !== "checked_in") {
    throw new Error("Check in before completing the date.");
  }
  const now = new Date();
  await db.transaction().execute(async (tx) => {
    await tx
      .updateTable("date_request")
      .set({ actual_end_at: now, status: "review_due", updated_at: now })
      .where("id", "=", requestId)
      .where("user_id", "=", sessionUser.id)
      .execute();
    await tx
      .insertInto("date_review")
      .values({
        completed_at: null,
        date_request_id: requestId,
        id: crypto.randomUUID(),
        person_comment: null,
        person_criteria: jsonb({}),
        person_rating: null,
        place_comment: null,
        place_criteria: jsonb({}),
        place_rating: null,
        required: true,
        user_id: sessionUser.id,
      })
      .onConflict((conflict) =>
        conflict.columns(["date_request_id", "user_id"]).doNothing()
      )
      .execute();
    const acceptedMatch = await tx
      .selectFrom("date_match")
      .select("user_id")
      .where("request_id", "=", requestId)
      .where("status", "=", "accepted")
      .executeTakeFirst();
    if (acceptedMatch) {
      await ensureAcceptedFriendship(
        tx,
        request.user_id,
        acceptedMatch.user_id,
        now
      );
    }
  });
  await createNotification({
    body: "Complete your date review before booking another date.",
    dedupeKey: `date-request:${requestId}:review`,
    entityId: requestId,
    entityType: "date_request",
    kind: "review_due",
    title: "Your date review is ready",
    userId: sessionUser.id,
  });
  return { status: "review_due" };
};

const getFriendships = async (userId: string) => {
  const db = await getDb();
  const rows = await db
    .selectFrom("friendship")
    .selectAll()
    .where((expression) =>
      expression.or([
        expression("user_id", "=", userId),
        expression("friend_user_id", "=", userId),
      ])
    )
    .orderBy("created_at", "desc")
    .execute();
  return {
    friendships: rows.map((row) => ({
      acceptedAt: toIso(row.accepted_at),
      createdAt: new Date(row.created_at).toISOString(),
      friendUserId: row.friend_user_id,
      id: row.id,
      status: row.status,
      userId: row.user_id,
    })),
  };
};

const requestFriendship = async (userId: string, friendUserId: string) => {
  if (userId === friendUserId)
    throw new Error("You cannot add yourself as a friend");
  const db = await getDb();
  const target = await db
    .selectFrom("user")
    .select("id")
    .where("id", "=", friendUserId)
    .executeTakeFirst();
  if (!target) throw new Error("Friend user not found");
  const now = new Date();
  const [row] = await db
    .insertInto("friendship")
    .values({
      accepted_at: null,
      created_at: now,
      friend_user_id: friendUserId,
      id: crypto.randomUUID(),
      status: "pending",
      user_id: userId,
    })
    .onConflict((conflict) =>
      conflict
        .columns(["user_id", "friend_user_id"])
        .doUpdateSet({ status: "pending" })
    )
    .returningAll()
    .execute();
  if (!row) throw new Error("Could not create friendship");
  return {
    friendship: {
      acceptedAt: toIso(row.accepted_at),
      createdAt: new Date(row.created_at).toISOString(),
      friendUserId: row.friend_user_id,
      id: row.id,
      status: row.status,
      userId: row.user_id,
    },
  };
};

const createFriendInvite = async (userId: string, input: unknown) => {
  const body = z
    .object({
      email: z.string().trim().email().optional(),
      name: z.string().trim().max(120).optional(),
      phone: z.string().trim().max(40).optional(),
    })
    .refine((value) => Boolean(value.email || value.phone), {
      message: "Enter an email address or phone number.",
    })
    .parse(input);
  const db = await getDb();
  const [row] = await db
    .insertInto("friend_invite")
    .values({
      circle_id: null,
      created_at: new Date(),
      email: body.email ?? null,
      id: crypto.randomUUID(),
      invite_purpose: "friend_referral",
      invite_token: crypto.randomUUID(),
      name: body.name ?? null,
      phone: body.phone ?? null,
      relationship: "friend",
      status: "sent",
      user_id: userId,
    })
    .returningAll()
    .execute();
  if (!row) throw new Error("Could not create friend invite");
  return {
    invite: {
      email: row.email,
      id: row.id,
      name: row.name,
      phone: row.phone,
      status: row.status,
    },
  };
};

const respondFriendship = async (
  userId: string,
  friendshipId: string,
  status: "accepted" | "declined"
) => {
  const db = await getDb();
  const row = await db
    .selectFrom("friendship")
    .selectAll()
    .where("id", "=", friendshipId)
    .executeTakeFirst();
  if (!row || (row.friend_user_id !== userId && row.user_id !== userId))
    throw new Error("Friendship not found");
  const [updated] = await db
    .updateTable("friendship")
    .set({ accepted_at: status === "accepted" ? new Date() : null, status })
    .where("id", "=", friendshipId)
    .returningAll()
    .execute();
  if (!updated) throw new Error("Could not update friendship");
  return {
    friendship: {
      acceptedAt: toIso(updated.accepted_at),
      createdAt: new Date(updated.created_at).toISOString(),
      friendUserId: updated.friend_user_id,
      id: updated.id,
      status: updated.status,
      userId: updated.user_id,
    },
  };
};

type DateMediaRow = {
  created_at: Date | number | string;
  date_request_id: string;
  id: string;
  kind: string;
  thumbnail_url: string | null;
  uploaded_by_user_id: string;
  url: string;
};

const toDateMediaResponse = async (
  item: DateMediaRow
): Promise<DateMediaResponse> => ({
  createdAt: new Date(item.created_at).toISOString(),
  dateRequestId: item.date_request_id,
  id: item.id,
  kind: item.kind,
  thumbnailUrl: (await mintStoredMediaUrl(item.thumbnail_url)) ?? null,
  uploadedByUserId: item.uploaded_by_user_id,
  url: (await mintStoredMediaUrl(item.url)) ?? item.url,
});

const getRecapMedia = async (db: Kysely<BlocksDatabase>, recapId: string) => {
  const media = await db
    .selectFrom("recap_media")
    .innerJoin("date_media", "date_media.id", "recap_media.date_media_id")
    .selectAll("date_media")
    .where("recap_media.recap_id", "=", recapId)
    .orderBy("recap_media.created_at", "asc")
    .execute();
  return Promise.all(media.map(toDateMediaResponse));
};

const uploadDateMedia = async (sessionUser: SessionUser, input: unknown) => {
  const body = uploadDateMediaSchema.parse(input);
  await getOwnedRequest(body.dateRequestId, sessionUser.id);
  const db = await getDb();
  const now = new Date();
  const [media] = await db
    .insertInto("date_media")
    .values({
      created_at: now,
      date_request_id: body.dateRequestId,
      id: crypto.randomUUID(),
      kind: body.kind,
      thumbnail_url: body.thumbnailUrl ?? null,
      uploaded_by_user_id: sessionUser.id,
      url: body.url,
    })
    .returningAll()
    .execute();
  if (!media) throw new Error("Could not save date media");
  return {
    media: await toDateMediaResponse(media),
  };
};

const getDateMedia = async (sessionUser: SessionUser, requestId: string) => {
  await getOwnedRequest(requestId, sessionUser.id);
  const db = await getDb();
  const media = await db
    .selectFrom("date_media")
    .selectAll()
    .where("date_request_id", "=", requestId)
    .orderBy("created_at", "asc")
    .execute();
  return {
    media: await Promise.all(media.map(toDateMediaResponse)),
  };
};

const submitSpotContribution = async (
  sessionUser: SessionUser,
  input: unknown
) => {
  const body = spotContributionSchema.parse(input);
  await getOwnedRequest(body.dateRequestId, sessionUser.id);
  const db = await getDb();
  const media = await db
    .selectFrom("date_media")
    .select("id")
    .where("id", "=", body.dateMediaId)
    .where("date_request_id", "=", body.dateRequestId)
    .where("uploaded_by_user_id", "=", sessionUser.id)
    .executeTakeFirst();
  if (!media) throw new Error("Spot contribution media not found");

  const [created] = await db
    .insertInto("spot_contribution")
    .values({
      created_at: new Date(),
      date_media_id: body.dateMediaId,
      date_request_id: body.dateRequestId,
      google_place_id: body.googlePlaceId,
      id: crypto.randomUUID(),
      kind: body.kind,
      reward_cents: await getSpotCaptureRewardCents(),
      reward_points: 0,
      reward_status: "pending",
      reviewed_at: null,
      status: "pending",
      submitted_by_user_id: sessionUser.id,
    })
    .onConflict((conflict) =>
      conflict
        .columns([
          "submitted_by_user_id",
          "google_place_id",
          "kind",
          "date_media_id",
        ])
        .doNothing()
    )
    .returningAll()
    .execute();
  const contribution =
    created ??
    (await db
      .selectFrom("spot_contribution")
      .selectAll()
      .where("submitted_by_user_id", "=", sessionUser.id)
      .where("google_place_id", "=", body.googlePlaceId)
      .where("kind", "=", body.kind)
      .where("date_media_id", "=", body.dateMediaId)
      .executeTakeFirst());
  if (!contribution) throw new Error("Could not save spot contribution");
  return { contribution: toSpotContribution(contribution) };
};

const publishRecap = async (sessionUser: SessionUser, input: unknown) => {
  const body = publishRecapSchema.parse(input);
  await getOwnedRequest(body.dateRequestId, sessionUser.id);
  const db = await getDb();
  if (body.reviewId) {
    const review = await db
      .selectFrom("date_review")
      .select("id")
      .where("id", "=", body.reviewId)
      .where("date_request_id", "=", body.dateRequestId)
      .where("user_id", "=", sessionUser.id)
      .executeTakeFirst();
    if (!review) throw new Error("Review not found");
  }
  if (body.mediaIds) {
    const distinctMediaIds = new Set(body.mediaIds);
    if (distinctMediaIds.size !== body.mediaIds.length) {
      throw new Error("A recap cannot attach the same media twice.");
    }
    const media = await db
      .selectFrom("date_media")
      .select("id")
      .where("date_request_id", "=", body.dateRequestId)
      .where("id", "in", body.mediaIds)
      .execute();
    if (media.length !== distinctMediaIds.size) {
      throw new Error("One or more recap media items are invalid.");
    }
  }
  const now = new Date();
  const storyExpiresAt = body.storyHours
    ? new Date(now.getTime() + body.storyHours * 60 * 60 * 1000)
    : null;
  const recap = await db.transaction().execute(async (tx) => {
    const [savedRecap] = await tx
      .insertInto("recap")
      .values({
        author_user_id: sessionUser.id,
        caption: body.caption ?? null,
        created_at: now,
        date_request_id: body.dateRequestId,
        id: crypto.randomUUID(),
        published_at: now,
        review_id: body.reviewId ?? null,
        story_expires_at: storyExpiresAt,
        thumbnail_url: body.thumbnailUrl ?? null,
        video_url: body.videoUrl ?? null,
      })
      .onConflict((conflict) =>
        conflict.columns(["author_user_id", "date_request_id"]).doUpdateSet({
          caption: body.caption ?? null,
          published_at: now,
          review_id: body.reviewId ?? null,
          story_expires_at: storyExpiresAt,
          thumbnail_url: body.thumbnailUrl ?? null,
          video_url: body.videoUrl ?? null,
        })
      )
      .returningAll()
      .execute();
    if (!savedRecap) throw new Error("Could not publish recap");

    if (body.mediaIds) {
      await tx
        .deleteFrom("recap_media")
        .where("recap_id", "=", savedRecap.id)
        .execute();
      if (body.mediaIds.length > 0) {
        await tx
          .insertInto("recap_media")
          .values(
            body.mediaIds.map((dateMediaId) => ({
              created_at: now,
              date_media_id: dateMediaId,
              recap_id: savedRecap.id,
            }))
          )
          .execute();
      }
    }
    return savedRecap;
  });
  return {
    recap: {
      authorUserId: recap.author_user_id,
      caption: recap.caption ?? undefined,
      createdAt: new Date(recap.created_at).toISOString(),
      dateRequestId: recap.date_request_id,
      id: recap.id,
      media: await getRecapMedia(db, recap.id),
      publishedAt: toIso(recap.published_at),
      reviewId: recap.review_id ?? undefined,
      storyExpiresAt: toIso(recap.story_expires_at),
      storyHours: body.storyHours,
      thumbnailUrl: recap.thumbnail_url ?? undefined,
      videoUrl: recap.video_url ?? undefined,
    } satisfies RecapResponse,
  };
};

const getRecaps = async () => {
  const db = await getDb();
  const recaps = await db
    .selectFrom("recap")
    .selectAll()
    .where("published_at", "is not", null)
    .orderBy("created_at", "desc")
    .execute();
  return {
    recaps: await Promise.all(
      recaps.map(async (recap) => ({
        authorUserId: recap.author_user_id,
        caption: recap.caption ?? undefined,
        createdAt: new Date(recap.created_at).toISOString(),
        dateRequestId: recap.date_request_id,
        id: recap.id,
        media: await getRecapMedia(db, recap.id),
        publishedAt: toIso(recap.published_at),
        reviewId: recap.review_id ?? undefined,
        storyExpiresAt: toIso(recap.story_expires_at),
        thumbnailUrl: recap.thumbnail_url ?? undefined,
        videoUrl: recap.video_url ?? undefined,
      }))
    ),
  };
};

export const api = new ApiNamespace(scope, "api", (context) => ({
  async getDatingSummary() {
    return observeOperation("getDatingSummary", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return loadDatingSummary(sessionUser);
    });
  },

  async setDatingAvailability(input: { enabled: boolean }) {
    return observeOperation("setDatingAvailability", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return setDatingAvailability(sessionUser, input);
    });
  },

  async getPendingReviews() {
    const sessionUser = await requireSession(context.request.headers);
    return { reviews: await loadPendingReviews(sessionUser.id) };
  },

  async getNotifications() {
    const sessionUser = await requireSession(context.request.headers);
    return getNotifications(sessionUser.id);
  },

  async markNotificationsRead(notificationIds: string[]) {
    const sessionUser = await requireSession(context.request.headers);
    const ids = z.array(z.string().min(1)).max(100).parse(notificationIds);
    return markNotificationsRead(sessionUser.id, ids);
  },

  async subscribeNotifications() {
    const sessionUser = await requireSession(context.request.headers);
    return (await realtime.getChannel(
      "notifications",
      sessionUser.id
    )) as NotificationChannelClient;
  },

  async subscribeVenueEvents(locationId: string) {
    const sessionUser = await requireSession(context.request.headers);
    const normalizedLocationId = z.string().min(1).parse(locationId);
    const isAdmin = isConfiguredAdmin(sessionUser);
    if (!isAdmin) {
      const db = await getDb();
      const member = await db
        .selectFrom("member")
        .innerJoin(
          "venue_location",
          "venue_location.organization_id",
          "member.organization_id"
        )
        .select("member.id")
        .where("venue_location.id", "=", normalizedLocationId)
        .where("member.user_id", "=", sessionUser.id)
        .executeTakeFirst();
      if (!member) throw new Error("Venue access required");
    }
    return realtime.getChannel("venueEvents", normalizedLocationId);
  },

  async getProfile() {
    return observeOperation("getProfile", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return { profile: await loadProfile(sessionUser.id, sessionUser) };
    });
  },

  async createIdentityVerificationSession() {
    return observeOperation("createIdentityVerificationSession", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createIdentitySession(sessionUser);
    });
  },

  async getIdentityVerificationStatus() {
    return observeOperation("getIdentityVerificationStatus", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return loadIdentityStatus(sessionUser);
    });
  },

  async requestUsernameChange(input: { username: string }) {
    return observeOperation("requestUsernameChange", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const body = z
        .object({ username: z.string().trim().min(1) })
        .parse(input);
      return requestUsernameChange(
        sessionUser.id,
        body,
        async (email) => {
          await venueEmailJob.submit(email);
        },
        venueAppUrl
      );
    });
  },

  async getUsernameChangeStatus() {
    const sessionUser = await requireSession(context.request.headers);
    return getUsernameChangeStatus(sessionUser.id);
  },

  async verifyUsernameChange(token: string) {
    const parsedToken = z.string().trim().min(1).parse(token);
    return verifyUsernameChange(parsedToken, async (email) => {
      await venueEmailJob.submit(email);
    });
  },

  async listUsernameChangeRequests() {
    const sessionUser = await requireSession(context.request.headers);
    requireAdmin(sessionUser);
    return listUsernameChangeRequests();
  },

  async approveUsernameChange(input: { requestId: string }) {
    const sessionUser = await requireSession(context.request.headers);
    requireAdmin(sessionUser);
    const body = z.object({ requestId: z.string().min(1) }).parse(input);
    return approveUsernameChange(body.requestId, async (email) => {
      await venueEmailJob.submit(email);
    });
  },

  async saveProfile(input: unknown) {
    return observeOperation("saveProfile", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return saveProfile(sessionUser, input, false);
    });
  },

  async saveProfileDraft(input: unknown) {
    return observeOperation("saveProfileDraft", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const draft = profileDraftInputSchema.parse(input);
      const current = await loadProfile(sessionUser.id, sessionUser);
      return saveProfile(
        sessionUser,
        {
          ageRangeMax:
            draft.ageRangeMax !== undefined
              ? draft.ageRangeMax
              : current?.age_range_max,
          ageRangeMin:
            draft.ageRangeMin !== undefined
              ? draft.ageRangeMin
              : current?.age_range_min,
          area:
            draft.area !== undefined
              ? draft.area
              : (current?.area as string | null | undefined),
          bio:
            draft.bio !== undefined
              ? draft.bio
              : (current?.bio as string | null | undefined),
          birthday:
            draft.birthday !== undefined
              ? draft.birthday
              : (current?.birthday as string | null | undefined),
          datingModes:
            draft.datingModes !== undefined
              ? draft.datingModes
              : ((current?.dating_modes as string[] | undefined) ?? []),
          distanceMiles:
            draft.distanceMiles !== undefined
              ? draft.distanceMiles
              : ((current?.distance_miles as number | undefined) ?? 25),
          favoriteThings:
            draft.favoriteThings !== undefined
              ? draft.favoriteThings
              : ((current?.favorite_things as string[] | undefined) ?? []),
          favoritePlaces:
            draft.favoritePlaces !== undefined
              ? draft.favoritePlaces
              : ((current?.favoritePlaces as
                  | Record<string, unknown>
                  | undefined) ?? {}),
          friendInvites:
            draft.friendInvites !== undefined
              ? draft.friendInvites
              : (current?.friendInvites ?? []),
          height:
            draft.height !== undefined
              ? draft.height
              : (current?.height as string | null | undefined),
          interestDetails:
            draft.interestDetails !== undefined
              ? draft.interestDetails
              : ((current?.interest_details as
                  | Record<string, string[]>
                  | undefined) ?? {}),
          interestedIn:
            draft.interestedIn !== undefined
              ? draft.interestedIn
              : ((current?.interested_in as string[] | undefined) ?? []),
          interests:
            draft.interests !== undefined
              ? draft.interests
              : ((current?.interests as string[] | undefined) ?? []),
          kids:
            draft.kids !== undefined
              ? draft.kids
              : (current?.kids as string | null | undefined),
          latitude:
            draft.latitude !== undefined
              ? draft.latitude
              : (current?.latitude as string | null | undefined),
          lookingFor:
            draft.lookingFor !== undefined
              ? draft.lookingFor
              : ((current?.looking_for as string[] | undefined) ?? []),
          longitude:
            draft.longitude !== undefined
              ? draft.longitude
              : (current?.longitude as string | null | undefined),
          maritalStatus:
            draft.maritalStatus !== undefined
              ? draft.maritalStatus
              : (current?.marital_status as string | null | undefined),
          media:
            draft.media !== undefined ? draft.media : (current?.media ?? []),
          name:
            draft.name !== undefined
              ? draft.name
              : (current?.name as string | null | undefined),
          occupation:
            draft.occupation !== undefined
              ? draft.occupation
              : (current?.occupation as string | null | undefined),
          politics:
            draft.politics !== undefined
              ? draft.politics
              : (current?.politics as string | null | undefined),
          phone:
            draft.phone !== undefined
              ? draft.phone
              : (current?.phone as string | null | undefined),
          race:
            draft.race !== undefined
              ? draft.race
              : (current?.race as string | null | undefined),
          religion:
            draft.religion !== undefined
              ? draft.religion
              : (current?.religion as string | null | undefined),
          safetyOptIn:
            draft.safetyOptIn !== undefined
              ? draft.safetyOptIn
              : ((current?.safety_opt_in as boolean | undefined) ?? false),
          sex:
            draft.sex !== undefined
              ? draft.sex
              : (current?.sex as string | null | undefined),
          sexuality:
            draft.sexuality !== undefined
              ? draft.sexuality
              : (current?.sexuality as string | null | undefined),
          trustedContacts:
            draft.trustedContacts !== undefined
              ? draft.trustedContacts
              : (current?.trustedContacts ?? []),
          username:
            draft.username !== undefined
              ? draft.username
              : (current?.username as string | null | undefined),
          weight:
            draft.weight !== undefined
              ? draft.weight
              : (current?.weight as string | null | undefined),
          wantsKids:
            draft.wantsKids !== undefined
              ? draft.wantsKids
              : (current?.wants_kids as string | null | undefined),
        },
        true
      );
    });
  },

  async createDateRequest(input: unknown) {
    return observeOperation("createDateRequest", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createDateRequest(sessionUser, input);
    });
  },

  async getDateMeeting(requestId: string) {
    return observeOperation("getDateMeeting", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getDateMeeting(requestId, sessionUser);
    });
  },

  async getRooms() {
    return observeOperation("getRooms", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return {
        currentUserId: sessionUser.id,
        rooms: await loadRooms(sessionUser.id),
      };
    });
  },

  async getMessages(roomId: string) {
    return observeOperation("getMessages", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const db = await getDb();
      const room = await getOwnedRoom(roomId, sessionUser.id);
      const messages = await db
        .selectFrom("chat_message")
        .selectAll()
        .where("room_id", "=", room.id)
        .orderBy("created_at", "asc")
        .execute();
      return { messages: await Promise.all(messages.map(toMessage)) };
    });
  },

  async markChatRead(roomId: string) {
    const sessionUser = await requireSession(context.request.headers);
    const room = await getOwnedRoom(roomId, sessionUser.id);
    const now = new Date();
    const db = await getDb();
    await db
      .insertInto("chat_read_state")
      .values({ last_read_at: now, room_id: room.id, user_id: sessionUser.id })
      .onConflict((conflict) =>
        conflict
          .columns(["room_id", "user_id"])
          .doUpdateSet({ last_read_at: now })
      )
      .execute();
    return { ok: true as const };
  },

  async publishTyping(roomId: string, isTyping: boolean) {
    const sessionUser = await requireSession(context.request.headers);
    const room = await getOwnedRoom(roomId, sessionUser.id);
    await realtime.publish("typing", room.id, {
      isTyping: z.boolean().parse(isTyping),
      roomId: room.id,
      userId: sessionUser.id,
    });
    return { ok: true as const };
  },

  async sendMessage(roomId: string, input: SendChatMessageInput) {
    return observeOperation("sendMessage", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const db = await getDb();
      const room = await getOwnedRoom(roomId, sessionUser.id);
      const body = sendMessageSchema.parse(input);
      const now = new Date();
      const [created] = await db
        .insertInto("chat_message")
        .values({
          id: crypto.randomUUID(),
          kind: body.kind,
          room_id: room.id,
          sender_id: sessionUser.id,
          text: body.text ?? null,
          duration_sec: body.durationSec ?? null,
          media_thumb_url: body.mediaThumbUrl ?? null,
          media_url: body.mediaUrl ?? null,
          system_icon: null,
          created_at: now,
        })
        .returningAll()
        .execute();
      if (!created) throw new Error("Could not create chat message");

      await Promise.all([
        db
          .updateTable("chat_room")
          .set({ updated_at: now })
          .where("id", "=", room.id)
          .execute(),
        db
          .insertInto("chat_read_state")
          .values({
            last_read_at: now,
            room_id: room.id,
            user_id: sessionUser.id,
          })
          .onConflict((conflict) =>
            conflict
              .columns(["room_id", "user_id"])
              .doUpdateSet({ last_read_at: now })
          )
          .execute(),
        roomListCache.delete(sessionUser.id),
      ]);

      const message = await toMessage(created);
      try {
        await realtime.publish("messages", room.id, message);
        return { message, published: true };
      } catch (error) {
        logger.warn("realtime publish failed", {
          ...errorFields(error),
          operation: "sendMessage",
          traceId: tracer.getTraceId(),
        });
        return { message, published: false };
      }
    });
  },

  async suggestPlaces(input: PlaceSuggestionInput) {
    return observeOperation("suggestPlaces", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return suggestPlaces(sessionUser.id, input);
    });
  },

  async searchPublicSpots(input: PublicSpotSearchInput) {
    return observeOperation("searchPublicSpots", () =>
      searchPublicSpots(input)
    );
  },

  async getPublicSpot(placeId: string) {
    return observeOperation("getPublicSpot", () =>
      getPublicSpotDetails(placeId)
    );
  },

  async getPublicSpotMenu(placeId: string) {
    return observeOperation("getPublicSpotMenu", () =>
      getPublicSpotMenu(placeId)
    );
  },

  async getPlacePhoto(photoName: string) {
    return getPlacePhoto(photoName);
  },

  async previewVenueMenu(input: { url: string }) {
    return observeOperation("previewVenueMenu", async () => {
      await requireSession(context.request.headers);
      return previewVenueMenu(input);
    });
  },

  async captureVenueMenu(input: { locationId: string; url: string }) {
    return observeOperation("captureVenueMenu", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const body = z
        .object({ locationId: z.string().min(1), url: z.string().min(1) })
        .parse(input);
      return captureVenueMenu(sessionUser.id, body.locationId, {
        url: body.url,
      });
    });
  },

  async createVenueIdentityVerificationSession(input: { locationId: string }) {
    return observeOperation(
      "createVenueIdentityVerificationSession",
      async () => {
        const sessionUser = await requireSession(context.request.headers);
        return createVenueIdentitySession(sessionUser, input);
      }
    );
  },

  async getVenueIdentityVerificationStatus(locationId: string) {
    return observeOperation("getVenueIdentityVerificationStatus", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return loadVenueIdentityStatus(
        sessionUser,
        z.string().min(1).parse(locationId)
      );
    });
  },

  async listVenueMenuItems(locationId: string) {
    return observeOperation("listVenueMenuItems", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return listVenueMenuItems(
        sessionUser.id,
        z.string().min(1).parse(locationId),
        isConfiguredAdmin(sessionUser)
      );
    });
  },

  async upsertVenueMenuItem(input: {
    available?: boolean;
    description?: string;
    id?: string;
    locationId: string;
    name: string;
    photoUrl?: string;
    priceCents: number;
    section?: string;
    sortOrder?: number;
    status?: "draft" | "published" | "archived";
  }) {
    return observeOperation("upsertVenueMenuItem", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return upsertVenueMenuItem(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async upsertVenueMenuModifierGroup(input: {
    id?: string;
    locationId: string;
    maxSelections?: number;
    menuItemId: string;
    minSelections?: number;
    name: string;
    selectionType?: "single" | "multiple";
    sortOrder?: number;
  }) {
    return observeOperation("upsertVenueMenuModifierGroup", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return upsertVenueMenuModifierGroup(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async upsertVenueMenuModifierOption(input: {
    available?: boolean;
    groupId: string;
    id?: string;
    locationId: string;
    name: string;
    priceDeltaCents?: number;
    sortOrder?: number;
  }) {
    return observeOperation("upsertVenueMenuModifierOption", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return upsertVenueMenuModifierOption(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async createVenueLocation(input: {
    address: string;
    description?: string;
    discoveryPlaceId?: string;
    handle?: string;
    menuUrl?: string;
    name: string;
    organizationName?: string;
    phone: string;
    referralCode?: string;
    style?: BrandStyle;
    venueRole?: "owner" | "referrer";
    websiteUrl: string;
  }) {
    return observeOperation("createVenueLocation", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await createVenueLocation(sessionUser.id, input, {
        allowReservedBrand: isConfiguredAdmin(sessionUser),
      });
      await publishVenueEvent({
        detail: `${result.location.name} is now in the Chewbuu Sync pipeline.`,
        id: result.location.id,
        kind: "venue_created",
        locationId: result.location.id,
        status: result.location.status,
        title: "Venue setup started",
      });
      return result;
    });
  },

  async updateVenueBrand(input: UpdateVenueBrandInput) {
    return observeOperation("updateVenueBrand", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await updateVenueBrand(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      await publishVenueEvent({
        detail: `${result.location.name} brand metadata was updated.`,
        id: result.location.id,
        kind: "venue_created",
        locationId: result.location.id,
        status: result.location.status,
        title: "Venue brand updated",
      });
      return result;
    });
  },

  async inviteVenueMembers(input: InviteVenueMembersInput) {
    return observeOperation("inviteVenueMembers", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await inviteVenueMembers(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      for (const invite of result.invites) {
        if (!invite.email) continue;
        const inviteToken = invite.inviteToken ?? "";
        await venueEmailJob.submit({
          body: `You were invited to help manage a Chewbuu Sync venue. Open ${venueAppUrl}/venues?invite=${encodeURIComponent(inviteToken)} to continue.`,
          html: `<h2>You’re invited to Chewbuu Sync</h2><p>${escapeHtml(sessionUser.name)} invited you to help manage a venue.</p><p><a href="${venueAppUrl}/venues?invite=${encodeURIComponent(inviteToken)}">Accept the venue invitation</a></p>`,
          subject: "You’re invited to Chewbuu Sync",
          to: invite.email,
        });
      }
      return result;
    });
  },

  async followVenue(locationId: string) {
    return observeOperation("followVenue", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return followVenue(sessionUser.id, z.string().min(1).parse(locationId));
    });
  },

  async createVenueReferral(locationId: string) {
    return observeOperation("createVenueReferral", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createVenueReferral(
        sessionUser.id,
        z.string().min(1).parse(locationId)
      );
    });
  },

  async requestVenueClaim(locationId: string, input?: { claimNote?: string }) {
    return observeOperation("requestVenueClaim", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return requestVenueClaim(
        sessionUser.id,
        z.string().min(1).parse(locationId),
        input
      );
    });
  },

  async approveVenueClaim(locationId: string) {
    return observeOperation("approveVenueClaim", async () => {
      const sessionUser = await requireSession(context.request.headers);
      requireAdmin(sessionUser);
      return approveVenueClaim(
        sessionUser.id,
        z.string().min(1).parse(locationId)
      );
    });
  },

  async acceptVenueInvite(inviteToken: string) {
    return observeOperation("acceptVenueInvite", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return acceptVenueInvite(
        sessionUser.id,
        sessionUser.email,
        z.string().min(1).parse(inviteToken)
      );
    });
  },

  async getVenueLocations() {
    return observeOperation("getVenueLocations", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getVenueLocations(sessionUser.id, isConfiguredAdmin(sessionUser));
    });
  },

  async getVenueServiceBoard(input: { at?: string; locationId: string }) {
    return observeOperation("getVenueServiceBoard", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getVenueServiceBoard(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async getVenueServiceConfig(locationId: string) {
    return observeOperation("getVenueServiceConfig", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getVenueServiceConfig(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        z.string().min(1).parse(locationId)
      );
    });
  },

  async getVenueStaffStatus(locationId: string) {
    return observeOperation("getVenueStaffStatus", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getVenueStaffStatus(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        z.string().min(1).parse(locationId)
      );
    });
  },

  async updateVenueServiceConfig(input: {
    closeMinute?: number;
    geofenceRadiusMeters?: number;
    latitude?: number | null;
    locationId: string;
    longitude?: number | null;
    openMinute?: number;
    override?: "closed" | "closing" | "open" | "pre_open" | null;
  }) {
    return observeOperation("updateVenueServiceConfig", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return updateVenueServiceConfig(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async updateVenueStaff(input: {
    locationId: string;
    role?:
      | "admin"
      | "host"
      | "kitchen"
      | "lead"
      | "manager"
      | "owner"
      | "server"
      | "staff";
    status?: "active" | "removed" | "suspended";
    userId: string;
  }) {
    return observeOperation("updateVenueStaff", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return updateVenueStaff(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async clockInVenueShift(input: {
    code: string;
    latitude?: number;
    locationId: string;
    longitude?: number;
    shiftId: string;
  }) {
    return observeOperation("clockInVenueShift", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await clockInVenueShift(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      await recordVenueOperationalEvent(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        {
          entityId: result.attendance.id,
          entityType: "attendance",
          eventType: "clocked_in",
          locationId: input.locationId,
          metadata: { shiftId: input.shiftId },
          source: "staff",
        }
      );
      return result;
    });
  },

  async updateVenueAttendance(input: {
    action: "break_in" | "break_out" | "clock_out" | "lunch_in" | "lunch_out";
    attendanceId: string;
  }) {
    return observeOperation("updateVenueAttendance", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await updateVenueAttendance(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      const eventType =
        input.action === "break_out"
          ? "break_started"
          : input.action === "break_in"
            ? "break_ended"
            : input.action === "lunch_out"
              ? "lunch_started"
              : input.action === "lunch_in"
                ? "lunch_ended"
                : "clocked_out";
      await recordVenueOperationalEvent(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        {
          entityId: result.attendance.id,
          entityType: "attendance",
          eventType,
          locationId: result.attendance.locationId,
          metadata: { attendanceId: result.attendance.id },
          source: "staff",
        }
      );
      return result;
    });
  },

  async reportVenueStaffLate(input: {
    attendanceId: string;
    etaAt?: string;
    lateMinutes: number;
  }) {
    return observeOperation("reportVenueStaffLate", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await reportVenueStaffLate(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      await recordVenueOperationalEvent(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        {
          entityId: result.attendance.id,
          entityType: "attendance",
          eventType: "staff_late",
          locationId: result.attendance.locationId,
          metadata: {
            etaAt: input.etaAt ?? null,
            lateMinutes: input.lateMinutes,
          },
          source: "staff",
        }
      );
      return result;
    });
  },

  async createVenueServiceCustomer(input: {
    displayName: string;
    email?: string;
    locationId: string;
    notes?: string;
    phone?: string;
    userId?: string;
  }) {
    return observeOperation("createVenueServiceCustomer", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createVenueServiceCustomer(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async listVenueServiceCustomers(input: {
    locationId: string;
    search?: string;
  }) {
    return observeOperation("listVenueServiceCustomers", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return listVenueServiceCustomers(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async upsertVenueShift(input: {
    endAt: string;
    id?: string;
    locationId: string;
    role:
      | "admin"
      | "host"
      | "kitchen"
      | "lead"
      | "manager"
      | "owner"
      | "server"
      | "staff";
    section?: string;
    startAt: string;
    status?: string;
    userId: string;
  }) {
    return observeOperation("upsertVenueShift", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return upsertVenueShift(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async createVenueServiceOrder(input: unknown) {
    return observeOperation("createVenueServiceOrder", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await createVenueServiceOrder(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      await recordVenueOperationalEvent(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        {
          entityId: result.order.id,
          entityType: "order",
          eventType: "order_submitted",
          locationId: result.order.locationId,
          metadata: {
            source: result.order.source,
            totalCents: result.order.totalCents,
          },
          orderId: result.order.id,
          source: "staff",
          tableId: result.order.tableId,
        }
      );
      await publishVenueEvent({
        detail: `A staff order for $${(result.order.totalCents / 100).toFixed(2)} was created.`,
        id: result.order.id,
        kind: "order_created",
        locationId: result.order.locationId,
        status: result.order.status,
        title: "New service order",
      });
      return result;
    });
  },

  async updateVenueServiceOrder(input: unknown) {
    return observeOperation("updateVenueServiceOrder", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await updateVenueServiceOrder(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      const status =
        typeof input === "object" && input !== null && "status" in input
          ? input.status
          : undefined;
      const eventType =
        status === "preparing"
          ? "cooking_started"
          : status === "served"
            ? "food_served"
            : status === "completed"
              ? "order_completed"
              : undefined;
      if (eventType) {
        await recordVenueOperationalEvent(
          sessionUser.id,
          isConfiguredAdmin(sessionUser),
          {
            entityId: result.order.id,
            entityType: "order",
            eventType,
            locationId: result.order.locationId,
            metadata: { status },
            orderId: result.order.id,
            source: "staff",
            tableId: result.order.tableId,
          }
        );
      }
      await publishVenueEvent({
        detail: `Order ${result.order.id} moved to ${result.order.status}.`,
        id: result.order.id,
        kind: "order_created",
        locationId: result.order.locationId,
        status: result.order.status,
        title: "Service order updated",
      });
      return result;
    });
  },

  async listVenueSyncChannels(locationId: string) {
    return observeOperation("listVenueSyncChannels", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return listVenueSyncChannels(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        z.string().min(1).parse(locationId)
      );
    });
  },

  async listVenueJobListings(locationId: string) {
    return observeOperation("listVenueJobListings", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return listVenueJobListings(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        z.string().min(1).parse(locationId)
      );
    });
  },

  async listPublicVenueJobListings(locationId: string) {
    return observeOperation("listPublicVenueJobListings", () =>
      listVenueJobListings(
        undefined,
        false,
        z.string().min(1).parse(locationId),
        true
      )
    );
  },

  async upsertVenueJobListing(input: unknown) {
    return observeOperation("upsertVenueJobListing", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return upsertVenueJobListing(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async getVenueWorkspace(locationId: string) {
    return observeOperation("getVenueWorkspace", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const normalizedLocationId = z.string().min(1).parse(locationId);
      const isAdmin = isConfiguredAdmin(sessionUser);
      const [workspace, analytics, timeline, specials, tables] =
        await Promise.all([
          getVenueWorkspace(sessionUser.id, normalizedLocationId, isAdmin),
          getVenueAnalytics(sessionUser.id, normalizedLocationId, isAdmin),
          getVenueTimeline(sessionUser.id, normalizedLocationId, isAdmin),
          listVenueSpecials(sessionUser.id, normalizedLocationId, isAdmin),
          listVenueTables(sessionUser.id, normalizedLocationId, isAdmin),
        ]);
      return {
        ...workspace,
        analytics,
        events: timeline.events,
        specials: specials.specials,
        tables: tables.tables,
      };
    });
  },

  async getVenueAnalytics(
    locationId: string,
    input?: { endAt?: string; startAt?: string }
  ) {
    return observeOperation("getVenueAnalytics", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getVenueAnalytics(
        sessionUser.id,
        z.string().min(1).parse(locationId),
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async getVenueTimeline(locationId: string) {
    return observeOperation("getVenueTimeline", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getVenueTimeline(
        sessionUser.id,
        z.string().min(1).parse(locationId),
        isConfiguredAdmin(sessionUser)
      );
    });
  },

  async getVenuePublicSummary(locationId: string) {
    return observeOperation("getVenuePublicSummary", async () =>
      getVenuePublicSummary(z.string().min(1).parse(locationId))
    );
  },

  async listPublicVenueLocations() {
    return observeOperation("listPublicVenueLocations", () =>
      listPublicVenueLocations()
    );
  },

  async listPublicVenueSpecials(input?: {
    category?: string;
    locationId?: string;
  }) {
    return observeOperation("listPublicVenueSpecials", () =>
      listPublicVenueSpecials(input)
    );
  },

  async listVenueSpecials(locationId: string) {
    return observeOperation("listVenueSpecials", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return listVenueSpecials(
        sessionUser.id,
        z.string().min(1).parse(locationId),
        isConfiguredAdmin(sessionUser)
      );
    });
  },

  async createVenueSpecial(input: unknown) {
    return observeOperation("createVenueSpecial", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createVenueSpecial(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async updateVenueSpecial(input: unknown) {
    return observeOperation("updateVenueSpecial", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return updateVenueSpecial(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async setVenuePublicAnalytics(input: {
    enabled: boolean;
    locationId: string;
    minSamples?: number;
  }) {
    return observeOperation("setVenuePublicAnalytics", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return setVenuePublicAnalytics(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async recordVenueOperationalEvent(input: unknown) {
    return observeOperation("recordVenueOperationalEvent", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return recordVenueOperationalEvent(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async endVenueDiningSession(sessionId: string) {
    return observeOperation("endVenueDiningSession", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return endVenueDiningSession(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        z.string().min(1).parse(sessionId)
      );
    });
  },

  async listVenueTables(locationId: string) {
    return observeOperation("listVenueTables", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return listVenueTables(
        sessionUser.id,
        z.string().min(1).parse(locationId),
        isConfiguredAdmin(sessionUser)
      );
    });
  },

  async upsertVenueTable(input: unknown) {
    return observeOperation("upsertVenueTable", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return upsertVenueTable(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
    });
  },

  async updateVenueReservation(input: {
    assignedStaffUserId?: string;
    reservationId: string;
    status: string;
    tableLabel?: string;
  }) {
    return observeOperation("updateVenueReservation", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await updateVenueReservation(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      const reservationEventType =
        result.reservation.status === "confirmed"
          ? "reservation_confirmed"
          : result.reservation.status === "seated"
            ? "reservation_seated"
            : result.reservation.status === "requested"
              ? "reservation_requested"
              : undefined;
      if (reservationEventType) {
        await recordVenueOperationalEvent(
          sessionUser.id,
          isConfiguredAdmin(sessionUser),
          {
            eventType: reservationEventType,
            locationId: result.reservation.locationId,
            metadata: { status: result.reservation.status },
            reservationId: result.reservation.id,
            source: "staff",
          }
        );
      }
      await publishVenueEvent({
        detail: `Reservation ${result.reservation.status}${result.reservation.tableLabel ? ` at table ${result.reservation.tableLabel}` : ""}.`,
        id: result.reservation.id,
        kind: "reservation_requested",
        locationId: result.reservation.locationId,
        status: result.reservation.status,
        title: "Reservation updated",
      });
      await notifyVenueGuest(result.guestUserId, {
        detail: `Your reservation is now ${result.reservation.status}${result.reservation.tableLabel ? ` at table ${result.reservation.tableLabel}` : ""}.`,
        id: result.reservation.id,
        kind: "reservation_requested",
        title: "Reservation update",
      });
      return result;
    });
  },

  async updateVenueOrder(input: {
    assignedStaffUserId?: string;
    orderId: string;
    status: string;
  }) {
    return observeOperation("updateVenueOrder", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await updateVenueOrder(
        sessionUser.id,
        isConfiguredAdmin(sessionUser),
        input
      );
      const orderEventType =
        result.order.status === "preparing"
          ? "cooking_started"
          : result.order.status === "served"
            ? "food_served"
            : result.order.status === "completed"
              ? "order_completed"
              : undefined;
      if (orderEventType) {
        await recordVenueOperationalEvent(
          sessionUser.id,
          isConfiguredAdmin(sessionUser),
          {
            entityId: result.order.id,
            diningSessionId: result.order.diningSessionId,
            entityType: "order",
            eventType: orderEventType,
            locationId: result.order.locationId,
            metadata: { status: result.order.status },
            orderId: result.order.id,
            source: "staff",
          }
        );
      }
      await publishVenueEvent({
        detail: `Order moved to ${result.order.status}.`,
        id: result.order.id,
        kind: "order_created",
        locationId: result.order.locationId,
        status: result.order.status,
        title: "Order updated",
      });
      return result;
    });
  },

  async requestVenueReservation(input: {
    locationId: string;
    notes?: string;
    partySize: number;
    requestedAt: string;
  }) {
    return observeOperation("requestVenueReservation", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await requestVenueReservation(sessionUser.id, input);
      await recordVenueOperationalEvent(sessionUser.id, false, {
        eventType: "reservation_requested",
        locationId: result.reservation.locationId,
        metadata: { partySize: result.reservation.partySize },
        reservationId: result.reservation.id,
        source: "guest",
      });
      await publishVenueEvent({
        detail: `A party of ${result.reservation.partySize} requested ${new Date(result.reservation.requestedAt).toLocaleString()}.`,
        id: result.reservation.id,
        kind: "reservation_requested",
        locationId: result.reservation.locationId,
        status: result.reservation.status,
        title: "New reservation request",
      });
      await notifyVenueGuest(sessionUser.id, {
        detail: `Your reservation request for ${new Date(result.reservation.requestedAt).toLocaleString()} is waiting for the venue to confirm it.`,
        id: result.reservation.id,
        kind: "reservation_requested",
        title: "Reservation request sent",
      });
      return result;
    });
  },

  async startVenueDiningSession(input: {
    locationId: string;
    reservationId?: string;
    tableLabel?: string;
  }) {
    return observeOperation("startVenueDiningSession", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await startVenueDiningSession(sessionUser.id, input);
      await recordVenueOperationalEvent(sessionUser.id, false, {
        diningSessionId: result.session.id,
        entityId: result.session.id,
        entityType: "dining_session",
        eventType: "arrived",
        locationId: result.session.locationId,
        metadata: { tableLabel: result.session.tableLabel ?? null },
        reservationId: result.session.reservationId,
        source: "guest",
      });
      return result;
    });
  },

  async createVenueOrder(input: {
    diningSessionId?: string;
    items: {
      name: string;
      notes?: string;
      quantity: number;
      unitPriceCents: number;
    }[];
    locationId: string;
    reservationId?: string;
    tipCents?: number;
  }) {
    return observeOperation("createVenueOrder", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const result = await createVenueOrder(sessionUser.id, input);
      await recordVenueOperationalEvent(sessionUser.id, false, {
        diningSessionId: input.diningSessionId,
        entityId: result.order.id,
        entityType: "order",
        eventType: "order_submitted",
        locationId: result.order.locationId,
        metadata: { totalCents: result.order.totalCents },
        orderId: result.order.id,
        reservationId: input.reservationId,
        source: "guest",
      });
      await publishVenueEvent({
        detail: `A new order for $${(result.order.totalCents / 100).toFixed(2)} is ready to review.`,
        id: result.order.id,
        kind: "order_created",
        locationId: result.order.locationId,
        status: result.order.status,
        title: "New order received",
      });
      await notifyVenueGuest(sessionUser.id, {
        detail: `Your order total is $${(result.order.totalCents / 100).toFixed(2)}. It is waiting for the venue to accept it.`,
        id: result.order.id,
        kind: "order_created",
        title: "Order received",
      });
      return result;
    });
  },

  async requestVenueShiftSwap(input: {
    replacementUserId?: string;
    shiftId: string;
  }) {
    return observeOperation("requestVenueShiftSwap", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return requestVenueShiftSwap(sessionUser.id, input);
    });
  },

  async checkIn(input: CheckInInput) {
    return observeOperation("checkIn", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return checkIn(sessionUser, input);
    });
  },

  async startDate(dateRequestId: string) {
    return observeOperation("startDate", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return startDate(sessionUser, z.string().min(1).parse(dateRequestId));
    });
  },

  async completeDate(dateRequestId: string) {
    return observeOperation("completeDate", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return completeDate(sessionUser, z.string().min(1).parse(dateRequestId));
    });
  },

  async runDateLifecycle(input?: { at?: string }) {
    const sessionUser = await requireSession(context.request.headers);
    requireAdmin(sessionUser);
    const body = z
      .object({ at: z.iso.datetime().optional() })
      .parse(input ?? {});
    return {
      ...(await runDateLifecycle(body.at)),
      scheduler: "external-trigger-required" as const,
    };
  },

  async getReviewPrompt(requestId: string) {
    const sessionUser = await requireSession(context.request.headers);
    return getReviewPrompt(requestId, sessionUser.id);
  },

  async submitReview(requestId: string, input: ReviewInput) {
    return observeOperation("submitReview", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return submitReview(requestId, sessionUser.id, input);
    });
  },

  async getPricingPlans() {
    return getPricingPlans();
  },

  async seedPricingPlans() {
    return observeOperation("seedPricingPlans", async () => {
      const sessionUser = await requireSession(context.request.headers);
      requireAdmin(sessionUser);
      return seedPricingPlans();
    });
  },

  async syncPricingPlans() {
    return observeOperation("syncPricingPlans", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return syncPricingPlans(sessionUser);
    });
  },

  async getStripeIntegrationHealth() {
    return observeOperation("getStripeIntegrationHealth", async () => {
      const sessionUser = await requireSession(context.request.headers);
      requireAdmin(sessionUser);
      return getStripeIntegrationHealth();
    });
  },

  async syncStripeWebhookEndpoints() {
    return observeOperation("syncStripeWebhookEndpoints", async () => {
      const sessionUser = await requireSession(context.request.headers);
      requireAdmin(sessionUser);
      return syncStripeWebhookEndpoints();
    });
  },

  async createVenueCheckoutSession(input: {
    cancelUrl: string;
    experienceKind?: "date" | "dine_in" | "pickup";
    orderId: string;
    successUrl: string;
    tipAllocations?: {
      amountCents: number;
      beneficiaryKind: "cook" | "house" | "server";
      beneficiaryUserId?: string;
    }[];
  }) {
    return observeOperation("createVenueCheckoutSession", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createVenueCheckoutSession({
        ...input,
        isAdmin: isConfiguredAdmin(sessionUser),
        userId: sessionUser.id,
      });
    });
  },

  async createReferrerConnectOnboarding(input: { locationId: string }) {
    return observeOperation("createReferrerConnectOnboarding", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createReferrerConnectOnboarding({
        actorUserId: sessionUser.id,
        isAdmin: isConfiguredAdmin(sessionUser),
        locationId: input.locationId,
      });
    });
  },

  async createVenueConnectOnboarding(input: { locationId: string }) {
    return observeOperation("createVenueConnectOnboarding", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createVenueConnectOnboarding({
        email: sessionUser.email,
        isAdmin: isConfiguredAdmin(sessionUser),
        locationId: input.locationId,
        name: sessionUser.name,
        userId: sessionUser.id,
      });
    });
  },

  async createWorkerConnectOnboarding(input: {
    locationId: string;
    userId: string;
  }) {
    return observeOperation("createWorkerConnectOnboarding", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createWorkerConnectOnboarding({
        actorUserId: sessionUser.id,
        isAdmin: isConfiguredAdmin(sessionUser),
        locationId: input.locationId,
        workerUserId: input.userId,
      });
    });
  },

  async getVenueConnectStatus(locationId: string) {
    return observeOperation("getVenueConnectStatus", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getVenueConnectStatus({
        isAdmin: isConfiguredAdmin(sessionUser),
        locationId,
        userId: sessionUser.id,
      });
    });
  },

  async getStripePayment(orderId: string) {
    return observeOperation("getStripePayment", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getStripePayment(
        orderId,
        sessionUser.id,
        isConfiguredAdmin(sessionUser)
      );
    });
  },

  async createVenueRefund(input: {
    amountCents?: number;
    orderId: string;
    reason?: string;
  }) {
    return observeOperation("createVenueRefund", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return createVenueRefund({
        ...input,
        isAdmin: isConfiguredAdmin(sessionUser),
        userId: sessionUser.id,
      });
    });
  },

  async getStripeConnectStatus() {
    return observeOperation("getStripeConnectStatus", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getStripeConnectStatus(sessionUser);
    });
  },

  async updatePricingPlans(input: { plans: MembershipPlan[] }) {
    return observeOperation("updatePricingPlans", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return updatePricingPlans(sessionUser, input);
    });
  },

  async getFriendships() {
    const sessionUser = await requireSession(context.request.headers);
    return getFriendships(sessionUser.id);
  },

  async requestFriendship(friendUserId: string) {
    const sessionUser = await requireSession(context.request.headers);
    return requestFriendship(sessionUser.id, friendUserId);
  },

  async createFriendInvite(input: unknown) {
    const sessionUser = await requireSession(context.request.headers);
    return createFriendInvite(sessionUser.id, input);
  },

  async respondFriendship(
    friendshipId: string,
    status: "accepted" | "declined"
  ) {
    const sessionUser = await requireSession(context.request.headers);
    return respondFriendship(sessionUser.id, friendshipId, status);
  },

  async getCircles() {
    const sessionUser = await requireSession(context.request.headers);
    return getCommunities(sessionUser.id);
  },

  async createCircle(input: CreateCommunityInput | string) {
    const sessionUser = await requireSession(context.request.headers);
    const result = await createCommunityPlatform(
      sessionUser as CommunityActor,
      input,
      isConfiguredAdmin(sessionUser)
    );
    await venueEmailJob.submit({
      body: `${result.circle.name} was created on Chewbuu. Open ${venueAppUrl}/circles to finish adding people.`,
      html: `<h2>${escapeHtml(result.circle.name)} is ready</h2><p>Your ${result.circle.kind} is ready for metadata and people.</p><p><a href="${venueAppUrl}/circles">Open your ${result.circle.kind}</a></p>`,
      subject: `${result.circle.kind === "crew" ? "Crew" : "Circle"} created: ${result.circle.name}`,
      to: sessionUser.email,
    });
    return result;
  },

  async updateCircle(input: UpdateCommunityInput) {
    const sessionUser = await requireSession(context.request.headers);
    const result = await updateCommunity(
      sessionUser as CommunityActor,
      input,
      isConfiguredAdmin(sessionUser)
    );
    await venueEmailJob.submit({
      body: `${result.circle.name} metadata was updated. Open ${venueAppUrl}/circles to review it.`,
      html: `<h2>${escapeHtml(result.circle.name)} was updated</h2><p>Your ${result.circle.kind} branding and metadata are saved.</p><p><a href="${venueAppUrl}/circles">Review it in Chewbuu</a></p>`,
      subject: `${result.circle.kind === "crew" ? "Crew" : "Circle"} updated: ${result.circle.name}`,
      to: sessionUser.email,
    });
    return result;
  },

  async inviteCircleMembers(input: InviteCommunityMembersInput) {
    const sessionUser = await requireSession(context.request.headers);
    const result = await inviteCommunityMembers(
      sessionUser as CommunityActor,
      input,
      isConfiguredAdmin(sessionUser)
    );
    for (const invite of result.invites) {
      const inviteToken = invite.inviteToken ?? "";
      await venueEmailJob.submit({
        body: `You were invited to join a Chewbuu Circle. Open ${venueAppUrl}/circles?invite=${encodeURIComponent(inviteToken)} to join it.`,
        html: `<h2>You’re invited to a Chewbuu Circle</h2><p>${escapeHtml(sessionUser.name)} invited you to join their Circle.</p><p><a href="${venueAppUrl}/circles?invite=${encodeURIComponent(inviteToken)}">Accept the invitation</a></p>`,
        subject: "You’re invited to a Chewbuu Circle",
        to: invite.email,
      });
    }
    return result;
  },

  async acceptCircleInvite(inviteToken: string) {
    const sessionUser = await requireSession(context.request.headers);
    return acceptCommunityInvite(
      sessionUser.id,
      sessionUser.email,
      z.string().min(1).parse(inviteToken)
    );
  },

  async getAccountEntitlements() {
    const sessionUser = await requireSession(context.request.headers);
    return getAccountEntitlements(sessionUser);
  },

  async getDateMedia(requestId: string) {
    const sessionUser = await requireSession(context.request.headers);
    return getDateMedia(sessionUser, requestId);
  },

  async uploadDateMedia(input: UploadDateMediaInput) {
    return observeOperation("uploadDateMedia", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return uploadDateMedia(sessionUser, input);
    });
  },

  async getSpotCaptureOffer(input: {
    dateRequestId: string;
    googlePlaceId: string;
  }) {
    return observeOperation("getSpotCaptureOffer", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return getSpotCaptureOffer(sessionUser, input);
    });
  },

  async submitSpotContribution(input: SpotContributionInput) {
    return observeOperation("submitSpotContribution", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return submitSpotContribution(sessionUser, input);
    });
  },

  async getSpotCaptureRewardConfig() {
    return observeOperation("getSpotCaptureRewardConfig", async () => {
      const sessionUser = await requireSession(context.request.headers);
      if (!isConfiguredAdmin(sessionUser)) {
        throw new Error("Administrator access required");
      }
      return getSpotCaptureRewardConfig();
    });
  },

  async listSpotContributions() {
    return observeOperation("listSpotContributions", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return listSpotContributions(sessionUser);
    });
  },

  async reviewSpotContribution(input: {
    contributionId: string;
    status: "approved" | "rejected";
  }) {
    return observeOperation("reviewSpotContribution", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return reviewSpotContribution(sessionUser, input);
    });
  },

  async updateSpotCaptureRewardConfig(input: { rewardCents: number }) {
    return observeOperation("updateSpotCaptureRewardConfig", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return updateSpotCaptureRewardConfig(sessionUser, input);
    });
  },

  async createVenueMediaUpload(input: VenueMediaUploadInput) {
    return observeOperation("createVenueMediaUpload", async () => {
      await requireSession(context.request.headers);
      const body = z
        .object({
          contentType: z.string().trim().min(1),
          fileName: z.string().trim().min(1).max(255),
          kind: z.enum([
            "food_photo",
            "menu_photo",
            "venue_intro_video",
            "venue_photo",
            "venue_profile_photo",
          ]),
          locationId: z.string().min(1),
        })
        .parse(input);
      const db = await getDb();
      const location = await db
        .selectFrom("venue_location")
        .select("id")
        .where("id", "=", body.locationId)
        .executeTakeFirst();
      if (!location) throw new Error("Venue not found");
      const expectsVideo = body.kind === "venue_intro_video";
      const hasExpectedContentType = expectsVideo
        ? body.contentType.startsWith("video/")
        : body.contentType.startsWith("image/");
      if (!hasExpectedContentType) {
        throw new Error(
          expectsVideo
            ? "The venue intro must be a video upload."
            : "Venue media must be an image upload."
        );
      }
      const pathname = venueMediaPath(body.locationId, body);
      const uploadUrl = await mediaBucket.putUrl(pathname, {
        contentType: body.contentType,
        expiresIn: 300,
      });
      return {
        mediaUrl: await mediaBucket.getUrl(pathname, { expiresIn: 3600 }),
        pathname,
        uploadUrl,
      };
    });
  },

  async saveVenueMedia(input: {
    kind: VenueMediaKind;
    locationId: string;
    url: string;
  }) {
    return observeOperation("saveVenueMedia", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const body = z
        .object({
          kind: z.enum([
            "food_photo",
            "menu_photo",
            "venue_intro_video",
            "venue_photo",
            "venue_profile_photo",
          ]),
          locationId: z.string().min(1),
          url: z.string().min(1),
        })
        .parse(input);
      const pathname = mediaPathFromStoredValue(body.url);
      if (!pathname || !venueMediaPathIsValid(pathname, body.locationId)) {
        throw new Error("Venue media path is invalid");
      }
      const db = await getDb();
      const location = await db
        .selectFrom("venue_location")
        .select("id")
        .where("id", "=", body.locationId)
        .executeTakeFirst();
      if (!location) throw new Error("Venue not found");
      const mediaId = crypto.randomUUID();
      await db
        .insertInto("venue_media")
        .values({
          id: mediaId,
          kind: body.kind,
          location_id: body.locationId,
          source: "user",
          status: "pending",
          uploaded_by_user_id: sessionUser.id,
          url: body.url,
        })
        .execute();
      return { mediaId };
    });
  },

  async createMediaUpload(input: MediaUploadInput) {
    return observeOperation("createMediaUpload", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const body = z
        .object({
          contentType: z.string().trim().min(1),
          fileName: z.string().trim().min(1).max(255),
          slot: z.enum(["intro_video", "photo", "profile_photo"]),
        })
        .parse(input);
      const limit = mediaLimits[body.slot];
      if (!body.contentType.startsWith(limit.accept)) {
        throw new Error(`Expected a ${limit.accept.replace("/", "")} upload.`);
      }
      const pathname = mediaPath(sessionUser.id, body);
      const uploadUrl = await mediaBucket.putUrl(pathname, {
        contentType: body.contentType,
        expiresIn: 300,
      });
      return {
        mediaUrl: await mediaBucket.getUrl(pathname, { expiresIn: 3600 }),
        pathname,
        uploadUrl,
      };
    });
  },

  async getMediaUrl(path: string) {
    await requireSession(context.request.headers);
    const pathname = z.string().min(1).parse(path);
    if (!mediaPathIsValid(pathname)) throw new Error("Media path is invalid");
    return { url: await mediaBucket.getUrl(pathname, { expiresIn: 3600 }) };
  },

  async generateAiResponse(messages: AiMessage[]) {
    return observeOperation("generateAiResponse", async () => {
      await requireSession(context.request.headers);
      const result = await generateText({
        messages: await convertToModelMessages(messages),
        model: google("gemini-2.5-flash"),
      });
      return { text: result.text };
    });
  },

  async publishRecap(input: PublishRecapInput) {
    return observeOperation("publishRecap", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return publishRecap(sessionUser, input);
    });
  },

  async getRecaps() {
    await requireSession(context.request.headers);
    return getRecaps();
  },

  async savePushSubscription(input: {
    auth: string;
    endpoint: string;
    p256dh: string;
  }) {
    return observeOperation("savePushSubscription", async () => {
      const sessionUser = await requireSession(context.request.headers);
      const body = z
        .object({
          auth: z.string().min(1),
          endpoint: z.string().min(1),
          p256dh: z.string().min(1),
        })
        .parse(input);
      return savePushSubscription(sessionUser, body);
    });
  },

  async getVapidPublicKey() {
    return getVapidPublicKey();
  },

  async sendPushNotification(input: {
    badge?: string;
    body: string;
    data?: Record<string, unknown>;
    icon?: string;
    tag?: string;
    title: string;
    url?: string;
    userId?: string;
  }) {
    return observeOperation("sendPushNotification", async () => {
      const sessionUser = await requireSession(context.request.headers);
      requireAdmin(sessionUser);
      return sendPushNotification(input);
    });
  },
}));
