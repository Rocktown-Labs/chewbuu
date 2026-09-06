import { randomUUID } from "node:crypto";

import { createStripeClient, stripeIdempotencyKey } from "@chewbuu/stripe";
import type { Kysely } from "kysely";
import { z } from "zod";

import { getDb } from "./database";
import type { BlocksDatabase } from "./database";
import { distanceBetweenMiles } from "./matching";
import { getSyncPlanEntitlement } from "./sync-plans";
import type {
  PublicVenueDiscoveryInput,
  VenueSpotlight,
  VenueSpotlightCheckoutResponse,
} from "./types";

const spotlightKindSchema = z.enum(["event", "special", "venue"]);
const promotionManagerRoles = new Set(["admin", "lead", "manager", "owner"]);

export const SPOTLIGHT_OFFERS = {
  event: { durationDays: 1, priceCents: 2900 },
  special: { durationDays: 3, priceCents: 1900 },
  venue: { durationDays: 7, priceCents: 4900 },
} as const;

const createSpotlightInputSchema = z
  .object({
    cancelUrl: z.url(),
    description: z.string().trim().max(1000).optional(),
    endsAt: z.iso.datetime().optional(),
    kind: spotlightKindSchema,
    locationId: z.string().min(1),
    specialId: z.string().min(1).optional(),
    startsAt: z.iso.datetime().optional(),
    successUrl: z.url(),
    title: z.string().trim().max(160).optional(),
  })
  .superRefine((value, context) => {
    if (value.kind === "special" && !value.specialId) {
      context.addIssue({
        code: "custom",
        message: "A special is required for this boost.",
        path: ["specialId"],
      });
    }
    if (value.kind !== "special" && value.specialId) {
      context.addIssue({
        code: "custom",
        message: "Only special boosts can reference a special.",
        path: ["specialId"],
      });
    }
    if (value.kind === "event" && !value.title?.trim()) {
      context.addIssue({
        code: "custom",
        message: "An event title is required.",
        path: ["title"],
      });
    }
  });

const publicVenueStatuses = ["claimed", "live", "verified"] as const;

const getStripeClient = () => {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return createStripeClient(key);
};

const getOrigin = (value: string | undefined) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const validateCheckoutRedirect = (url: string, requestOrigin?: string) => {
  const parsed = new URL(url);
  const allowedOrigins = new Set(
    [
      requestOrigin,
      process.env.CORS_ORIGIN,
      process.env.VENUE_APP_URL,
      "https://chewbuu.com",
    ].flatMap((value) => {
      const origin = getOrigin(value);
      return origin ? [origin] : [];
    })
  );
  const isLocalDevelopmentOrigin =
    process.env.NODE_ENV !== "production" &&
    /^(?:http:\/\/localhost|http:\/\/127\.0\.0\.1)(?::\d+)?$/.test(
      parsed.origin
    );
  if (!allowedOrigins.has(parsed.origin) && !isLocalDevelopmentOrigin) {
    throw new Error("Checkout redirects must stay on the Chewbuu app origin.");
  }
  return parsed.toString();
};

const toSpotlight = (spotlight: {
  created_at: Date | string;
  description: string | null;
  ends_at: Date | string;
  id: string;
  is_free: boolean;
  kind: string;
  location_id: string;
  location_name?: string | null;
  payment_status: string;
  price_cents: number;
  special_id: string | null;
  starts_at: Date | string;
  status: string;
  title: string;
}): VenueSpotlight => ({
  createdAt: new Date(spotlight.created_at).toISOString(),
  ...(spotlight.description ? { description: spotlight.description } : {}),
  endsAt: new Date(spotlight.ends_at).toISOString(),
  id: spotlight.id,
  isFree: spotlight.is_free,
  kind: spotlight.kind as VenueSpotlight["kind"],
  locationId: spotlight.location_id,
  ...(spotlight.location_name ? { locationName: spotlight.location_name } : {}),
  paymentStatus: spotlight.payment_status,
  priceCents: spotlight.price_cents,
  ...(spotlight.special_id ? { specialId: spotlight.special_id } : {}),
  startsAt: new Date(spotlight.starts_at).toISOString(),
  status: spotlight.status as VenueSpotlight["status"],
  title: spotlight.title,
});

