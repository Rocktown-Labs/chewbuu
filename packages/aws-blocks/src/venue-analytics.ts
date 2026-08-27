import { randomUUID } from "node:crypto";

import type { Kysely } from "kysely";
import { z } from "zod";

import { getDb, jsonb } from "./database";
import type { BlocksDatabase } from "./database";
import type {
  VenueAnalytics,
  VenueJobListing,
  VenueOperationalEvent,
  VenueOperationalEventType,
  VenuePublicMenuItem,
  VenuePublicSummary,
  VenueSpecial,
  VenueTable,
} from "./types";
import { venueAccess } from "./venue-platform";

const eventTypeSchema: z.ZodType<VenueOperationalEventType> = z.enum([
  "arrived",
  "break_ended",
  "break_started",
  "clocked_in",
  "clocked_out",
  "cooking_started",
  "date_ended",
  "food_served",
  "left",
  "lunch_ended",
  "lunch_started",
  "order_completed",
  "order_submitted",
  "reservation_confirmed",
  "reservation_requested",
  "reservation_seated",
  "staff_late",
]);

const metadataSchema = z.record(z.string(), z.unknown()).default({});

const eventInputSchema = z.object({
  actorUserId: z.string().min(1).optional(),
  dateRequestId: z.string().min(1).optional(),
  diningSessionId: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  entityType: z.string().trim().min(1).max(50).optional(),
  eventType: eventTypeSchema,
  locationId: z.string().min(1),
  metadata: metadataSchema,
  occurredAt: z.iso.datetime().optional(),
  orderId: z.string().min(1).optional(),
  reservationId: z.string().min(1).optional(),
  source: z.enum(["guest", "staff", "system"]).default("staff"),
  tableId: z.string().min(1).optional(),
});

const specialInputSchema = z.object({
  category: z.string().trim().min(1).max(80).default("featured"),
  description: z.string().trim().max(1000).optional(),
  displayOrder: z.number().int().min(0).max(10_000).default(0),
  endsAt: z.iso.datetime().optional().nullable(),
  featured: z.boolean().default(false),
  locationId: z.string().min(1),
  priceText: z.string().trim().max(120).optional(),
  startsAt: z.iso.datetime().optional(),
  title: z.string().trim().min(1).max(160),
});

const tableInputSchema = z.object({
  capacity: z.number().int().min(1).max(100).default(2),
  label: z.string().trim().min(1).max(80),
  locationId: z.string().min(1),
  section: z.string().trim().max(80).optional(),
  status: z.enum(["available", "closed", "occupied"]).default("available"),
});

const toIso = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : undefined;

const toEvent = (event: {
  actor_user_id: string | null;
  date_request_id: string | null;
  dining_session_id: string | null;
  entity_id: string | null;
  entity_type: string | null;
  event_type: string;
  id: string;
  location_id: string;
  metadata: Record<string, unknown>;
  occurred_at: Date | string;
  order_id: string | null;
  reservation_id: string | null;
  source: string;
  table_id: string | null;
}): VenueOperationalEvent => ({
  ...(event.actor_user_id ? { actorUserId: event.actor_user_id } : {}),
  ...(event.date_request_id ? { dateRequestId: event.date_request_id } : {}),
  ...(event.dining_session_id
    ? { diningSessionId: event.dining_session_id }
    : {}),
  ...(event.entity_id ? { entityId: event.entity_id } : {}),
  ...(event.entity_type ? { entityType: event.entity_type } : {}),
  eventType: event.event_type as VenueOperationalEventType,
  id: event.id,
  locationId: event.location_id,
  metadata: event.metadata,
  occurredAt: new Date(event.occurred_at).toISOString(),
  ...(event.order_id ? { orderId: event.order_id } : {}),
  ...(event.reservation_id ? { reservationId: event.reservation_id } : {}),
  source: event.source,
  ...(event.table_id ? { tableId: event.table_id } : {}),
});

const toSpecial = (special: {
  category: string;
  description: string | null;
  display_order: number;
  ends_at: Date | string | null;
  featured: boolean;
  id: string;
  location_id: string;
  price_text: string | null;
  published_at: Date | string | null;
  starts_at: Date | string;
  status: string;
  title: string;
}): VenueSpecial => ({
  category: special.category,
  ...(special.description ? { description: special.description } : {}),
  displayOrder: special.display_order,
  ...(toIso(special.ends_at) ? { endsAt: toIso(special.ends_at) } : {}),
  featured: special.featured,
  id: special.id,
  locationId: special.location_id,
  ...(special.price_text ? { priceText: special.price_text } : {}),
  ...(toIso(special.published_at)
    ? { publishedAt: toIso(special.published_at) }
    : {}),
  startsAt: new Date(special.starts_at).toISOString(),
  status: special.status as VenueSpecial["status"],
  title: special.title,
});

