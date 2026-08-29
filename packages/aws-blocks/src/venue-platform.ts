import { randomUUID } from "node:crypto";

import type { Kysely } from "kysely";
import { z } from "zod";

import { isReservedBrandHandle, isReservedBrandName } from "./brand-handles";
import { getDb, jsonb } from "./database";
import type { BlocksDatabase } from "./database";
import type {
  BrandStyle,
  CommunityInviteResponse,
  InviteVenueMembersInput,
  VenueDiningSession,
  VenueLocation,
  VenueOrder,
  VenueReferral,
  VenueReservation,
  VenueShift,
  UpdateVenueBrandInput,
  VenueWorkspace,
} from "./types";
import { previewVenueMenu } from "./venue-menu";
import { validateVenueOrderItems } from "./venue-pricing";
import {
  brandStyleSchema,
  handleSchema,
  httpUrl,
  venueLocationInputSchema,
} from "./venue-schemas";

const menuPreviewInputSchema = z.object({ url: httpUrl });

const toVenueLocation = (location: {
  address: string | null;
  description?: string | null;
  handle?: string | null;
  id: string;
  menu_url: string | null;
  name: string;
  organization_id: string;
  status: string;
  style?: Record<string, string> | null;
  website_url: string | null;
}): VenueLocation => ({
  ...(location.address ? { address: location.address } : {}),
  ...(location.description ? { description: location.description } : {}),
  ...(location.handle ? { handle: location.handle } : {}),
  id: location.id,
  ...(location.menu_url ? { menuUrl: location.menu_url } : {}),
  name: location.name,
  organizationId: location.organization_id,
  ...(location.style ? { style: location.style as BrandStyle } : {}),
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
  dining_session_id?: string | null;
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
  ...(order.dining_session_id
    ? { diningSessionId: order.dining_session_id }
    : {}),
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
  const syncPlan = await db
    .selectFrom("sync_plan")
    .select("referral_reward_cents")
    .where("code", "=", "sync_50")
    .executeTakeFirst();
  const id = randomUUID();
  await db
    .insertInto("venue_referral")
    .values({
      id,
      location_id: locationId,
      referrer_user_id: userId,
      reward_amount_cents: syncPlan?.referral_reward_cents ?? 5000,
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

const handleFromName = (name: string) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 32);

export interface VenueCreateOptions {
  allowReservedBrand?: boolean;
}

const assertVenueHandleAllowed = (handle: string, allowReserved: boolean) => {
  if (!allowReserved && isReservedBrandHandle(handle)) {
    throw new Error(`@${handle} is reserved for the Chewbuu brand.`);
  }
};

const venueHandleIsTaken = async (
  db: Kysely<BlocksDatabase>,
  handle: string
) => {
  const [location, organization] = await Promise.all([
    db
      .selectFrom("venue_location")
      .select("id")
      .where("handle", "=", handle)
      .executeTakeFirst(),
    db
      .selectFrom("venue_organization")
      .select("id")
      .where("handle", "=", handle)
      .executeTakeFirst(),
  ]);
  return Boolean(location || organization);
};

const assertVenueHandleAvailable = async (
  db: Kysely<BlocksDatabase>,
  handle: string
) => {
  if (await venueHandleIsTaken(db, handle)) {
    throw new Error(`@${handle} is already in use.`);
  }
};

export const createVenueLocation = async (
  userId: string,
  input: unknown,
  options: VenueCreateOptions = {}
) => {
  const parsed = venueLocationInputSchema.parse(input);
  const allowReserved = options.allowReservedBrand ?? false;
  if (!allowReserved && isReservedBrandName(parsed.name)) {
    throw new Error("Chewbuu brand words are reserved for official venues.");
  }
  const requestedHandle = parsed.handle
    ? handleSchema.parse(parsed.handle)
    : undefined;
  let handle =
    requestedHandle ?? handleSchema.parse(handleFromName(parsed.name));
  assertVenueHandleAllowed(handle, allowReserved);
  const db = await getDb();

  let location = parsed.discoveryPlaceId
    ? await db
        .selectFrom("venue_location")
        .select([
          "address",
          "description",
          "handle",
          "id",
          "menu_url",
          "name",
          "organization_id",
          "status",
          "style",
          "website_url",
        ])
        .where("discovery_place_id", "=", parsed.discoveryPlaceId)
        .executeTakeFirst()
    : undefined;

  if (!location) {
    const organizationId = randomUUID();
    const locationId = randomUUID();
    if (requestedHandle) {
      await assertVenueHandleAvailable(db, handle);
    } else if (await venueHandleIsTaken(db, handle)) {
      handle = handleSchema.parse(
        `${handle.slice(0, 23)}-${locationId.slice(0, 8)}`
      );
      await assertVenueHandleAvailable(db, handle);
    }
    const slug = `${(parsed.organizationName ?? parsed.name)
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "")}-${locationId.slice(0, 8)}`;

    await db.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("venue_organization")
        .values({
          created_by_user_id: userId,
          description: parsed.description ?? null,
          handle,
          id: organizationId,
          name: parsed.organizationName ?? parsed.name,
          slug,
          status: "active",
          style: jsonb(parsed.style),
          updated_at: new Date(),
        })
        .execute();
      await transaction
        .insertInto("organization")
        .values({
          created_at: new Date(),
          id: organizationId,
          logo: null,
          metadata: null,
          name: parsed.organizationName ?? parsed.name,
          slug,
        })
        .execute();
      await transaction
        .insertInto("sync_subscription")
        .values({
          created_at: new Date(),
          ended_at: null,
          id: randomUUID(),
          organization_id: organizationId,
          plan: "sync",
          status: allowReserved ? "active" : "inactive",
          stripe_subscription_id: null,
          updated_at: new Date(),
          user_id: userId,
        })
        .execute();
      await transaction
        .insertInto("venue_location")
        .values({
          address: parsed.address,
          description: parsed.description ?? null,
          discovery_place_id: parsed.discoveryPlaceId,
          geofence_radius_meters: 150,
          handle,
          id: locationId,
          menu_url: parsed.menuUrl,
          name: parsed.name,
          organization_id: organizationId,
          phone: parsed.phone,
          public_analytics_enabled: false,
          public_analytics_min_samples: 5,
          service_close_minute: 1320,
          service_open_minute: 660,
          status: "unclaimed",
          style: jsonb(parsed.style),
          submitted_by_user_id: userId,
          updated_at: new Date(),
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
            description: parsed.description,
            handle,
            menuUrl: parsed.menuUrl,
            phone: parsed.phone,
            style: parsed.style,
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
        "description",
        "handle",
        "id",
        "menu_url",
        "name",
        "organization_id",
        "status",
        "style",
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

export const updateVenueBrand = async (
  userId: string,
  isAdmin: boolean,
  input: UpdateVenueBrandInput
) => {
  const body = z
    .object({
      description: z.string().trim().max(500).optional(),
      handle: handleSchema.optional(),
      locationId: z.string().min(1),
      name: z.string().trim().min(1).max(160).optional(),
      style: brandStyleSchema.optional(),
    })
    .parse(input);
  if (!isAdmin && body.name && isReservedBrandName(body.name)) {
    throw new Error("Chewbuu brand words are reserved for official venues.");
  }
  if (!(await venueAccess(userId, body.locationId, isAdmin))) {
    throw new Error("Venue membership is required to edit this venue.");
  }
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select(["id", "organization_id"])
    .where("id", "=", body.locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found.");

  if (body.handle) {
    assertVenueHandleAllowed(body.handle, isAdmin);
    const [sameLocation, sameOrganization] = await Promise.all([
      db
        .selectFrom("venue_location")
        .select("id")
        .where("handle", "=", body.handle)
        .where("id", "!=", body.locationId)
        .executeTakeFirst(),
      db
        .selectFrom("venue_organization")
        .select("id")
        .where("handle", "=", body.handle)
        .where("id", "!=", location.organization_id)
        .executeTakeFirst(),
    ]);
    if (sameLocation || sameOrganization) {
      throw new Error(`@${body.handle} is already in use.`);
    }
  }

  const now = new Date();
  await db.transaction().execute(async (tx) => {
    await tx
      .updateTable("venue_location")
      .set({
        ...(body.description !== undefined
          ? { description: body.description || null }
          : {}),
        ...(body.handle ? { handle: body.handle } : {}),
        ...(body.name ? { name: body.name } : {}),
        ...(body.style ? { style: jsonb(body.style) } : {}),
        updated_at: now,
      })
      .where("id", "=", body.locationId)
      .execute();
    await tx
      .updateTable("venue_organization")
      .set({
        ...(body.description !== undefined
          ? { description: body.description || null }
          : {}),
        ...(body.handle ? { handle: body.handle } : {}),
        ...(body.name ? { name: body.name } : {}),
        ...(body.style ? { style: jsonb(body.style) } : {}),
        updated_at: now,
      })
      .where("id", "=", location.organization_id)
      .execute();
  });

  const updated = await db
    .selectFrom("venue_location")
    .select([
      "address",
      "description",
      "handle",
      "id",
      "menu_url",
      "name",
      "organization_id",
      "status",
      "style",
      "website_url",
    ])
    .where("id", "=", body.locationId)
    .executeTakeFirstOrThrow();
  return { location: toVenueLocation(updated) };
};

export const inviteVenueMembers = async (
  userId: string,
  isAdmin: boolean,
  input: InviteVenueMembersInput
) => {
  const body = z
    .object({
      locationId: z.string().min(1),
      members: z
        .array(
          z
            .object({
              email: z.email().optional(),
              name: z.string().trim().max(120).optional(),
              phone: z.string().trim().min(7).max(40).optional(),
              role: z.string().trim().min(1).max(50).default("staff"),
            })
            .refine((member) => member.email || member.phone, {
              message: "An email or phone number is required.",
            })
        )
        .min(1)
        .max(50),
    })
    .parse(input);
  if (!(await venueAccess(userId, body.locationId, isAdmin))) {
    throw new Error("Venue membership is required to invite staff.");
  }
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select(["id", "organization_id"])
    .where("id", "=", body.locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found.");
  const [syncPlan, organizationSubscription, legacySubscription, activeStaff] =
    await Promise.all([
      db
        .selectFrom("sync_plan")
        .select("max_staff")
        .where("code", "=", "sync_50")
        .executeTakeFirst(),
      db
        .selectFrom("subscription")
        .select("status")
        .where("reference_id", "=", location.organization_id)
        .where("plan", "=", "sync")
        .where("status", "in", ["active", "trialing"])
        .executeTakeFirst(),
      db
        .selectFrom("sync_subscription")
        .select("status")
        .where("organization_id", "=", location.organization_id)
        .where("status", "in", ["active", "trialing"])
        .executeTakeFirst(),
      db
        .selectFrom("venue_member")
        .select("id")
        .where("organization_id", "=", location.organization_id)
        .where("status", "=", "active")
        .execute(),
    ]);
  if (!organizationSubscription && !legacySubscription) {
    throw new Error("An active Chewbuu Sync subscription is required.");
  }
  const maxStaff = syncPlan?.max_staff ?? 50;
  if (activeStaff.length + body.members.length > maxStaff) {
    throw new Error(
      `This Sync plan supports up to ${maxStaff} active staff members.`
    );
  }

  const invites: CommunityInviteResponse[] = [];
  for (const member of body.members) {
    const email = member.email?.trim().toLowerCase();
    const phone = member.phone?.trim();
    const existingUser = email
      ? await db
          .selectFrom("user")
          .select("id")
          .where("email", "=", email)
          .executeTakeFirst()
      : undefined;
    const [invite] = await db
      .insertInto("venue_member_invite")
      .values({
        created_at: new Date(),
        email: email ?? null,
        id: randomUUID(),
        invite_token: randomUUID(),
        location_id: location.id,
        name: member.name ?? null,
        organization_id: location.organization_id,
        phone: phone ?? null,
        role: member.role,
        status: existingUser ? "joined" : "sent",
        invited_by_user_id: userId,
      })
      .returningAll()
      .execute();
    if (!invite) throw new Error("Could not create venue invitation.");
    if (existingUser) {
      await db
        .insertInto("venue_member")
        .values({
          created_at: new Date(),
          id: randomUUID(),
          organization_id: location.organization_id,
          role: member.role,
          status: "active",
          updated_at: new Date(),
          user_id: existingUser.id,
        })
        .onConflict((conflict) =>
          conflict
            .columns(["organization_id", "user_id"])
            .doUpdateSet({ role: member.role, status: "active" })
        )
        .execute();
      await db
        .insertInto("venue_member_location")
        .values({
          id: randomUUID(),
          location_id: location.id,
          role: member.role,
          status: "active",
          updated_at: new Date(),
          user_id: existingUser.id,
        })
        .onConflict((conflict) =>
          conflict.columns(["location_id", "user_id"]).doUpdateSet({
            role: member.role,
            status: "active",
            updated_at: new Date(),
          })
        )
        .execute();
      await db
        .insertInto("member")
        .values({
          created_at: new Date(),
          id: randomUUID(),
          organization_id: location.organization_id,
          role: "member",
          user_id: existingUser.id,
        })
        .onConflict((conflict) =>
          conflict.columns(["organization_id", "user_id"]).doNothing()
        )
        .execute();
    }
    invites.push({
      email: email ?? "",
      id: invite.id,
      inviteToken: invite.invite_token,
      name: invite.name,
      ...(invite.phone ? { phone: invite.phone } : {}),
      status: invite.status,
    });
  }
  return { invites };
};

export const acceptVenueInvite = async (
  userId: string,
  email: string,
  inviteToken: string
) => {
  const db = await getDb();
  const invite = await db
    .selectFrom("venue_member_invite")
    .select(["email", "id", "location_id", "organization_id", "phone", "role"])
    .where("invite_token", "=", inviteToken)
    .where("status", "=", "sent")
    .executeTakeFirst();
  const profile = await db
    .selectFrom("profile")
    .select("phone")
    .where("user_id", "=", userId)
    .executeTakeFirst();
  const emailMatches = invite?.email?.toLowerCase() === email.toLowerCase();
  const phoneMatches = Boolean(
    invite?.phone && profile?.phone === invite.phone
  );
  if (!invite || (!emailMatches && !phoneMatches)) {
    throw new Error(
      "This venue invitation is invalid or belongs to another email."
    );
  }
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("venue_member")
      .values({
        created_at: new Date(),
        id: randomUUID(),
        organization_id: invite.organization_id,
        role: invite.role,
        status: "active",
        updated_at: new Date(),
        user_id: userId,
      })
      .onConflict((conflict) =>
        conflict
          .columns(["organization_id", "user_id"])
          .doUpdateSet({ role: invite.role, status: "active" })
      )
      .execute();
    if (invite.location_id) {
      await tx
        .insertInto("venue_member_location")
        .values({
          id: randomUUID(),
          location_id: invite.location_id,
          role: invite.role,
          status: "active",
          updated_at: new Date(),
          user_id: userId,
        })
        .onConflict((conflict) =>
          conflict.columns(["location_id", "user_id"]).doUpdateSet({
            role: invite.role,
            status: "active",
            updated_at: new Date(),
          })
        )
        .execute();
    }
    await tx
      .insertInto("member")
      .values({
        created_at: new Date(),
        id: randomUUID(),
        organization_id: invite.organization_id,
        role: "member",
        user_id: userId,
      })
      .onConflict((conflict) =>
        conflict.columns(["organization_id", "user_id"]).doNothing()
      )
      .execute();
    await tx
      .updateTable("venue_member_invite")
      .set({ status: "joined" })
      .where("id", "=", invite.id)
      .execute();
  });
  return { status: "joined" };
};

export const getVenueLocations = async (userId: string, isAdmin: boolean) => {
  const db = await getDb();
  const locations = isAdmin
    ? await db
        .selectFrom("venue_location")
        .select([
          "address",
          "description",
          "handle",
          "id",
          "menu_url",
          "name",
          "organization_id",
          "status",
          "style",
          "website_url",
        ])
        .orderBy("created_at", "desc")
        .execute()
    : await db
        .selectFrom("venue_location")
        .innerJoin(
          "venue_member_location",
          "venue_member_location.location_id",
          "venue_location.id"
        )
        .select([
          "venue_location.address as address",
          "venue_location.description as description",
          "venue_location.handle as handle",
          "venue_location.id as id",
          "venue_location.menu_url as menu_url",
          "venue_location.name as name",
          "venue_location.organization_id as organization_id",
          "venue_location.status as status",
          "venue_location.style as style",
          "venue_location.website_url as website_url",
        ])
        .where("venue_member_location.user_id", "=", userId)
        .where("venue_member_location.status", "=", "active")
        .orderBy("venue_location.created_at", "desc")
        .execute();
  return { locations: locations.map(toVenueLocation) };
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

export const venueAccess = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (isAdmin) return true;
  const db = await getDb();
  const member = await db
    .selectFrom("venue_location")
    .leftJoin(
      "member",
      "member.organization_id",
      "venue_location.organization_id"
    )
    .leftJoin("venue_member", (join) =>
      join
        .onRef(
          "venue_member.organization_id",
          "=",
          "venue_location.organization_id"
        )
        .on("venue_member.user_id", "=", userId)
    )
    .leftJoin("venue_member_location", (join) =>
      join
        .onRef("venue_member_location.location_id", "=", "venue_location.id")
        .on("venue_member_location.user_id", "=", userId)
    )
    .select(["member.id", "venue_location.submitted_by_user_id"])
    .where("venue_location.id", "=", locationId)
    .where((expression) =>
      expression.or([
        expression("venue_location.submitted_by_user_id", "=", userId),
        expression.and([
          expression("member.user_id", "=", userId),
          expression("venue_member.status", "=", "active"),
          expression("venue_member_location.status", "=", "active"),
        ]),
      ])
    )
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
    await transaction
      .insertInto("venue_member_location")
      .values({
        id: randomUUID(),
        location_id: locationId,
        role: "owner",
        status: "active",
        updated_at: new Date(),
        user_id: claim.submitted_by_user_id,
      })
      .onConflict((conflict) =>
        conflict.columns(["location_id", "user_id"]).doUpdateSet({
          role: "owner",
          status: "active",
          updated_at: new Date(),
        })
      )
      .execute();
    await transaction
      .insertInto("member")
      .values({
        created_at: new Date(),
        id: randomUUID(),
        organization_id: location.organization_id,
        role: "owner",
        user_id: claim.submitted_by_user_id,
      })
      .onConflict((conflict) =>
        conflict.columns(["organization_id", "user_id"]).doNothing()
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
      "description",
      "handle",
      "id",
      "menu_url",
      "name",
      "organization_id",
      "status",
      "style",
      "website_url",
    ])
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");

  const [reservations, orders, shifts, sessions] = await Promise.all([
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
        "dining_session_id",
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
    db
      .selectFrom("venue_shift")
      .select([
        "end_at",
        "id",
        "location_id",
        "role",
        "section",
        "start_at",
        "status",
        "user_id",
      ])
      .where("location_id", "=", locationId)
      .where("end_at", ">=", new Date())
      .orderBy("start_at", "asc")
      .limit(100)
      .execute(),
    db
      .selectFrom("venue_dining_session")
      .select([
        "ended_at",
        "id",
        "location_id",
        "reservation_id",
        "started_at",
        "table_label",
      ])
      .where("location_id", "=", locationId)
      .orderBy("started_at", "desc")
      .limit(100)
      .execute(),
  ]);

  return {
    analytics: {
      averageCostCents: null,
      averageDateMinutes: null,
      averageFoodWaitMinutes: null,
      averageKitchenMinutes: null,
      completedOrders: 0,
      eventCount: 0,
      orderCount: orders.length,
      reservationCount: reservations.length,
      sampleSizes: { cost: 0, dateDuration: 0, foodWait: 0, kitchen: 0 },
      tipCents: 0,
      totalCovers: reservations.reduce((sum, item) => sum + item.party_size, 0),
    },
    events: [],
    location: toVenueLocation(location),
    orders: orders.map(toVenueOrder),
    reservations: reservations.map(toReservation),
    sessions: sessions.map(
      (session): VenueDiningSession => ({
        ...(session.ended_at
          ? { endedAt: new Date(session.ended_at).toISOString() }
          : {}),
        id: session.id,
        locationId: session.location_id,
        ...(session.reservation_id
          ? { reservationId: session.reservation_id }
          : {}),
        startedAt: new Date(session.started_at).toISOString(),
        ...(session.table_label ? { tableLabel: session.table_label } : {}),
      })
    ),
    shifts: shifts.map(
      (shift): VenueShift => ({
        endAt: new Date(shift.end_at).toISOString(),
        id: shift.id,
        locationId: shift.location_id,
        role: shift.role,
        ...(shift.section ? { section: shift.section } : {}),
        startAt: new Date(shift.start_at).toISOString(),
        status: shift.status,
        userId: shift.user_id,
      })
    ),
    specials: [],
    tables: [],
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
      "dining_session_id",
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
            menuItemId: z.string().min(1).optional(),
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
      tipAllocations: z
        .array(
          z.object({
            amountCents: z.number().int().positive(),
            beneficiaryKind: z.enum(["cook", "house", "server"]),
            beneficiaryUserId: z.string().min(1).optional(),
          })
        )
        .optional(),
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

  const subtotalCents = await validateVenueOrderItems(
    db,
    orderInput.locationId,
    orderInput.items
  );
  const tipAllocations =
    orderInput.tipAllocations ??
    (orderInput.tipCents > 0
      ? [
          {
            amountCents: orderInput.tipCents,
            beneficiaryKind: "house" as const,
          },
        ]
      : []);
  if (
    tipAllocations.reduce(
      (total, allocation) => total + allocation.amountCents,
      0
    ) !== orderInput.tipCents
  ) {
    throw new Error("Tip allocations must equal the order tip.");
  }
  if (
    tipAllocations.some(
      (allocation) =>
        allocation.beneficiaryKind !== "house" && !allocation.beneficiaryUserId
    )
  ) {
    throw new Error("Worker tip allocations require a staff member.");
  }
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
        source: "guest",
        status: "submitted",
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
          menu_item_id: item.menuItemId ?? null,
          modifiers: jsonb([]),
          name: item.name,
          notes: item.notes,
          order_id: orderId,
          quantity: item.quantity,
          unit_price_cents: item.unitPriceCents,
        }))
      )
      .execute();
    if (tipAllocations.length) {
      await transaction
        .insertInto("venue_tip_allocation")
        .values(
          tipAllocations.map((allocation) => ({
            amount_cents: allocation.amountCents,
            beneficiary_kind: allocation.beneficiaryKind,
            beneficiary_user_id: allocation.beneficiaryUserId ?? null,
            created_at: new Date(),
            id: randomUUID(),
            order_id: orderId,
            reversal_id: null,
            settled_at: null,
            status: "recorded",
            stripe_transfer_id: null,
          }))
        )
        .execute();
    }
  });
  return {
    order: {
      currency: "usd",
      id: orderId,
      locationId: orderInput.locationId,
      paymentStatus: "unpaid",
      status: "submitted",
      subtotalCents,
      diningSessionId: orderInput.diningSessionId,
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