const assertVenueMember = async (
  db: Kysely<BlocksDatabase>,
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (isAdmin) return;
  const member = await db
    .selectFrom("venue_member_location")
    .select("user_id")
    .where("location_id", "=", locationId)
    .where("user_id", "=", userId)
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!member) throw new Error("Venue membership is required.");
};

const hasPromotionManagerAccess = async (
  db: Kysely<BlocksDatabase>,
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (isAdmin) return true;
  const member = await db
    .selectFrom("venue_member_location")
    .select("role")
    .where("location_id", "=", locationId)
    .where("user_id", "=", userId)
    .where("status", "=", "active")
    .executeTakeFirst();
  return Boolean(member && promotionManagerRoles.has(member.role));
};

const assertPromotionManager = async (
  db: Kysely<BlocksDatabase>,
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (!(await hasPromotionManagerAccess(db, userId, locationId, isAdmin))) {
    throw new Error("Venue manager access is required to buy Spotlight.");
  }
};

const expireVenueSpotlights = async (
  db: Kysely<BlocksDatabase>,
  now = new Date()
) => {
  let expired: { id: string; special_id: string | null }[];
  try {
    expired = await db
      .selectFrom("venue_spotlight")
      .select(["id", "special_id"])
      .where("status", "=", "active")
      .where("ends_at", "<=", now)
      .execute();
  } catch {
    // The API can start before the additive Spotlight migration is applied.
    return;
  }
  if (!expired.length) return;

  await db
    .updateTable("venue_spotlight")
    .set({ status: "completed", updated_at: now })
    .where(
      "id",
      "in",
      expired.map((spotlight) => spotlight.id)
    )
    .execute();

  const specialIds = [
    ...new Set(
      expired.flatMap((spotlight) =>
        spotlight.special_id ? [spotlight.special_id] : []
      )
    ),
  ];
  for (const specialId of specialIds) {
    const activePromotion = await db
      .selectFrom("venue_spotlight")
      .select("id")
      .where("special_id", "=", specialId)
      .where("status", "=", "active")
      .where("ends_at", ">", now)
      .executeTakeFirst();
    if (!activePromotion) {
      await db
        .updateTable("venue_special")
        .set({ featured: false, updated_at: now })
        .where("id", "=", specialId)
        .execute();
    }
  }
};

export const expireSpotlights = expireVenueSpotlights;

export const listActiveSpotlightLocationIds = async (
  db: Kysely<BlocksDatabase>,
  now = new Date()
) => {
  try {
    await expireVenueSpotlights(db, now);
    const rows = await db
      .selectFrom("venue_spotlight")
      .select("location_id")
      .where("status", "=", "active")
      .where("starts_at", "<=", now)
      .where("ends_at", ">", now)
      .execute();
    return new Set(rows.map((row) => row.location_id));
  } catch {
    return new Set();
  }
};

export const listActiveSpotlightSpecialIds = async (
  db: Kysely<BlocksDatabase>,
  now = new Date()
) => {
  try {
    await expireVenueSpotlights(db, now);
    const rows = await db
      .selectFrom("venue_spotlight")
      .select("special_id")
      .where("status", "=", "active")
      .where("starts_at", "<=", now)
      .where("ends_at", ">", now)
      .where("special_id", "is not", null)
      .execute();
    return new Set(
      rows.flatMap((row) => (row.special_id ? [row.special_id] : []))
    );
  } catch {
    return new Set();
  }
};

const getPromotionLocation = async (
  db: Kysely<BlocksDatabase>,
  locationId: string
) => {
  const location = await db
    .selectFrom("venue_location")
    .select([
      "id",
      "name",
      "organization_id",
      "status",
      "stripe_identity_status",
    ])
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found.");
  if (
    !publicVenueStatuses.includes(
      location.status as (typeof publicVenueStatuses)[number]
    ) ||
    location.stripe_identity_status !== "verified"
  ) {
    throw new Error("The venue must be claimed and identity verified first.");
  }
  return location;
};

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const minDate = (first: Date, second: Date) =>
  first.getTime() < second.getTime() ? first : second;

