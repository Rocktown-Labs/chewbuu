import { google } from "@ai-sdk/google";
import { AppSetting } from "@aws-blocks/bb-app-setting";
import { Dashboard } from "@aws-blocks/bb-dashboard";
import { DistributedTable } from "@aws-blocks/bb-distributed-table";
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
import { RawRoute } from "@aws-blocks/core";
import {
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
  GetMeetingCommand,
} from "@aws-sdk/client-chime-sdk-meetings";
import { convertToModelMessages, generateText } from "ai";
import type { Kysely, Transaction } from "kysely";
import Stripe from "stripe";
import webpush from "web-push";
import { z } from "zod";

import { getDatabaseUrl, getDb, jsonb } from "./database";
import type { BlocksDatabase } from "./database";
import { nextDateLifecycleStatus } from "./date-lifecycle";
import {
  adjustReliabilityScore,
  calculateMatchScore,
  distanceBetweenMiles,
  hasLocation,
} from "./matching";
import type {
  ApiChatMessage,
  ApiChatParticipant,
  ApiChatRoom,
  AiMessage,
  ApiNotification,
  CheckInInput,
  CheckInResponse,
  ChimeMeetingResponse,
  DateMediaResponse,
  DatingMatchResponse,
  DatingProfileResponse,
  DatingRequestResponse,
  DatingSummaryResponse,
  PendingReviewResponse,
  PlacePhotoResponse,
  PlaceSuggestion,
  PlaceSuggestionInput,
  MembershipPlan,
  PublishRecapInput,
  RecapResponse,
  ReviewInput,
  ReviewPromptResponse,
  ReviewResponse,
  SendChatMessageInput,
  UploadDateMediaInput,
  MediaUploadInput,
  NotificationChannelClient,
  NotificationsResponse,
  SyncPricingPlansResponse,
} from "./types";

type BlocksDbExecutor = Kysely<BlocksDatabase> | Transaction<BlocksDatabase>;

const scope = new Scope("chewbuu-api");
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
  googleMapsUri: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  name: z.string(),
  openNow: z.boolean().optional(),
  photoUrl: z.string().optional(),
  placeId: z.string(),
  priceLevel: z.string().optional(),
  rating: z.string().optional(),
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

const initializeAuthEnvironment = async () => {
  authEnvironmentPromise ??= (async () => {
    process.env.DATABASE_URL ??= await getDatabaseUrl();
    process.env.BETTER_AUTH_SECRET ??= await betterAuthSecret.get();
    process.env.BETTER_AUTH_URL ??= "https://chewbuu.com/api/auth";
    process.env.CORS_ORIGIN ??= "https://chewbuu.com";
  })();
  await authEnvironmentPromise;
};

