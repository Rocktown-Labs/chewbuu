import { randomUUID } from "node:crypto";

import type { Kysely } from "kysely";
import { z } from "zod";

import { getDb, jsonb } from "./database";
import type { BlocksDatabase } from "./database";
import type {
  VenueLocation,
  VenueOrder,
  VenueReferral,
  VenueReservation,
  VenueWorkspace,
} from "./types";
import { previewVenueMenu } from "./venue-menu";

const httpUrl = z
  .url()
  .refine(
    (value) => value.startsWith("https://") || value.startsWith("http://"),
    "URL must use http or https"
  );

const venueLocationInputSchema = z.object({
  address: z.string().trim().max(500).optional(),
  discoveryPlaceId: z.string().trim().max(300).optional(),
  menuUrl: httpUrl.optional(),
  name: z.string().trim().min(1).max(160),
  organizationName: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().max(50).optional(),
  venueRole: z.enum(["owner", "referrer"]).default("referrer"),
  websiteUrl: httpUrl.optional(),
});

const menuPreviewInputSchema = z.object({ url: httpUrl });

const toVenueLocation = (location: {
  address: string | null;
  id: string;
  menu_url: string | null;
  name: string;
  organization_id: string;
  status: string;
  website_url: string | null;
}): VenueLocation => ({
  ...(location.address ? { address: location.address } : {}),
  id: location.id,
  ...(location.menu_url ? { menuUrl: location.menu_url } : {}),
  name: location.name,
  organizationId: location.organization_id,
  status: location.status as VenueLocation["status"],
  ...(location.website_url ? { websiteUrl: location.website_url } : {}),
});

const toVenueReferral = (referral: {
  id: string;
  location_id: string;
  reward_amount_cents: number;
  status: string;
}): VenueReferral => ({
  id: referral.id,
  locationId: referral.location_id,
  rewardAmountCents: referral.reward_amount_cents,
  status: referral.status as VenueReferral["status"],
});

const toVenueOrder = (order: {
  assigned_staff_user_id: string | null;
  currency: string;
  id: string;
  location_id: string;
  payment_status: string;
  status: string;
  subtotal_cents: number;
  tip_cents: number;
  total_cents: number;
}): VenueOrder => ({
  ...(order.assigned_staff_user_id
    ? { assignedStaffUserId: order.assigned_staff_user_id }
    : {}),
  currency: order.currency,
  id: order.id,
  locationId: order.location_id,
  paymentStatus: order.payment_status,
  status: order.status,
  subtotalCents: order.subtotal_cents,
  tipCents: order.tip_cents,
  totalCents: order.total_cents,
});

const createReferral = async (
  db: Kysely<BlocksDatabase>,
  locationId: string,
  userId: string
) => {
  const id = randomUUID();
  await db
    .insertInto("venue_referral")
    .values({
      id,
      location_id: locationId,
      referrer_user_id: userId,
      reward_amount_cents: 5000,
      status: "referred",
    })
    .onConflict((builder) =>
      builder.columns(["location_id", "referrer_user_id"]).doNothing()
    )
    .execute();

  const referral = await db
    .selectFrom("venue_referral")
    .select(["id", "location_id", "reward_amount_cents", "status"])
    .where("location_id", "=", locationId)
    .where("referrer_user_id", "=", userId)
    .executeTakeFirstOrThrow();
  return toVenueReferral(referral);
};

export const captureVenueMenu = async (
  userId: string,
  locationId: string,
  input: unknown
) => {
  const { url } = menuPreviewInputSchema.parse(input);
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select("id")
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");

  const result = await previewVenueMenu({ url });
  if (result.preview) {
    await db
      .insertInto("venue_menu")
      .values({
        extracted_data: jsonb(result.preview),
        id: randomUUID(),
        location_id: locationId,
        source_kind: "firecrawl",
        source_url: url,
        status: "unverified",
        submitted_by_user_id: userId,
      })
      .execute();
  }
  return result;
};