const activateSpotlight = async (
  spotlightId: string,
  paymentIntentId?: string
) => {
  const db = await getDb();
  const now = new Date();
  const spotlight = await db
    .selectFrom("venue_spotlight")
    .selectAll()
    .where("id", "=", spotlightId)
    .executeTakeFirst();
  if (!spotlight) throw new Error("Spotlight promotion not found.");
  if (spotlight.status === "active") return;
  if (spotlight.status !== "pending") return;
  if (new Date(spotlight.ends_at).getTime() <= now.getTime()) {
    await db
      .updateTable("venue_spotlight")
      .set({ payment_status: "expired", status: "completed", updated_at: now })
      .where("id", "=", spotlight.id)
      .execute();
    return;
  }
  await db.transaction().execute(async (transaction) => {
    await transaction
      .updateTable("venue_spotlight")
      .set({
        ...(paymentIntentId
          ? { stripe_payment_intent_id: paymentIntentId }
          : {}),
        payment_status: "succeeded",
        status: "active",
        updated_at: now,
      })
      .where("id", "=", spotlight.id)
      .where("status", "=", "pending")
      .execute();
    if (spotlight.special_id) {
      await transaction
        .updateTable("venue_special")
        .set({ featured: true, updated_at: now })
        .where("id", "=", spotlight.special_id)
        .execute();
    }
  });
};

const failSpotlight = async (spotlightId: string) => {
  const db = await getDb();
  const now = new Date();
  const spotlight = await db
    .selectFrom("venue_spotlight")
    .select(["id", "special_id"])
    .where("id", "=", spotlightId)
    .executeTakeFirst();
  if (!spotlight) return;
  await db
    .updateTable("venue_spotlight")
    .set({ payment_status: "failed", status: "cancelled", updated_at: now })
    .where("id", "=", spotlight.id)
    .where("status", "=", "pending")
    .execute();
  if (spotlight.special_id) {
    const activePromotion = await db
      .selectFrom("venue_spotlight")
      .select("id")
      .where("special_id", "=", spotlight.special_id)
      .where("status", "=", "active")
      .where("ends_at", ">", now)
      .executeTakeFirst();
    if (!activePromotion) {
      await db
        .updateTable("venue_special")
        .set({ featured: false, updated_at: now })
        .where("id", "=", spotlight.special_id)
        .execute();
    }
  }
};

export const processSpotlightPayment = async (input: {
  failed?: boolean;
  paymentIntentId?: string;
  spotlightId: string;
}) => {
  if (input.failed) {
    await failSpotlight(input.spotlightId);
    return;
  }
  await activateSpotlight(input.spotlightId, input.paymentIntentId);
};