const toPublicJob = (listing: {
  application_url: string | null;
  description: string;
  employment_type: string;
  expires_at: Date | string | null;
  id: string;
  location_id: string;
  pay_text: string | null;
  published_at: Date | string | null;
  schedule_text: string | null;
  status: string;
  title: string;
}): VenueJobListing => ({
  ...(listing.application_url
    ? { applicationUrl: listing.application_url }
    : {}),
  description: listing.description,
  employmentType: listing.employment_type,
  ...(toIso(listing.expires_at)
    ? { expiresAt: toIso(listing.expires_at) }
    : {}),
  id: listing.id,
  locationId: listing.location_id,
  ...(listing.pay_text ? { payText: listing.pay_text } : {}),
  ...(toIso(listing.published_at)
    ? { publishedAt: toIso(listing.published_at) }
    : {}),
  ...(listing.schedule_text ? { scheduleText: listing.schedule_text } : {}),
  status: "published",
  title: listing.title,
});

const toTable = (table: {
  capacity: number;
  id: string;
  label: string;
  location_id: string;
  section: string | null;
  status: string;
}): VenueTable => ({
  capacity: table.capacity,
  id: table.id,
  label: table.label,
  locationId: table.location_id,
  ...(table.section ? { section: table.section } : {}),
  status: table.status,
});

const assertLocation = async (
  db: Kysely<BlocksDatabase>,
  locationId: string
) => {
  const location = await db
    .selectFrom("venue_location")
    .select(["id", "organization_id"])
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");
  return location;
};

const average = (values: number[]) =>
  values.length
    ? Math.round(
        (values.reduce((sum, value) => sum + value, 0) / values.length) * 10
      ) / 10
    : null;

interface OperationalEventRow {
  date_request_id: string | null;
  dining_session_id: string | null;
  entity_id: string | null;
  entity_type: string | null;
  event_type: string;
  occurred_at: Date | string;
  order_id: string | null;
}

const groupEvents = (
  events: OperationalEventRow[],
  keySelector: (event: OperationalEventRow) => string | null
) => {
  const grouped = new Map<string, Map<VenueOperationalEventType, Date>>();
  for (const event of events) {
    const key = keySelector(event);
    if (!key) continue;
    const current = grouped.get(key) ?? new Map();
    current.set(
      event.event_type as VenueOperationalEventType,
      new Date(event.occurred_at)
    );
    grouped.set(key, current);
  }
  return grouped;
};

const sessionEventKey = (event: OperationalEventRow) =>
  event.dining_session_id
    ? `session:${event.dining_session_id}`
    : event.date_request_id
      ? `date:${event.date_request_id}`
      : event.entity_type === "dining_session" && event.entity_id
        ? `session:${event.entity_id}`
        : null;

const orderEventKey = (event: OperationalEventRow) =>
  event.order_id ? `order:${event.order_id}` : null;