export const createVenueLocation = async (userId: string, input: unknown) => {
  const parsed = venueLocationInputSchema.parse(input);
  const db = await getDb();

  let location = parsed.discoveryPlaceId
    ? await db
        .selectFrom("venue_location")
        .select([
          "address",
          "id",
          "menu_url",
          "name",
          "organization_id",
          "status",
          "website_url",
        ])
        .where("discovery_place_id", "=", parsed.discoveryPlaceId)
        .executeTakeFirst()
    : undefined;

  if (!location) {
    const organizationId = randomUUID();
    const locationId = randomUUID();
    const slug = `${(parsed.organizationName ?? parsed.name)
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "")}-${locationId.slice(0, 8)}`;

    await db.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("venue_organization")
        .values({
          created_by_user_id: userId,
          id: organizationId,
          name: parsed.organizationName ?? parsed.name,
          slug,
          status: "active",
        })
        .execute();
      await transaction
        .insertInto("venue_location")
        .values({
          address: parsed.address,
          discovery_place_id: parsed.discoveryPlaceId,
          id: locationId,
          menu_url: parsed.menuUrl,
          name: parsed.name,
          organization_id: organizationId,
          phone: parsed.phone,
          status: "unclaimed",
          submitted_by_user_id: userId,
          website_url: parsed.websiteUrl,
        })
        .execute();
      await transaction
        .insertInto("venue_contribution")
        .values({
          id: randomUUID(),
          kind: "venue_submission",
          location_id: locationId,
          media_urls: jsonb([]),
          payload: jsonb({
            address: parsed.address,
            menuUrl: parsed.menuUrl,
            phone: parsed.phone,
            websiteUrl: parsed.websiteUrl,
          }),
          status: "pending",
          submitted_by_user_id: userId,
        })
        .execute();
    });

    location = await db
      .selectFrom("venue_location")
      .select([
        "address",
        "id",
        "menu_url",
        "name",
        "organization_id",
        "status",
        "website_url",
      ])
      .where("id", "=", locationId)
      .executeTakeFirstOrThrow();
  }

  const referral =
    parsed.venueRole === "owner"
      ? undefined
      : await createReferral(db, location.id, userId);
  return {
    location: toVenueLocation(location),
    ...(referral ? { referral } : {}),
  };
};

export const followVenue = async (userId: string, locationId: string) => {
  const db = await getDb();
  const existing = await db
    .selectFrom("venue_follow")
    .select("id")
    .where("location_id", "=", locationId)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (existing) {
    await db.deleteFrom("venue_follow").where("id", "=", existing.id).execute();
    return { following: false };
  }

  await db
    .insertInto("venue_follow")
    .values({ id: randomUUID(), location_id: locationId, user_id: userId })
    .execute();
  return { following: true };
};

export const createVenueReferral = async (
  userId: string,
  locationId: string
) => {
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select("id")
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");

  return { referral: await createReferral(db, locationId, userId) };
};

export const requestVenueClaim = async (
  userId: string,
  locationId: string,
  input: unknown
) => {
  const claimInput = z
    .object({ claimNote: z.string().trim().max(1000).optional() })
    .parse(input ?? {});
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select(["id", "status"])
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");
  if (location.status === "claimed" || location.status === "verified") {
    return { status: "already_requested" as const };
  }

  const existing = await db
    .selectFrom("venue_contribution")
    .select("id")
    .where("location_id", "=", locationId)
    .where("submitted_by_user_id", "=", userId)
    .where("kind", "=", "claim_request")
    .where("status", "=", "pending")
    .executeTakeFirst();
  if (existing) return { status: "already_requested" as const };

  await db
    .insertInto("venue_contribution")
    .values({
      id: randomUUID(),
      kind: "claim_request",
      location_id: locationId,
      media_urls: jsonb([]),
      payload: jsonb({ claimNote: claimInput.claimNote }),
      status: "pending",
      submitted_by_user_id: userId,
    })
    .execute();
  await db
    .updateTable("venue_location")
    .set({ status: "claim_requested", updated_at: new Date() })
    .where("id", "=", locationId)
    .execute();
  return { status: "requested" as const };
};