export const createVenueSpotlightCheckout = async (input: {
  cancelUrl: string;
  description?: string;
  endsAt?: string;
  isAdmin: boolean;
  kind: "event" | "special" | "venue";
  locationId: string;
  requestOrigin?: string;
  specialId?: string;
  startsAt?: string;
  successUrl: string;
  title?: string;
  userId: string;
}): Promise<VenueSpotlightCheckoutResponse> => {
  const body = createSpotlightInputSchema.parse(input);
  const cancelUrl = validateCheckoutRedirect(
    body.cancelUrl,
    input.requestOrigin
  );
  const successUrl = validateCheckoutRedirect(
    body.successUrl,
    input.requestOrigin
  );
  const db = await getDb();
  await assertPromotionManager(
    db,
    input.userId,
    input.locationId,
    input.isAdmin
  );
  const location = await getPromotionLocation(db, body.locationId);
  const syncPlan = await getSyncPlanEntitlement(db, location.organization_id);
  if (!syncPlan) {
    throw new Error("An active Chewbuu Sync subscription is required.");
  }

  const now = new Date();
  await expireVenueSpotlights(db, now);
  let special:
    | {
        description: string | null;
        ends_at: Date | string | null;
        id: string;
        location_id: string;
        starts_at: Date | string;
        status: string;
        title: string;
      }
    | undefined;
  if (body.kind === "special") {
    if (!body.specialId)
      throw new Error("A special is required for this boost.");
    special = await db
      .selectFrom("venue_special")
      .select([
        "description",
        "ends_at",
        "id",
        "location_id",
        "starts_at",
        "status",
        "title",
      ])
      .where("id", "=", body.specialId)
      .executeTakeFirst();
    if (!special || special.location_id !== body.locationId) {
      throw new Error("Special not found for this venue.");
    }
    if (special.status !== "published") {
      throw new Error("Only published specials can be boosted.");
    }
    if (
      new Date(special.starts_at).getTime() > now.getTime() ||
      (special.ends_at && new Date(special.ends_at).getTime() <= now.getTime())
    ) {
      throw new Error("Only active specials can be boosted.");
    }
  }

  let startsAt = now;
  let endsAt = addDays(now, SPOTLIGHT_OFFERS[body.kind].durationDays);
  if (body.kind === "event") {
    startsAt = body.startsAt ? new Date(body.startsAt) : now;
    endsAt = body.endsAt ? new Date(body.endsAt) : addDays(startsAt, 1);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new TypeError("Event dates are invalid.");
    }
    if (endsAt <= now || endsAt <= startsAt) {
      throw new Error("Event end time must be in the future.");
    }
  }
  if (body.kind === "special" && special?.ends_at) {
    endsAt = minDate(endsAt, new Date(special.ends_at));
  }
  if (endsAt <= now) throw new Error("This promotion has already ended.");

  let duplicateQuery = db
    .selectFrom("venue_spotlight")
    .select("id")
    .where("location_id", "=", body.locationId)
    .where("kind", "=", body.kind)
    .where("status", "in", ["pending", "active"])
    .where("ends_at", ">", now);
  if (body.specialId) {
    duplicateQuery = duplicateQuery.where("special_id", "=", body.specialId);
  }
  if (await duplicateQuery.executeTakeFirst()) {
    throw new Error("This Spotlight promotion is already active or pending.");
  }

  const offer = SPOTLIGHT_OFFERS[body.kind];
  const isFree = syncPlan.freeSpotlightsPerMonth > 0;
  const entitlementMonth = isFree ? monthKey(now) : null;
  if (isFree) {
    const existingFree = await db
      .selectFrom("venue_spotlight")
      .select("id")
      .where("organization_id", "=", location.organization_id)
      .where("is_free", "=", true)
      .where("free_entitlement_month", "=", entitlementMonth)
      .executeTakeFirst();
    if (existingFree) {
      throw new Error(
        "This Sync plan's monthly free Spotlight is already used."
      );
    }
  }

  const spotlightId = randomUUID();
  const spotlight = await db.transaction().execute(async (transaction) => {
    const created = await transaction
      .insertInto("venue_spotlight")
      .values({
        created_at: now,
        description: body.description ?? special?.description ?? null,
        ends_at: endsAt,
        free_entitlement_month: entitlementMonth,
        id: spotlightId,
        is_free: isFree,
        kind: body.kind,
        location_id: body.locationId,
        organization_id: location.organization_id,
        payment_status: isFree ? "succeeded" : "unpaid",
        price_cents: offer.priceCents,
        special_id: special?.id ?? null,
        starts_at: startsAt,
        status: isFree ? "active" : "pending",
        stripe_checkout_session_id: null,
        stripe_payment_id: null,
        stripe_payment_intent_id: null,
        title: body.title ?? special?.title ?? location.name,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    if (isFree && special) {
      await transaction
        .updateTable("venue_special")
        .set({ featured: true, updated_at: now })
        .where("id", "=", special.id)
        .execute();
    }
    return created;
  });

  if (isFree) {
    return { free: true, spotlight: toSpotlight(spotlight) };
  }

  let checkoutSession;
  try {
    const stripe = getStripeClient();
    checkoutSession = await stripe.checkout.sessions.create(
      {
        cancel_url: cancelUrl,
        client_reference_id: spotlight.id,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `Chewbuu Spotlight: ${spotlight.title}` },
              unit_amount: offer.priceCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          app: "chewbuu",
          kind: body.kind,
          location_id: body.locationId,
          organization_id: location.organization_id,
          spotlight_id: spotlight.id,
        },
        mode: "payment",
        payment_intent_data: {
          metadata: {
            app: "chewbuu",
            kind: body.kind,
            location_id: body.locationId,
            organization_id: location.organization_id,
            spotlight_id: spotlight.id,
          },
        },
        success_url: successUrl,
      },
      {
        idempotencyKey: stripeIdempotencyKey(
          "spotlight-checkout",
          spotlight.id
        ),
      }
    );
  } catch (error) {
    await db
      .updateTable("venue_spotlight")
      .set({
        payment_status: "failed",
        status: "cancelled",
        updated_at: new Date(),
      })
      .where("id", "=", spotlight.id)
      .execute();
    throw error;
  }
  if (!checkoutSession.url) {
    await db
      .updateTable("venue_spotlight")
      .set({
        payment_status: "failed",
        status: "cancelled",
        updated_at: new Date(),
      })
      .where("id", "=", spotlight.id)
      .execute();
    throw new Error("Stripe did not return a checkout URL.");
  }
  const paymentIntentId =
    typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id;
  const updated = await db
    .updateTable("venue_spotlight")
    .set({
      stripe_checkout_session_id: checkoutSession.id,
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      updated_at: new Date(),
    })
    .where("id", "=", spotlight.id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return {
    checkoutSessionId: checkoutSession.id,
    checkoutUrl: checkoutSession.url,
    free: false,
    spotlight: toSpotlight(updated),
  };
};