export const recordVenueOperationalEvent = async (
  userId: string | undefined,
  isAdmin: boolean,
  input: unknown
) => {
  const body = eventInputSchema.parse(input);
  const db = await getDb();
  await assertLocation(db, body.locationId);
  if (userId && body.source === "guest") {
    const [session, order, reservation] = await Promise.all([
      body.diningSessionId
        ? db
            .selectFrom("venue_dining_session")
            .select("id")
            .where("id", "=", body.diningSessionId)
            .where("location_id", "=", body.locationId)
            .where("user_id", "=", userId)
            .executeTakeFirst()
        : undefined,
      body.orderId
        ? db
            .selectFrom("venue_order")
            .select("id")
            .where("id", "=", body.orderId)
            .where("location_id", "=", body.locationId)
            .where("user_id", "=", userId)
            .executeTakeFirst()
        : undefined,
      body.reservationId
        ? db
            .selectFrom("venue_reservation")
            .select("id")
            .where("id", "=", body.reservationId)
            .where("location_id", "=", body.locationId)
            .where("guest_user_id", "=", userId)
            .executeTakeFirst()
        : undefined,
    ]);
    if (!(session || order || reservation)) {
      throw new Error("Guest event must belong to the guest's venue record");
    }
  } else if (userId && !(await venueAccess(userId, body.locationId, isAdmin))) {
    throw new Error("Venue access required");
  }

  const event = await db
    .insertInto("venue_operational_event")
    .values({
      actor_user_id: body.actorUserId ?? userId ?? null,
      created_at: new Date(),
      date_request_id: body.dateRequestId ?? null,
      dining_session_id: body.diningSessionId ?? null,
      entity_id: body.entityId ?? null,
      entity_type: body.entityType ?? null,
      event_type: body.eventType,
      id: randomUUID(),
      location_id: body.locationId,
      metadata: jsonb(body.metadata),
      occurred_at: body.occurredAt ? new Date(body.occurredAt) : new Date(),
      order_id: body.orderId ?? null,
      reservation_id: body.reservationId ?? null,
      source: body.source,
      table_id: body.tableId ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return { event: toEvent(event) };
};

export const getVenueAnalytics = async (
  userId: string,
  locationId: string,
  isAdmin: boolean,
  input?: unknown
): Promise<VenueAnalytics> => {
  const body = z
    .object({
      endAt: z.iso.datetime().optional(),
      startAt: z.iso.datetime().optional(),
    })
    .parse(input ?? {});
  if (!(await venueAccess(userId, locationId, isAdmin))) {
    throw new Error("Venue access required");
  }
  const endAt = body.endAt ? new Date(body.endAt) : new Date();
  const startAt = body.startAt
    ? new Date(body.startAt)
    : new Date(endAt.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (startAt >= endAt) throw new Error("Analytics start must be before end");

  const db = await getDb();
  const [events, orders, reservations] = await Promise.all([
    db
      .selectFrom("venue_operational_event")
      .select([
        "date_request_id",
        "dining_session_id",
        "entity_id",
        "entity_type",
        "event_type",
        "occurred_at",
        "order_id",
      ])
      .where("location_id", "=", locationId)
      .where("occurred_at", ">=", startAt)
      .where("occurred_at", "<=", endAt)
      .orderBy("occurred_at", "asc")
      .limit(50_000)
      .execute(),
    db
      .selectFrom("venue_order")
      .select(["status", "tip_cents", "total_cents"])
      .where("location_id", "=", locationId)
      .where("created_at", ">=", startAt)
      .where("created_at", "<=", endAt)
      .execute(),
    db
      .selectFrom("venue_reservation")
      .select(["party_size"])
      .where("location_id", "=", locationId)
      .where("requested_at", ">=", startAt)
      .where("requested_at", "<=", endAt)
      .execute(),
  ]);

  const sessionEvents = groupEvents(events, sessionEventKey);
  const orderEvents = groupEvents(events, orderEventKey);
  const foodWaitMinutes: number[] = [];
  const kitchenMinutes: number[] = [];
  const dateDurationMinutes: number[] = [];
  for (const timeline of sessionEvents.values()) {
    const arrived = timeline.get("arrived");
    const foodServed = timeline.get("food_served");
    const dateEnded = timeline.get("date_ended");
    if (arrived && foodServed && foodServed >= arrived) {
      foodWaitMinutes.push((foodServed.getTime() - arrived.getTime()) / 60_000);
    }
    if (arrived && dateEnded && dateEnded >= arrived) {
      dateDurationMinutes.push(
        (dateEnded.getTime() - arrived.getTime()) / 60_000
      );
    }
  }
  for (const timeline of orderEvents.values()) {
    const cookingStarted = timeline.get("cooking_started");
    const foodServed = timeline.get("food_served");
    if (cookingStarted && foodServed && foodServed >= cookingStarted) {
      kitchenMinutes.push(
        (foodServed.getTime() - cookingStarted.getTime()) / 60_000
      );
    }
  }

  const completedOrders = orders.filter(
    (order) => order.status === "completed"
  );
  return {
    averageCostCents: completedOrders.length
      ? Math.round(
          completedOrders.reduce((sum, order) => sum + order.total_cents, 0) /
            completedOrders.length
        )
      : null,
    averageDateMinutes: average(dateDurationMinutes),
    averageFoodWaitMinutes: average(foodWaitMinutes),
    averageKitchenMinutes: average(kitchenMinutes),
    completedOrders: completedOrders.length,
    eventCount: events.length,
    orderCount: orders.length,
    reservationCount: reservations.length,
    sampleSizes: {
      cost: completedOrders.length,
      dateDuration: dateDurationMinutes.length,
      foodWait: foodWaitMinutes.length,
      kitchen: kitchenMinutes.length,
    },
    tipCents: orders.reduce((sum, order) => sum + order.tip_cents, 0),
    totalCovers: reservations.reduce(
      (sum, reservation) => sum + reservation.party_size,
      0
    ),
  };
};

export const getVenueTimeline = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (!(await venueAccess(userId, locationId, isAdmin))) {
    throw new Error("Venue access required");
  }
  const db = await getDb();
  const events = await db
    .selectFrom("venue_operational_event")
    .selectAll()
    .where("location_id", "=", locationId)
    .orderBy("occurred_at", "desc")
    .limit(250)
    .execute();
  return { events: events.map(toEvent) };
};

export const listVenueSpecials = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (!(await venueAccess(userId, locationId, isAdmin))) {
    throw new Error("Venue access required");
  }
  const db = await getDb();
  const specials = await db
    .selectFrom("venue_special")
    .selectAll()
    .where("location_id", "=", locationId)
    .orderBy("display_order", "asc")
    .orderBy("starts_at", "desc")
    .limit(250)
    .execute();
  return { specials: specials.map(toSpecial) };
};

export const listPublicVenueSpecials = async (input?: unknown) => {
  const body = z
    .object({
      category: z.string().trim().max(80).optional(),
      locationId: z.string().min(1).optional(),
    })
    .parse(input ?? {});
  const db = await getDb();
  const now = new Date();
  let query = db
    .selectFrom("venue_special")
    .innerJoin(
      "venue_location",
      "venue_location.id",
      "venue_special.location_id"
    )
    .selectAll("venue_special")
    .where("venue_special.status", "=", "published")
    .where("venue_location.status", "in", ["claimed", "live", "verified"])
    .where("venue_location.stripe_identity_status", "=", "verified")
    .where("starts_at", "<=", now)
    .where((expression) =>
      expression.or([
        expression("ends_at", "is", null),
        expression("ends_at", ">", now),
      ])
    );
  if (body.locationId)
    query = query.where("venue_special.location_id", "=", body.locationId);
  if (body.category)
    query = query.where("venue_special.category", "=", body.category);
  const specials = await query
    .orderBy("featured", "desc")
    .orderBy("display_order", "asc")
    .orderBy("starts_at", "desc")
    .limit(100)
    .execute();
  return { specials: specials.map(toSpecial) };
};

export const createVenueSpecial = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = specialInputSchema.parse(input);
  if (!(await venueAccess(userId, body.locationId, isAdmin))) {
    throw new Error("Venue access required");
  }
  const db = await getDb();
  await assertLocation(db, body.locationId);
  const now = new Date();
  const special = await db
    .insertInto("venue_special")
    .values({
      category: body.category,
      created_at: now,
      created_by_user_id: userId,
      description: body.description ?? null,
      display_order: body.displayOrder,
      ends_at: body.endsAt ? new Date(body.endsAt) : null,
      featured: body.featured,
      id: randomUUID(),
      location_id: body.locationId,
      price_text: body.priceText ?? null,
      published_at: null,
      starts_at: body.startsAt ? new Date(body.startsAt) : now,
      status: "draft",
      title: body.title,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return { special: toSpecial(special) };
};

export const updateVenueSpecial = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = specialInputSchema
    .partial()
    .extend({
      id: z.string().min(1),
      status: z.enum(["archived", "draft", "published"]).optional(),
    })
    .parse(input);
  const db = await getDb();
  const existing = await db
    .selectFrom("venue_special")
    .select(["id", "location_id"])
    .where("id", "=", body.id)
    .executeTakeFirst();
  if (!existing) throw new Error("Special not found");
  if (!(await venueAccess(userId, existing.location_id, isAdmin))) {
    throw new Error("Venue access required");
  }
  const now = new Date();
  const special = await db
    .updateTable("venue_special")
    .set({
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.description !== undefined
        ? { description: body.description ?? null }
        : {}),
      ...(body.displayOrder !== undefined
        ? { display_order: body.displayOrder }
        : {}),
      ...(body.endsAt !== undefined
        ? { ends_at: body.endsAt ? new Date(body.endsAt) : null }
        : {}),
      ...(body.featured !== undefined ? { featured: body.featured } : {}),
      ...(body.priceText !== undefined
        ? { price_text: body.priceText ?? null }
        : {}),
      ...(body.startsAt !== undefined
        ? { starts_at: body.startsAt ? new Date(body.startsAt) : now }
        : {}),
      ...(body.status !== undefined
        ? {
            published_at: body.status === "published" ? now : null,
            status: body.status,
          }
        : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      updated_at: now,
    })
    .where("id", "=", body.id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return { special: toSpecial(special) };
};

export const setVenuePublicAnalytics = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      enabled: z.boolean(),
      locationId: z.string().min(1),
      minSamples: z.number().int().min(5).max(10_000).default(5),
    })
    .parse(input);
  if (!(await venueAccess(userId, body.locationId, isAdmin))) {
    throw new Error("Venue access required");
  }
  const db = await getDb();
  const location = await db
    .updateTable("venue_location")
    .set({
      public_analytics_enabled: body.enabled,
      public_analytics_min_samples: body.minSamples,
      updated_at: new Date(),
    })
    .where("id", "=", body.locationId)
    .returning([
      "id",
      "public_analytics_enabled",
      "public_analytics_min_samples",
    ])
    .executeTakeFirstOrThrow();
  return {
    enabled: location.public_analytics_enabled,
    locationId: location.id,
    minSamples: location.public_analytics_min_samples,
  };
};