const venueAccess = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (isAdmin) return true;
  const db = await getDb();
  const member = await db
    .selectFrom("venue_member")
    .innerJoin(
      "venue_location",
      "venue_location.organization_id",
      "venue_member.organization_id"
    )
    .select("venue_member.id")
    .where("venue_location.id", "=", locationId)
    .where("venue_member.user_id", "=", userId)
    .where("venue_member.status", "=", "active")
    .executeTakeFirst();
  return Boolean(member);
};

const toReservation = (reservation: {
  assigned_staff_user_id: string | null;
  id: string;
  location_id: string;
  notes: string | null;
  party_size: number;
  requested_at: Date | string;
  status: string;
  table_label: string | null;
}): VenueReservation => ({
  ...(reservation.assigned_staff_user_id
    ? { assignedStaffUserId: reservation.assigned_staff_user_id }
    : {}),
  id: reservation.id,
  locationId: reservation.location_id,
  ...(reservation.notes ? { notes: reservation.notes } : {}),
  partySize: reservation.party_size,
  requestedAt: new Date(reservation.requested_at).toISOString(),
  status: reservation.status,
  ...(reservation.table_label ? { tableLabel: reservation.table_label } : {}),
});

export const approveVenueClaim = async (
  reviewerUserId: string,
  locationId: string
) => {
  const db = await getDb();
  const claim = await db
    .selectFrom("venue_contribution")
    .select(["id", "submitted_by_user_id"])
    .where("location_id", "=", locationId)
    .where("kind", "=", "claim_request")
    .where("status", "=", "pending")
    .orderBy("created_at", "desc")
    .executeTakeFirst();
  if (!claim) throw new Error("No pending claim request found");

  const location = await db
    .selectFrom("venue_location")
    .select(["id", "organization_id"])
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");

  await db.transaction().execute(async (transaction) => {
    await transaction
      .updateTable("venue_contribution")
      .set({
        reviewed_at: new Date(),
        reviewed_by_user_id: reviewerUserId,
        status: "approved",
        updated_at: new Date(),
      })
      .where("id", "=", claim.id)
      .execute();
    await transaction
      .updateTable("venue_location")
      .set({
        claimed_at: new Date(),
        status: "claimed",
        updated_at: new Date(),
      })
      .where("id", "=", locationId)
      .execute();
    await transaction
      .insertInto("venue_member")
      .values({
        id: randomUUID(),
        organization_id: location.organization_id,
        role: "owner",
        status: "active",
        user_id: claim.submitted_by_user_id,
      })
      .onConflict((conflict) =>
        conflict.columns(["organization_id", "user_id"]).doUpdateSet({
          role: "owner",
          status: "active",
          updated_at: new Date(),
        })
      )
      .execute();
  });
  return {
    ownerUserId: claim.submitted_by_user_id,
    status: "claimed" as const,
  };
};

export const getVenueWorkspace = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
): Promise<VenueWorkspace> => {
  const db = await getDb();
  const canAccess = await venueAccess(userId, locationId, isAdmin);
  if (!canAccess) throw new Error("Venue access required");

  const location = await db
    .selectFrom("venue_location")
    .select([
      "address",
      "id",
      "menu_url",
      "name",
      "organization_id",
      "status",
      "website_url",
    ])
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");

  const [reservations, orders] = await Promise.all([
    db
      .selectFrom("venue_reservation")
      .select([
        "assigned_staff_user_id",
        "id",
        "location_id",
        "notes",
        "party_size",
        "requested_at",
        "status",
        "table_label",
      ])
      .where("location_id", "=", locationId)
      .orderBy("requested_at", "asc")
      .limit(100)
      .execute(),
    db
      .selectFrom("venue_order")
      .select([
        "assigned_staff_user_id",
        "currency",
        "id",
        "location_id",
        "payment_status",
        "status",
        "subtotal_cents",
        "tip_cents",
        "total_cents",
      ])
      .where("location_id", "=", locationId)
      .orderBy("created_at", "desc")
      .limit(100)
      .execute(),
  ]);

  return {
    location: toVenueLocation(location),
    orders: orders.map(toVenueOrder),
    reservations: reservations.map(toReservation),
  };
};

const orderStatusSchema = z.enum([
  "accepted",
  "cancelled",
  "completed",
  "draft",
  "preparing",
  "ready",
  "served",
  "submitted",
]);