const requireSession = async (headers: Headers): Promise<SessionUser> => {
  await initializeAuthEnvironment();
  const { auth } = await import("@chewbuu/auth");
  const session = await auth.api.getSession({ headers });
  if (!session?.user) throw new Error("Authentication required");
  return {
    dailyDateLimit: session.user.dailyDateLimit ?? undefined,
    email: session.user.email,
    hasCompletedOnboarding: session.user.hasCompletedOnboarding ?? false,
    hasIntroVideo: session.user.hasIntroVideo ?? false,
    hasProfilePhoto: session.user.hasProfilePhoto ?? false,
    id: session.user.id,
    membershipTier: session.user.membershipTier ?? "social",
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

const loadProfile = async (userId: string, sessionUser: SessionUser) => {
  const db = await getDb();
  const storedProfile = await db
    .selectFrom("profile")
    .selectAll()
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!storedProfile) return null;

  const [media, contacts, invites] = await Promise.all([
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
    friendInvites: invites,
    media: resolvedMedia,
    name: sessionUser.name,
    trustedContacts: contacts,
    userId,
    username: sessionUser.username ?? "",
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
  const [profile, pendingReviews, requests] = await Promise.all([
    db
      .selectFrom("profile")
      .select([
        "area",
        "can_date as canDate",
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
  ]);
  if (!profile || !hasLocation(profile)) {
    throw new Error("Add your area and enable location before browsing dates.");
  }

  const [matches, places, partyMembers] = requests.length
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
      ])
    : [[], [], []];
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
      canDate: Boolean(profile?.canDate) && pendingReviews.length === 0,
      onboarded: Boolean(profile?.onboarded),
      pendingReviews: pendingReviews.length,
    },
    requests: requests.map((request) => ({
      filters: request.filters,
      id: request.id,
      matches: resolvedMatches
        .filter((match) => match.requestId === request.id)
        .map(({ requestId: _requestId, ...match }) => match),
      partyMembers: partyMembers
        .filter((member) => member.request_id === request.id)
        .map((member) => ({ displayName: member.display_name })),
      partySize: request.party_size,
      paymentMode: request.payment_mode,
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

const profileMediaInputSchema = z.object({
  isPrimary: z.boolean().default(false),
  kind: z.enum(["profile_photo", "photo", "intro_video"]),
  sortOrder: z.number().int().min(0).default(0),
  url: z.string().url(),
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
const profileDraftInputSchema = profileInputSchema.partial();

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
  const body = profileInputSchema.parse(input);
  const age = getAge(body.birthday);
  if (age === null || (!draft && age < 18)) {
    throw new Error("Chewbuu is for users 18 and older.");
  }

  const hasProfilePhoto = body.media.some(
    (item) => item.kind === "profile_photo"
  );
  const hasIntroVideo = body.media.some((item) => item.kind === "intro_video");
  const locationReady = hasLocation(body);
  const canDate = hasProfilePhoto && hasIntroVideo && locationReady;
  const onboarded = Boolean(
    hasProfilePhoto &&
    hasIntroVideo &&
    body.username &&
    body.area &&
    locationReady &&
    body.birthday &&
    body.sex &&
    body.sexuality &&
    (body.safetyOptIn || body.trustedContacts.length > 0) &&
    !draft
  );
  const db = await getDb();
  const now = new Date();

  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("profile")
      .values({
        age_range_max: body.ageRangeMax ?? null,
        age_range_min: body.ageRangeMin ?? null,
        area: body.area,
        bio: body.bio ?? null,
        birthday: body.birthday,
        can_date: canDate,
        contribution_score: 0,
        created_at: now,
        dating_modes: jsonb(body.datingModes),
        distance_miles: body.distanceMiles,
        favorite_things: jsonb(body.favoriteThings),
        height: body.height ?? null,
        id: crypto.randomUUID(),
        interest_details: jsonb(body.interestDetails),
        interested_in: jsonb(body.interestedIn),
        interests: jsonb(body.interests),
        intro_video_url:
          body.media.find((item) => item.kind === "intro_video")?.url ?? null,
        kids: body.kids ?? null,
        latitude: body.latitude ?? null,
        looking_for: jsonb(body.lookingFor),
        longitude: body.longitude ?? null,
        marital_status: body.maritalStatus ?? null,
        onboarded,
        onboarding_completed_at: onboarded ? now : null,
        occupation: body.occupation ?? null,
        politics: body.politics ?? null,
        profile_photo_url:
          body.media.find((item) => item.kind === "profile_photo")?.url ?? null,
        phone: body.phone ?? null,
        race: body.race ?? null,
        religion: body.religion ?? null,
        reliability_score: 100,
        safety_opt_in: body.safetyOptIn,
        sex: body.sex,
        sexuality: body.sexuality,
        updated_at: now,
        user_id: sessionUser.id,
        weight: body.weight ?? null,
        wants_kids: body.wantsKids ?? null,
      })
      .onConflict((conflict) =>
        conflict.column("user_id").doUpdateSet({
          age_range_max: body.ageRangeMax ?? null,
          age_range_min: body.ageRangeMin ?? null,
          area: body.area,
          bio: body.bio ?? null,
          birthday: body.birthday,
          can_date: canDate,
          dating_modes: jsonb(body.datingModes),
          distance_miles: body.distanceMiles,
          favorite_things: jsonb(body.favoriteThings),
          height: body.height ?? null,
          interest_details: jsonb(body.interestDetails),
          interested_in: jsonb(body.interestedIn),
          interests: jsonb(body.interests),
          intro_video_url:
            body.media.find((item) => item.kind === "intro_video")?.url ?? null,
          kids: body.kids ?? null,
          latitude: body.latitude ?? null,
          looking_for: jsonb(body.lookingFor),
          longitude: body.longitude ?? null,
          marital_status: body.maritalStatus ?? null,
          onboarded,
          onboarding_completed_at: onboarded ? now : null,
          occupation: body.occupation ?? null,
          politics: body.politics ?? null,
          profile_photo_url:
            body.media.find((item) => item.kind === "profile_photo")?.url ??
            null,
          phone: body.phone ?? null,
          race: body.race ?? null,
          religion: body.religion ?? null,
          safety_opt_in: body.safetyOptIn,
          sex: body.sex,
          sexuality: body.sexuality,
          updated_at: now,
          weight: body.weight ?? null,
          wants_kids: body.wantsKids ?? null,
        })
      )
      .execute();

    await tx
      .deleteFrom("profile_media")
      .where("user_id", "=", sessionUser.id)
      .execute();
    if (body.media.length) {
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
        username: body.username ?? null,
      })
      .where("id", "=", sessionUser.id)
      .execute();
  });

  const pendingReviewRows = await loadPendingReviews(sessionUser.id);
  const pendingReviews = pendingReviewRows.length;
  const savedProfile = await loadProfile(sessionUser.id, {
    ...sessionUser,
    username: body.username ?? sessionUser.username,
  });
  return {
    profile: savedProfile as DatingProfileResponse,
    readiness: {
      canDate: canDate && pendingReviews === 0,
      onboarded,
      pendingReviews,
    },
  };
};

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
      const candidateAge = candidate.birthday
        ? getAge(candidate.birthday)
        : null;
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
  searchKind: z.enum(["place", "signal"]).default("signal"),
  what: z.array(z.string().trim().min(1)).min(1),
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

const uploadDateMediaSchema = z.object({
  dateRequestId: z.string().min(1),
  kind: z.string().trim().min(1),
  thumbnailUrl: z.string().url().optional(),
  url: z.string().url(),
});

const publishRecapSchema = z.object({
  caption: z.string().trim().max(2000).optional(),
  dateRequestId: z.string().min(1),
  reviewId: z.string().optional(),
  storyHours: z.number().int().min(1).max(24).optional(),
  thumbnailUrl: z.string().url().optional(),
  videoUrl: z.string().url(),
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
  if (input.searchKind === "place" && filters) {
    return `${filters} near ${input.area}`;
  }
  const categories = input.what.map(
    (item) => placeSearchKeywords[item] ?? item
  );
  return `${[filters, ...categories].filter(Boolean).join(" ")} near ${input.area}`;
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

const suggestPlaces = async (userId: string, input: unknown) => {
  const body = placeSuggestionInputSchema.parse(input);
  const db = await getDb();
  const profile = await db
    .selectFrom("profile")
    .select(["area", "latitude", "longitude"])
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!profile || !hasLocation(profile)) {
    throw new Error(
      "Add your area and enable location before searching places."
    );
  }
  await acquirePlaceSearchRateLimit(userId);
  const cacheKey = JSON.stringify({
    area: body.area.trim().toLowerCase(),
    filters: [...body.filters].toSorted(),
    latitude: body.latitude ?? profile.latitude,
    longitude: body.longitude ?? profile.longitude,
    searchKind: body.searchKind,
    what: [...body.what].toSorted(),
  });
  const cached = await placeSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { places: cached.places };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) throw new Error("Place search is not configured.");

  const textQuery = buildBlocksPlaceSearchTextQuery(body);
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      body: JSON.stringify({ pageSize: 12, textQuery }),
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-fieldmask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.types,places.photos,places.priceLevel,places.googleMapsUri,places.websiteUri,places.location,places.currentOpeningHours,places.userRatingCount",
      },
      method: "POST",
    }
  );
  if (!response.ok) throw new Error("Place search is temporarily unavailable.");

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
        ...(place.formattedAddress ? { address: place.formattedAddress } : {}),
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
        ...(place.priceLevel ? { priceLevel: place.priceLevel } : {}),
        ...(place.rating !== undefined
          ? { rating: place.rating.toFixed(1) }
          : {}),
        ...(place.userRatingCount !== undefined
          ? { userRatingCount: place.userRatingCount }
          : {}),
        ...(place.websiteUri ? { websiteUri: place.websiteUri } : {}),
        name,
        placeId: id,
        types: place.types ?? [],
      } satisfies PlaceSuggestion,
    ];
  });
  await placeSearchCache.put(cacheKey, {
    expiresAt: Date.now() + 5 * 60_000,
    places,
  });
  return { places };
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
  const admins = (process.env.ADMIN_EMAILS ?? "cg@rocktownlabs.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.includes(sessionUser.email.toLowerCase())) {
    throw new Error("Administrator access required");
  }
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
        stripe_price_id: plan.stripePriceId || null,
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
        stripe_price_id: plan.stripePriceId || null,
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

  const stripe = new Stripe(stripeKey);
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

  const stripeProducts = await stripe.products.list({
    active: true,
    limit: 100,
  });

  for (const plan of currentPlans) {
    if (plan.tier === "social" || plan.monthly_price_cents === 0) {
      continue;
    }

    let product = stripeProducts.data.find(
      (p) =>
        p.metadata?.tier === plan.tier ||
        p.name.toLowerCase() === plan.name.toLowerCase() ||
        p.name.toLowerCase() === `chewbuu ${plan.name.toLowerCase()}`
    );

    if (!product) {
      product = await stripe.products.create({
        description: plan.description,
        metadata: {
          app: "chewbuu",
          tier: plan.tier,
        },
        name: `Chewbuu ${plan.name}`,
      });
    }

    const existingPrices = await stripe.prices.list({
      active: true,
      limit: 100,
      product: product.id,
    });

    let monthlyPrice = existingPrices.data.find(
      (p) =>
        p.recurring?.interval === "month" &&
        p.unit_amount === plan.monthly_price_cents &&
        p.currency.toLowerCase() === "usd"
    );

    if (!monthlyPrice) {
      monthlyPrice = await stripe.prices.create({
        currency: "usd",
        metadata: {
          app: "chewbuu",
          interval: "month",
          tier: plan.tier,
        },
        product: product.id,
        recurring: { interval: "month" },
        unit_amount: plan.monthly_price_cents,
      });
    }

    let annualPrice = existingPrices.data.find(
      (p) =>
        p.recurring?.interval === "year" &&
        p.unit_amount === plan.annual_price_cents &&
        p.currency.toLowerCase() === "usd"
    );

    if (!annualPrice && plan.annual_price_cents > 0) {
      annualPrice = await stripe.prices.create({
        currency: "usd",
        metadata: {
          app: "chewbuu",
          interval: "year",
          tier: plan.tier,
        },
        product: product.id,
        recurring: { interval: "year" },
        unit_amount: plan.annual_price_cents,
      });
    }

    await db
      .updateTable("membership_plan")
      .set({
        annual_stripe_price_id: annualPrice?.id ?? null,
        stripe_price_id: monthlyPrice.id,
        updated_at: new Date(),
      })
      .where("id", "=", plan.id)
      .execute();
  }

  const updatedPlans = await db
    .selectFrom("membership_plan")
    .selectAll()
    .where("active", "=", true)
    .orderBy("sort_order", "asc")
    .execute();

  return {
    message: "Stripe catalog synchronized successfully.",
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

const getCircles = async (userId: string) => {
  const db = await getDb();
  const circles = await db
    .selectFrom("circle as circle")
    .innerJoin(
      "circle_member as membership",
      "membership.circle_id",
      "circle.id"
    )
    .selectAll("circle")
    .select((expression) =>
      expression.fn.count("membership.id").as("member_count")
    )
    .where("membership.user_id", "=", userId)
    .groupBy(["circle.id", "circle.name", "circle.owner_user_id"])
    .execute();
  const members = circles.length
    ? await db
        .selectFrom("circle_member")
        .selectAll()
        .where(
          "circle_id",
          "in",
          circles.map((circle) => circle.id)
        )
        .execute()
    : [];
  return {
    circles: circles.map((circle) => ({
      id: circle.id,
      members: members
        .filter((member) => member.circle_id === circle.id)
        .map((member) => ({
          id: member.id,
          role: member.role,
          status: member.status,
          userId: member.user_id,
        })),
      name: circle.name,
      ownerUserId: circle.owner_user_id,
    })),
  };
};

const createCircle = async (sessionUser: SessionUser, name: string) => {
  if (
    sessionUser.membershipTier !== "mingle" &&
    sessionUser.membershipTier !== "sugar"
  )
    throw new Error("Upgrade to Mingle to create a circle");
  const cleanName = z.string().trim().min(1).max(100).parse(name);
  const db = await getDb();
  const circleId = crypto.randomUUID();
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("circle")
      .values({ id: circleId, name: cleanName, owner_user_id: sessionUser.id })
      .execute();
    await tx
      .insertInto("circle_member")
      .values({
        circle_id: circleId,
        id: crypto.randomUUID(),
        invite_id: null,
        role: "owner",
        status: "active",
        user_id: sessionUser.id,
      })
      .execute();
  });
  return {
    circle: {
      id: circleId,
      members: [
        { id: "", role: "owner", status: "active", userId: sessionUser.id },
      ],
      name: cleanName,
      ownerUserId: sessionUser.id,
    },
  };
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
    media: {
      createdAt: new Date(media.created_at).toISOString(),
      dateRequestId: media.date_request_id,
      id: media.id,
      kind: media.kind,
      thumbnailUrl: media.thumbnail_url,
      uploadedByUserId: media.uploaded_by_user_id,
      url: media.url,
    } satisfies DateMediaResponse,
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
    media: await Promise.all(
      media.map(async (item) => ({
        createdAt: new Date(item.created_at).toISOString(),
        dateRequestId: item.date_request_id,
        id: item.id,
        kind: item.kind,
        thumbnailUrl: await mintStoredMediaUrl(item.thumbnail_url),
        uploadedByUserId: item.uploaded_by_user_id,
        url: (await mintStoredMediaUrl(item.url)) ?? item.url,
      }))
    ),
  };
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
  const now = new Date();
  const storyExpiresAt = body.storyHours
    ? new Date(now.getTime() + body.storyHours * 60 * 60 * 1000)
    : null;
  const [recap] = await db
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
      video_url: body.videoUrl,
    })
    .onConflict((conflict) =>
      conflict.columns(["author_user_id", "date_request_id"]).doUpdateSet({
        caption: body.caption ?? null,
        published_at: now,
        review_id: body.reviewId ?? null,
        story_expires_at: storyExpiresAt,
        thumbnail_url: body.thumbnailUrl ?? null,
        video_url: body.videoUrl,
      })
    )
    .returningAll()
    .execute();
  if (!recap) throw new Error("Could not publish recap");
  return {
    recap: {
      authorUserId: recap.author_user_id,
      caption: recap.caption ?? undefined,
      createdAt: new Date(recap.created_at).toISOString(),
      dateRequestId: recap.date_request_id,
      id: recap.id,
      publishedAt: toIso(recap.published_at),
      reviewId: recap.review_id ?? undefined,
      storyExpiresAt: toIso(recap.story_expires_at),
      storyHours: body.storyHours,
      thumbnailUrl: recap.thumbnail_url ?? undefined,
      videoUrl: recap.video_url,
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
    recaps: recaps.map((recap) => ({
      authorUserId: recap.author_user_id,
      caption: recap.caption ?? undefined,
      createdAt: new Date(recap.created_at).toISOString(),
      dateRequestId: recap.date_request_id,
      id: recap.id,
      publishedAt: toIso(recap.published_at),
      reviewId: recap.review_id ?? undefined,
      storyExpiresAt: toIso(recap.story_expires_at),
      thumbnailUrl: recap.thumbnail_url ?? undefined,
      videoUrl: recap.video_url,
    })),
  };
};