const publicVenueStatuses = ["claimed", "live", "verified"] as const;

const isPublicVenue = (location: {
  status: string;
  stripe_identity_status: string;
}) =>
  publicVenueStatuses.includes(
    location.status as (typeof publicVenueStatuses)[number]
  ) && location.stripe_identity_status === "verified";

const toPublicMenuItem = (item: {
  description: string | null;
  id: string;
  name: string;
  price_cents: number;
  section: string | null;
}): VenuePublicMenuItem => ({
  ...(item.description ? { description: item.description } : {}),
  id: item.id,
  name: item.name,
  priceCents: item.price_cents,
  ...(item.section ? { section: item.section } : {}),
});

export const listPublicVenueLocations = async () => {
  const db = await getDb();
  const locations = await db
    .selectFrom("venue_location")
    .select([
      "address",
      "handle",
      "id",
      "name",
      "status",
      "stripe_identity_status",
    ])
    .where("status", "in", publicVenueStatuses)
    .where("stripe_identity_status", "=", "verified")
    .where("handle", "is not", null)
    .orderBy("name", "asc")
    .limit(100)
    .execute();
  return {
    locations: locations.flatMap((location) =>
      location.handle
        ? [
            {
              address: location.address ?? undefined,
              handle: location.handle,
              id: location.id,
              name: location.name,
            },
          ]
        : []
    ),
  };
};