export const listVenueSpotlights = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  const db = await getDb();
  await assertVenueMember(db, userId, locationId, isAdmin);
  const canManagePromotions = await hasPromotionManagerAccess(
    db,
    userId,
    locationId,
    isAdmin
  );
  await expireVenueSpotlights(db);
  const spotlights = await db
    .selectFrom("venue_spotlight")
    .innerJoin(
      "venue_location",
      "venue_location.id",
      "venue_spotlight.location_id"
    )
    .selectAll("venue_spotlight")
    .select("venue_location.name as location_name")
    .where("venue_spotlight.location_id", "=", locationId)
    .where("venue_spotlight.status", "in", ["pending", "active"])
    .orderBy("venue_spotlight.ends_at", "asc")
    .execute()
    .catch(() => []);
  return {
    canManagePromotions,
    spotlights: spotlights.map(toSpotlight),
  };
};

export const listPublicVenueSpotlights = async (
  input: PublicVenueDiscoveryInput = {}
) => {
  const body = z
    .object({
      area: z.string().trim().max(160).optional(),
      latitude: z.number().finite().min(-90).max(90).optional(),
      longitude: z.number().finite().min(-180).max(180).optional(),
      radiusMiles: z.number().int().min(1).max(250).default(25),
    })
    .parse(input);
  const db = await getDb();
  const now = new Date();
  await expireVenueSpotlights(db, now);
  let query = db
    .selectFrom("venue_spotlight")
    .innerJoin(
      "venue_location",
      "venue_location.id",
      "venue_spotlight.location_id"
    )
    .selectAll("venue_spotlight")
    .select([
      "venue_location.address as location_address",
      "venue_location.latitude as location_latitude",
      "venue_location.longitude as location_longitude",
      "venue_location.name as location_name",
    ])
    .where("venue_spotlight.status", "=", "active")
    .where("venue_spotlight.starts_at", "<=", now)
    .where("venue_spotlight.ends_at", ">", now)
    .where("venue_location.status", "in", publicVenueStatuses)
    .where("venue_location.stripe_identity_status", "=", "verified");

  const { latitude } = body;
  const { longitude } = body;
  const hasCoordinates = latitude !== undefined && longitude !== undefined;
  if (hasCoordinates) {
    const latitudeDelta = body.radiusMiles / 69;
    const longitudeDelta =
      body.radiusMiles / Math.max(1, 69 * Math.cos((latitude * Math.PI) / 180));
    query = query
      .where("venue_location.latitude", ">=", latitude - latitudeDelta)
      .where("venue_location.latitude", "<=", latitude + latitudeDelta)
      .where("venue_location.longitude", ">=", longitude - longitudeDelta)
      .where("venue_location.longitude", "<=", longitude + longitudeDelta);
  } else if (body.area) {
    const city = body.area.split(",")[0]?.trim() ?? body.area;
    query = query.where((expression) =>
      expression.or([
        expression("venue_location.name", "ilike", `%${city}%`),
        expression("venue_location.address", "ilike", `%${city}%`),
      ])
    );
  }

  const rows = await query
    .orderBy("venue_spotlight.starts_at", "asc")
    .orderBy("venue_spotlight.created_at", "desc")
    .limit(500)
    .execute()
    .catch(() => []);
  const filtered = hasCoordinates
    ? rows.filter((row) => {
        if (row.location_latitude === null || row.location_longitude === null) {
          return false;
        }
        const distance = distanceBetweenMiles(
          String(latitude),
          String(longitude),
          String(row.location_latitude),
          String(row.location_longitude)
        );
        return distance !== null && distance <= body.radiusMiles;
      })
    : rows;
  return { spotlights: filtered.map(toSpotlight) };
};