export const updateVenueOrder = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const orderInput = z
    .object({
      assignedStaffUserId: z.string().min(1).optional(),
      orderId: z.string().min(1),
      status: orderStatusSchema,
    })
    .parse(input);
  const db = await getDb();
  const existing = await db
    .selectFrom("venue_order")
    .select(["id", "location_id"])
    .where("id", "=", orderInput.orderId)
    .executeTakeFirst();
  if (!existing) throw new Error("Order not found");
  if (!(await venueAccess(userId, existing.location_id, isAdmin))) {
    throw new Error("Venue access required");
  }

  const order = await db
    .updateTable("venue_order")
    .set({
      ...(orderInput.assignedStaffUserId
        ? { assigned_staff_user_id: orderInput.assignedStaffUserId }
        : {}),
      status: orderInput.status,
      updated_at: new Date(),
    })
    .where("id", "=", orderInput.orderId)
    .returning([
      "assigned_staff_user_id",
      "currency",
      "id",
      "location_id",
      "payment_status",
      "status",
      "subtotal_cents",
      "tip_cents",
      "total_cents",
    ])
    .executeTakeFirstOrThrow();
  return { order: toVenueOrder(order) };
};

const reservationStatusSchema = z.enum([
  "cancelled",
  "completed",
  "confirmed",
  "declined",
  "requested",
  "seated",
]);

export const updateVenueReservation = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const reservationInput = z
    .object({
      assignedStaffUserId: z.string().min(1).optional(),
      reservationId: z.string().min(1),
      status: reservationStatusSchema,
      tableLabel: z.string().trim().max(80).optional(),
    })
    .parse(input);
  const db = await getDb();
  const existing = await db
    .selectFrom("venue_reservation")
    .select(["guest_user_id", "id", "location_id"])
    .where("id", "=", reservationInput.reservationId)
    .executeTakeFirst();
  if (!existing) throw new Error("Reservation not found");
  if (!(await venueAccess(userId, existing.location_id, isAdmin))) {
    throw new Error("Venue access required");
  }

  const reservation = await db
    .updateTable("venue_reservation")
    .set({
      ...(reservationInput.assignedStaffUserId
        ? { assigned_staff_user_id: reservationInput.assignedStaffUserId }
        : {}),
      ...(reservationInput.tableLabel
        ? { table_label: reservationInput.tableLabel }
        : {}),
      status: reservationInput.status,
      updated_at: new Date(),
    })
    .where("id", "=", reservationInput.reservationId)
    .returning([
      "assigned_staff_user_id",
      "id",
      "location_id",
      "notes",
      "party_size",
      "requested_at",
      "status",
      "table_label",
    ])
    .executeTakeFirstOrThrow();
  return {
    guestUserId: existing.guest_user_id,
    reservation: toReservation(reservation),
  };
};