export const getVenuePublicSummary = async (
  locationId: string
): Promise<VenuePublicSummary> => {
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select([
      "address",
      "handle",
      "id",
      "name",
      "public_analytics_enabled",
      "public_analytics_min_samples",
      "status",
      "stripe_identity_status",
      "website_url",
    ])
    .where((expression) =>
      expression.or([
        expression("id", "=", locationId),
        expression("handle", "=", locationId),
      ])
    )
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");
  if (!isPublicVenue(location)) throw new Error("Spot is not published");

  const [specialsResult, menuItems, jobs] = await Promise.all([
    listPublicVenueSpecials({ locationId: location.id }),
    db
      .selectFrom("venue_menu_item")
      .select(["description", "id", "name", "price_cents", "section"])
      .where("location_id", "=", location.id)
      .where("status", "=", "published")
      .orderBy("sort_order", "asc")
      .orderBy("name", "asc")
      .execute(),
    db
      .selectFrom("venue_job_listing")
      .select([
        "application_url",
        "description",
        "employment_type",
        "expires_at",
        "id",
        "location_id",
        "pay_text",
        "published_at",
        "schedule_text",
        "status",
        "title",
      ])
      .where("location_id", "=", location.id)
      .where("status", "=", "published")
      .where((expression) =>
        expression.or([
          expression("expires_at", "is", null),
          expression("expires_at", ">", new Date()),
        ])
      )
      .orderBy("created_at", "desc")
      .limit(20)
      .execute(),
  ]);
  const publicFields = {
    ...(location.address ? { address: location.address } : {}),
    handle: location.handle ?? location.id,
    jobs: jobs.map(toPublicJob),
    locationId: location.id,
    menuItems: menuItems.map(toPublicMenuItem),
    name: location.name,
    specials: specialsResult.specials,
    ...(location.website_url ? { websiteUrl: location.website_url } : {}),
  };
  if (!location.public_analytics_enabled) {
    return {
      ...publicFields,
      averageCostCents: null,
      averageFoodWaitMinutes: null,
      sampleSize: 0,
    };
  }

  const [orders, events] = await Promise.all([
    db
      .selectFrom("venue_order")
      .select(["payment_status", "status", "total_cents"])
      .where("location_id", "=", location.id)
      .where("payment_status", "=", "paid")
      .where("status", "=", "completed")
      .execute(),
    db
      .selectFrom("venue_operational_event")
      .select([
        "date_request_id",
        "dining_session_id",
        "entity_id",
        "entity_type",
        "event_type",
        "occurred_at",
        "order_id",
      ])
      .where("location_id", "=", location.id)
      .orderBy("occurred_at", "asc")
      .execute(),
  ]);
  if (orders.length < location.public_analytics_min_samples) {
    return {
      ...publicFields,
      averageCostCents: null,
      averageFoodWaitMinutes: null,
      sampleSize: orders.length,
    };
  }

  const grouped = groupEvents(events, sessionEventKey);
  const waits: number[] = [];
  for (const timeline of grouped.values()) {
    const arrived = timeline.get("arrived");
    const served = timeline.get("food_served");
    if (arrived && served && served >= arrived) {
      waits.push((served.getTime() - arrived.getTime()) / 60_000);
    }
  }
  return {
    ...publicFields,
    averageCostCents: Math.round(
      orders.reduce((sum, order) => sum + order.total_cents, 0) / orders.length
    ),
    averageFoodWaitMinutes: average(waits),
    sampleSize: orders.length,
  };
};