export const api = new ApiNamespace(scope, "api", (context) => ({
  async getDatingSummary() {
    return observeOperation("getDatingSummary", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return loadDatingSummary(sessionUser);
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

  async getProfile() {
    return observeOperation("getProfile", async () => {
      const sessionUser = await requireSession(context.request.headers);
      return { profile: await loadProfile(sessionUser.id, sessionUser) };
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
          ageRangeMax: draft.ageRangeMax,
          ageRangeMin: draft.ageRangeMin,
          area: draft.area ?? (current?.area as string | undefined) ?? "",
          bio: draft.bio,
          birthday:
            draft.birthday ?? (current?.birthday as string | undefined) ?? "",
          datingModes: draft.datingModes ?? [],
          distanceMiles: draft.distanceMiles ?? 25,
          favoriteThings: draft.favoriteThings ?? [],
          friendInvites: draft.friendInvites ?? [],
          height: draft.height,
          interestDetails: draft.interestDetails ?? {},
          interestedIn: draft.interestedIn ?? [],
          interests: draft.interests ?? [],
          kids: draft.kids,
          latitude: draft.latitude,
          lookingFor: draft.lookingFor ?? [],
          longitude: draft.longitude,
          maritalStatus: draft.maritalStatus,
          media: draft.media ?? [],
          name: draft.name,
          occupation: draft.occupation,
          politics: draft.politics,
          phone: draft.phone,
          race: draft.race,
          religion: draft.religion,
          safetyOptIn: draft.safetyOptIn ?? false,
          sex: draft.sex ?? (current?.sex as string | undefined) ?? "",
          sexuality:
            draft.sexuality ?? (current?.sexuality as string | undefined) ?? "",
          trustedContacts: draft.trustedContacts ?? [],
          username:
            draft.username ?? (current?.username as string | undefined) ?? "",
          weight: draft.weight,
          wantsKids: draft.wantsKids,
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

  async getPlacePhoto(photoName: string) {
    await requireSession(context.request.headers);
    return getPlacePhoto(photoName);
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
    return getCircles(sessionUser.id);
  },

  async createCircle(name: string) {
    const sessionUser = await requireSession(context.request.headers);
    return createCircle(sessionUser, name);
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
