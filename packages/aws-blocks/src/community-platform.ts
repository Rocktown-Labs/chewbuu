import { randomUUID } from "node:crypto";

import type { Kysely } from "kysely";
import { z } from "zod";

import { isReservedBrandHandle } from "./brand-handles";
import { getDb, jsonb } from "./database";
import type { BlocksDatabase } from "./database";
import type {
  BrandStyle,
  CommunityInviteResponse,
  CreateCommunityInput,
  CircleResponse,
  InviteCommunityMembersInput,
  UpdateCommunityInput,
} from "./types";

const brandStyleSchema = z
  .object({
    accentColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    backgroundColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    logoUrl: z.url().optional(),
    tagline: z.string().trim().max(160).optional(),
  })
  .default({});

const handleSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .transform((value) => value.replace(/^@/, "").toLowerCase())
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: "Handles use lowercase letters, numbers, and single hyphens.",
  });

const createCommunitySchema = z.object({
  description: z.string().trim().max(500).optional(),
  handle: handleSchema.optional(),
  kind: z.enum(["circle", "crew"]).default("circle"),
  name: z.string().trim().min(1).max(100),
  style: brandStyleSchema,
});

const updateCommunitySchema = z.object({
  description: z.string().trim().max(500).optional(),
  handle: handleSchema.optional(),
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  style: brandStyleSchema,
});

const inviteCommunityMembersSchema = z.object({
  circleId: z.string().min(1),
  members: z
    .array(
      z.object({
        email: z.email(),
        name: z.string().trim().max(120).optional(),
      })
    )
    .min(1)
    .max(50),
});

const normalizeStyle = (style: BrandStyle | null | undefined): BrandStyle =>
  style ?? {};

const handleFromName = (name: string) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 32);

const assertHandleAllowed = (handle: string, allowReserved: boolean) => {
  if (!allowReserved && isReservedBrandHandle(handle)) {
    throw new Error(`@${handle} is reserved for the Chewbuu brand.`);
  }
};

const assertCircleHandleAvailable = async (
  db: Kysely<BlocksDatabase>,
  handle: string,
  circleId?: string
) => {
  const existing = await db
    .selectFrom("circle")
    .select("id")
    .where("handle", "=", handle)
    .$if(Boolean(circleId), (query) =>
      query.where("id", "!=", circleId as string)
    )
    .executeTakeFirst();
  if (existing) throw new Error(`@${handle} is already in use.`);
};

const toCircle = (circle: {
  description: string | null;
  handle: string | null;
  id: string;
  kind: string;
  members: { id: string; role: string; status: string; userId: string }[];
  name: string;
  ownerUserId: string;
  style: Record<string, string> | null;
}): CircleResponse => ({
  ...(circle.description ? { description: circle.description } : {}),
  ...(circle.handle ? { handle: circle.handle } : {}),
  id: circle.id,
  kind: circle.kind === "crew" ? "crew" : "circle",
  members: circle.members,
  name: circle.name,
  ownerUserId: circle.ownerUserId,
  style: normalizeStyle(circle.style),
});

export interface CommunityActor {
  email: string;
  id: string;
  membershipTier?: string;
  name: string;
}

export const getCircles = async (userId: string) => {
  const db = await getDb();
  const circles = await db
    .selectFrom("circle as circle")
    .innerJoin(
      "circle_member as membership",
      "membership.circle_id",
      "circle.id"
    )
    .selectAll("circle")
    .where("membership.user_id", "=", userId)
    .orderBy("circle.created_at", "desc")
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
    circles: circles.map((circle) =>
      toCircle({
        description: circle.description,
        handle: circle.handle,
        id: circle.id,
        kind: circle.kind,
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
        style: circle.style,
      })
    ),
  };
};

export const createCommunity = async (
  actor: CommunityActor,
  input: CreateCommunityInput | string,
  allowReserved: boolean
) => {
  const body = createCommunitySchema.parse(
    typeof input === "string" ? { name: input } : input
  );
  if (!allowReserved && isReservedBrandHandle(body.name)) {
    throw new Error(
      "Chewbuu brand words are reserved for official communities."
    );
  }
  if (
    body.kind === "circle" &&
    actor.membershipTier !== "mingle" &&
    actor.membershipTier !== "sugar" &&
    !allowReserved
  ) {
    throw new Error("Upgrade to Mingle to create a circle.");
  }

  const handle = handleSchema.parse(body.handle ?? handleFromName(body.name));
  assertHandleAllowed(handle, allowReserved);
  const db = await getDb();
  await assertCircleHandleAvailable(db, handle);
  const circleId = randomUUID();
  const now = new Date();
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("circle")
      .values({
        created_at: now,
        description: body.description ?? null,
        handle,
        id: circleId,
        kind: body.kind,
        name: body.name,
        owner_user_id: actor.id,
        style: jsonb(body.style),
        updated_at: now,
      })
      .execute();
    await tx
      .insertInto("circle_member")
      .values({
        circle_id: circleId,
        created_at: now,
        id: randomUUID(),
        invite_id: null,
        role: "owner",
        status: "active",
        user_id: actor.id,
      })
      .execute();
  });

  return {
    circle: toCircle({
      description: body.description ?? null,
      handle,
      id: circleId,
      kind: body.kind,
      members: [{ id: "", role: "owner", status: "active", userId: actor.id }],
      name: body.name,
      ownerUserId: actor.id,
      style: body.style,
    }),
  };
};