export const listVenueTables = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (!(await venueAccess(userId, locationId, isAdmin))) {
    throw new Error("Venue access required");
  }
  const db = await getDb();
  const tables = await db
    .selectFrom("venue_table")
    .selectAll()
    .where("location_id", "=", locationId)
    .orderBy("label", "asc")
    .execute();
  return { tables: tables.map(toTable) };
};

export const upsertVenueTable = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = tableInputSchema.parse(input);
  if (!(await venueAccess(userId, body.locationId, isAdmin))) {
    throw new Error("Venue access required");
  }
  const db = await getDb();
  const table = await db
    .insertInto("venue_table")
    .values({
      capacity: body.capacity,
      created_at: new Date(),
      id: randomUUID(),
      label: body.label,
      location_id: body.locationId,
      section: body.section ?? null,
      status: body.status,
      updated_at: new Date(),
    })
    .onConflict((conflict) =>
      conflict.columns(["location_id", "label"]).doUpdateSet({
        capacity: body.capacity,
        section: body.section ?? null,
        status: body.status,
        updated_at: new Date(),
      })
    )
    .returningAll()
    .executeTakeFirstOrThrow();
  return { table: toTable(table) };
};

export const endVenueDiningSession = async (
  userId: string,
  isAdmin: boolean,
  sessionId: string
) => {
  const db = await getDb();
  const session = await db
    .selectFrom("venue_dining_session")
    .select(["id", "location_id", "reservation_id", "table_label"])
    .where("id", "=", sessionId)
    .executeTakeFirst();
  if (!session) throw new Error("Dining session not found");
  if (!(await venueAccess(userId, session.location_id, isAdmin))) {
    throw new Error("Venue access required");
  }
  const endedAt = new Date();
  const updated = await db
    .updateTable("venue_dining_session")
    .set({ ended_at: endedAt })
    .where("id", "=", sessionId)
    .where("ended_at", "is", null)
    .returning([
      "id",
      "location_id",
      "reservation_id",
      "table_label",
      "ended_at",
    ])
    .executeTakeFirst();
  if (!updated) throw new Error("Dining session has already ended");
  await recordVenueOperationalEvent(userId, isAdmin, {
    dateRequestId: undefined,
    diningSessionId: updated.id,
    entityId: updated.id,
    entityType: "dining_session",
    eventType: "date_ended",
    locationId: updated.location_id,
    metadata: { tableLabel: updated.table_label },
    reservationId: updated.reservation_id ?? undefined,
    source: "staff",
  });
  return { endedAt: endedAt.toISOString(), sessionId: updated.id };
};