export const requestVenueReservation = async (
  userId: string,
  input: unknown
) => {
  const reservationInput = z
    .object({
      locationId: z.string().min(1),
      notes: z.string().trim().max(1000).optional(),
      partySize: z.number().int().min(1).max(50),
      requestedAt: z.iso.datetime(),
    })
    .parse(input);
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select("id")
    .where("id", "=", reservationInput.locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");

  const reservation = await db
    .insertInto("venue_reservation")
    .values({
      assigned_staff_user_id: null,
      guest_user_id: userId,
      id: randomUUID(),
      location_id: reservationInput.locationId,
      notes: reservationInput.notes,
      party_size: reservationInput.partySize,
      requested_at: new Date(reservationInput.requestedAt),
      status: "requested",
    })
    .returning([
      "assigned_staff_user_id",
      "id",
      "location_id",
      "notes",
      "party_size",
      "requested_at",
      "status",
      "table_label",
    ])
    .executeTakeFirstOrThrow();
  return { reservation: toReservation(reservation) };
};

export const startVenueDiningSession = async (
  userId: string,
  input: unknown
) => {
  const sessionInput = z
    .object({
      locationId: z.string().min(1),
      reservationId: z.string().min(1).optional(),
      tableLabel: z.string().trim().max(80).optional(),
    })
    .parse(input);
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select("id")
    .where("id", "=", sessionInput.locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");
  if (sessionInput.reservationId) {
    const reservation = await db
      .selectFrom("venue_reservation")
      .select(["id", "guest_user_id", "location_id"])
      .where("id", "=", sessionInput.reservationId)
      .executeTakeFirst();
    if (
      !reservation ||
      reservation.guest_user_id !== userId ||
      reservation.location_id !== sessionInput.locationId
    ) {
      throw new Error("Reservation is not available for this dining session");
    }
  }

  const session = await db
    .insertInto("venue_dining_session")
    .values({
      id: randomUUID(),
      location_id: sessionInput.locationId,
      reservation_id: sessionInput.reservationId,
      started_at: new Date(),
      table_label: sessionInput.tableLabel,
      user_id: userId,
    })
    .returning([
      "id",
      "location_id",
      "reservation_id",
      "started_at",
      "table_label",
    ])
    .executeTakeFirstOrThrow();
  return {
    session: {
      id: session.id,
      locationId: session.location_id,
      ...(session.reservation_id
        ? { reservationId: session.reservation_id }
        : {}),
      startedAt: new Date(session.started_at).toISOString(),
      ...(session.table_label ? { tableLabel: session.table_label } : {}),
    },
  };
};

export const createVenueOrder = async (userId: string, input: unknown) => {
  const orderInput = z
    .object({
      diningSessionId: z.string().min(1).optional(),
      items: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(200),
            notes: z.string().trim().max(500).optional(),
            quantity: z.number().int().min(1).max(100),
            unitPriceCents: z.number().int().min(0).max(1_000_000),
          })
        )
        .min(1)
        .max(100),
      locationId: z.string().min(1),
      reservationId: z.string().min(1).optional(),
      tipCents: z.number().int().min(0).max(1_000_000).default(0),
    })
    .parse(input);
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select("id")
    .where("id", "=", orderInput.locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");

  const subtotalCents = orderInput.items.reduce(
    (total, item) => total + item.quantity * item.unitPriceCents,
    0
  );
  const orderId = randomUUID();
  const totalCents = subtotalCents + orderInput.tipCents;
  await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto("venue_order")
      .values({
        assigned_staff_user_id: null,
        currency: "usd",
        dining_session_id: orderInput.diningSessionId,
        id: orderId,
        location_id: orderInput.locationId,
        payment_status: "unpaid",
        reservation_id: orderInput.reservationId,
        status: "draft",
        subtotal_cents: subtotalCents,
        tip_cents: orderInput.tipCents,
        total_cents: totalCents,
        user_id: userId,
      })
      .execute();
    await transaction
      .insertInto("venue_order_item")
      .values(
        orderInput.items.map((item) => ({
          id: randomUUID(),
          name: item.name,
          notes: item.notes,
          order_id: orderId,
          quantity: item.quantity,
          unit_price_cents: item.unitPriceCents,
        }))
      )
      .execute();
  });
  return {
    order: {
      currency: "usd",
      id: orderId,
      locationId: orderInput.locationId,
      paymentStatus: "unpaid",
      status: "draft",
      subtotalCents,
      tipCents: orderInput.tipCents,
      totalCents,
    },
  };
};

export const requestVenueShiftSwap = async (userId: string, input: unknown) => {
  const swapInput = z
    .object({
      replacementUserId: z.string().min(1).optional(),
      shiftId: z.string().min(1),
    })
    .parse(input);
  const db = await getDb();
  const shift = await db
    .selectFrom("venue_shift")
    .select(["id", "user_id"])
    .where("id", "=", swapInput.shiftId)
    .executeTakeFirst();
  if (!shift) throw new Error("Shift not found");
  if (shift.user_id !== userId) {
    throw new Error("Only the assigned staff member can request this swap");
  }

  const swapId = randomUUID();
  await db
    .insertInto("venue_shift_swap")
    .values({
      id: swapId,
      replacement_user_id: swapInput.replacementUserId,
      requester_user_id: userId,
      shift_id: swapInput.shiftId,
      status: "requested",
    })
    .execute();
  return { status: "requested" as const, swapId };
};