const canManageCircle = async (
  db: Kysely<BlocksDatabase>,
  actor: CommunityActor,
  circleId: string,
  allowReserved: boolean
) => {
  if (allowReserved) return true;
  const owner = await db
    .selectFrom("circle_member")
    .select("id")
    .where("circle_id", "=", circleId)
    .where("user_id", "=", actor.id)
    .where("role", "=", "owner")
    .where("status", "=", "active")
    .executeTakeFirst();
  return Boolean(owner);
};

export const updateCommunity = async (
  actor: CommunityActor,
  input: UpdateCommunityInput,
  allowReserved: boolean
) => {
  const body = updateCommunitySchema.parse(input);
  if (!allowReserved && body.name && isReservedBrandHandle(body.name)) {
    throw new Error(
      "Chewbuu brand words are reserved for official communities."
    );
  }
  const db = await getDb();
  if (!(await canManageCircle(db, actor, body.id, allowReserved))) {
    throw new Error("Only the Crew or Circle owner can edit it.");
  }
  if (body.handle) {
    assertHandleAllowed(body.handle, allowReserved);
    await assertCircleHandleAvailable(db, body.handle, body.id);
  }
  const [updated] = await db
    .updateTable("circle")
    .set({
      ...(body.description !== undefined
        ? { description: body.description || null }
        : {}),
      ...(body.handle ? { handle: body.handle } : {}),
      ...(body.name ? { name: body.name } : {}),
      ...(body.style ? { style: jsonb(body.style) } : {}),
      updated_at: new Date(),
    })
    .where("id", "=", body.id)
    .returningAll()
    .execute();
  if (!updated) throw new Error("Crew or Circle not found.");
  return {
    circle: toCircle({
      description: updated.description,
      handle: updated.handle,
      id: updated.id,
      kind: updated.kind,
      members: [],
      name: updated.name,
      ownerUserId: updated.owner_user_id,
      style: updated.style,
    }),
  };
};

export const inviteCommunityMembers = async (
  actor: CommunityActor,
  input: InviteCommunityMembersInput,
  allowReserved: boolean
) => {
  const body = inviteCommunityMembersSchema.parse(input);
  const db = await getDb();
  if (!(await canManageCircle(db, actor, body.circleId, allowReserved))) {
    throw new Error("Only the Crew or Circle owner can invite people.");
  }
  const invites: CommunityInviteResponse[] = [];
  for (const member of body.members) {
    const email = member.email.trim().toLowerCase();
    const existingUser = await db
      .selectFrom("user")
      .select("id")
      .where("email", "=", email)
      .executeTakeFirst();
    const [invite] = await db
      .insertInto("friend_invite")
      .values({
        circle_id: body.circleId,
        created_at: new Date(),
        email,
        id: randomUUID(),
        invite_purpose: "circle_invite",
        invite_token: randomUUID(),
        name: member.name ?? null,
        phone: null,
        relationship: "friend",
        status: existingUser ? "joined" : "sent",
        user_id: actor.id,
      })
      .returningAll()
      .execute();
    if (!invite) throw new Error("Could not create Circle invitation.");
    if (existingUser) {
      await db
        .insertInto("circle_member")
        .values({
          circle_id: body.circleId,
          created_at: new Date(),
          id: randomUUID(),
          invite_id: invite.id,
          role: "member",
          status: "active",
          user_id: existingUser.id,
        })
        .onConflict((conflict) =>
          conflict.columns(["circle_id", "user_id"]).doUpdateSet({
            invite_id: invite.id,
            status: "active",
          })
        )
        .execute();
    }
    invites.push({
      email,
      id: invite.id,
      inviteToken: invite.invite_token,
      name: invite.name,
      status: invite.status,
    });
  }
  return { invites };
};

export const acceptCommunityInvite = async (
  userId: string,
  email: string,
  inviteToken: string
) => {
  const db = await getDb();
  const invite = await db
    .selectFrom("friend_invite")
    .select(["circle_id", "email", "id", "status"])
    .where("invite_token", "=", inviteToken)
    .where("invite_purpose", "=", "circle_invite")
    .executeTakeFirst();
  if (
    !invite?.circle_id ||
    invite.email?.toLowerCase() !== email.toLowerCase()
  ) {
    throw new Error(
      "This Circle invitation is invalid or belongs to another email."
    );
  }
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("circle_member")
      .values({
        circle_id: invite.circle_id as string,
        created_at: new Date(),
        id: randomUUID(),
        invite_id: invite.id,
        role: "member",
        status: "active",
        user_id: userId,
      })
      .onConflict((conflict) =>
        conflict.columns(["circle_id", "user_id"]).doUpdateSet({
          invite_id: invite.id,
          status: "active",
        })
      )
      .execute();
    await tx
      .updateTable("friend_invite")
      .set({ status: "joined" })
      .where("id", "=", invite.id)
      .execute();
  });
  return { status: "joined" };
};
