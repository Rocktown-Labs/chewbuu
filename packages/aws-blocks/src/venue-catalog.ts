import { randomUUID } from "node:crypto";

import { z } from "zod";

import { getDb } from "./database";
import type {
  VenueMenuItem,
  VenueMenuModifierGroup,
  VenueMenuModifierOption,
} from "./types";
import { venueAccess } from "./venue-platform";

const menuItemInputSchema = z.object({
  available: z.boolean().optional(),
  description: z.string().trim().max(1000).optional(),
  id: z.string().min(1).optional(),
  locationId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  photoUrl: z.url().optional(),
  priceCents: z.number().int().min(0).max(100_000_000),
  section: z.string().trim().max(120).optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

const modifierGroupInputSchema = z.object({
  id: z.string().min(1).optional(),
  locationId: z.string().min(1),
  maxSelections: z.number().int().min(1).max(50).optional(),
  menuItemId: z.string().min(1),
  minSelections: z.number().int().min(0).max(50).optional(),
  name: z.string().trim().min(1).max(160),
  selectionType: z.enum(["single", "multiple"]).optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
});

const modifierOptionInputSchema = z.object({
  available: z.boolean().optional(),
  groupId: z.string().min(1),
  id: z.string().min(1).optional(),
  locationId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  priceDeltaCents: z
    .number()
    .int()
    .min(-100_000_000)
    .max(100_000_000)
    .optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
});

const ensureVenueAccess = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  if (!(await venueAccess(userId, locationId, isAdmin))) {
    throw new Error("Venue access required");
  }
};

const ensureCanonicalMenu = async (
  db: Awaited<ReturnType<typeof getDb>>,
  locationId: string,
  userId: string
) => {
  const existing = await db
    .selectFrom("venue_menu")
    .select("id")
    .where("location_id", "=", locationId)
    .where("source_kind", "=", "venue")
    .orderBy("created_at", "desc")
    .executeTakeFirst();
  if (existing) return existing.id;

  const id = randomUUID();
  await db
    .insertInto("venue_menu")
    .values({
      extracted_data: {},
      id,
      location_id: locationId,
      source_kind: "venue",
      source_url: null,
      status: "draft",
      submitted_by_user_id: userId,
    })
    .execute();
  return id;
};

const toModifierOption = (option: {
  available: boolean;
  id: string;
  name: string;
  price_delta_cents: number;
  sort_order: number;
}): VenueMenuModifierOption => ({
  available: option.available,
  id: option.id,
  name: option.name,
  priceDeltaCents: option.price_delta_cents,
  sortOrder: option.sort_order,
});

const toModifierGroup = (
  group: {
    id: string;
    max_selections: number;
    menu_item_id: string;
    min_selections: number;
    name: string;
    selection_type: string;
    sort_order: number;
  },
  options: VenueMenuModifierOption[]
): VenueMenuModifierGroup => ({
  id: group.id,
  maxSelections: group.max_selections,
  menuItemId: group.menu_item_id,
  minSelections: group.min_selections,
  name: group.name,
  options,
  selectionType:
    group.selection_type as VenueMenuModifierGroup["selectionType"],
  sortOrder: group.sort_order,
});

const toMenuItem = (
  item: {
    available: boolean;
    description: string | null;
    id: string;
    location_id: string;
    name: string;
    photo_url: string | null;
    price_cents: number;
    section: string | null;
    sort_order: number;
    status: string;
  },
  modifierGroups: VenueMenuModifierGroup[]
): VenueMenuItem => ({
  available: item.available,
  ...(item.description ? { description: item.description } : {}),
  id: item.id,
  locationId: item.location_id,
  name: item.name,
  ...(item.photo_url ? { photoUrl: item.photo_url } : {}),
  priceCents: item.price_cents,
  ...(item.section ? { section: item.section } : {}),
  sortOrder: item.sort_order,
  status: item.status as VenueMenuItem["status"],
  modifierGroups,
});

const getModifierGroups = async (
  db: Awaited<ReturnType<typeof getDb>>,
  menuItemId: string
) => {
  const groups = await db
    .selectFrom("venue_menu_modifier_group")
    .select([
      "id",
      "max_selections",
      "menu_item_id",
      "min_selections",
      "name",
      "selection_type",
      "sort_order",
    ])
    .where("menu_item_id", "=", menuItemId)
    .orderBy("sort_order", "asc")
    .execute();

  return Promise.all(
    groups.map(async (group) => {
      const options = await db
        .selectFrom("venue_menu_modifier_option")
        .select(["available", "id", "name", "price_delta_cents", "sort_order"])
        .where("group_id", "=", group.id)
        .orderBy("sort_order", "asc")
        .execute();
      return toModifierGroup(group, options.map(toModifierOption));
    })
  );
};

export const listVenueMenuItems = async (
  userId: string,
  locationId: string,
  isAdmin: boolean
) => {
  await ensureVenueAccess(userId, locationId, isAdmin);
  const db = await getDb();
  const items = await db
    .selectFrom("venue_menu_item")
    .select([
      "available",
      "description",
      "id",
      "location_id",
      "name",
      "photo_url",
      "price_cents",
      "section",
      "sort_order",
      "status",
    ])
    .where("location_id", "=", locationId)
    .where("status", "!=", "archived")
    .orderBy("sort_order", "asc")
    .orderBy("name", "asc")
    .execute();

  return {
    items: await Promise.all(
      items.map(async (item) =>
        toMenuItem(item, await getModifierGroups(db, item.id))
      )
    ),
  };
};

export const upsertVenueMenuItem = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const parsed = menuItemInputSchema.parse(input);
  await ensureVenueAccess(userId, parsed.locationId, isAdmin);
  const db = await getDb();
  const menuId = await ensureCanonicalMenu(db, parsed.locationId, userId);
  const now = new Date();
  const values = {
    available: parsed.available ?? true,
    description: parsed.description || null,
    location_id: parsed.locationId,
    menu_id: menuId,
    name: parsed.name,
    photo_url: parsed.photoUrl ?? null,
    price_cents: parsed.priceCents,
    section: parsed.section || null,
    sort_order: parsed.sortOrder ?? 0,
    status: parsed.status ?? "draft",
    updated_at: now,
  };

  if (parsed.id) {
    const existing = await db
      .selectFrom("venue_menu_item")
      .select("id")
      .where("id", "=", parsed.id)
      .where("location_id", "=", parsed.locationId)
      .executeTakeFirst();
    if (!existing) throw new Error("Menu item not found");
    await db
      .updateTable("venue_menu_item")
      .set(values)
      .where("id", "=", parsed.id)
      .execute();
  } else {
    await db
      .insertInto("venue_menu_item")
      .values({ id: randomUUID(), ...values, created_at: now })
      .execute();
  }

  const item = await db
    .selectFrom("venue_menu_item")
    .select([
      "available",
      "description",
      "id",
      "location_id",
      "name",
      "photo_url",
      "price_cents",
      "section",
      "sort_order",
      "status",
    ])
    .where("location_id", "=", parsed.locationId)
    .where("name", "=", parsed.name)
    .orderBy("updated_at", "desc")
    .executeTakeFirstOrThrow();
  return { item: toMenuItem(item, await getModifierGroups(db, item.id)) };
};

const getMenuItemForLocation = async (
  db: Awaited<ReturnType<typeof getDb>>,
  locationId: string,
  menuItemId: string
) => {
  const item = await db
    .selectFrom("venue_menu_item")
    .select("id")
    .where("id", "=", menuItemId)
    .where("location_id", "=", locationId)
    .executeTakeFirst();
  if (!item) throw new Error("Menu item not found");
};

export const upsertVenueMenuModifierGroup = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const parsed = modifierGroupInputSchema.parse(input);
  await ensureVenueAccess(userId, parsed.locationId, isAdmin);
  const db = await getDb();
  await getMenuItemForLocation(db, parsed.locationId, parsed.menuItemId);
  const now = new Date();
  const values = {
    max_selections: parsed.maxSelections ?? 1,
    menu_item_id: parsed.menuItemId,
    min_selections: parsed.minSelections ?? 0,
    name: parsed.name,
    selection_type: parsed.selectionType ?? "single",
    sort_order: parsed.sortOrder ?? 0,
    updated_at: now,
  };

  if (parsed.id) {
    await db
      .updateTable("venue_menu_modifier_group")
      .set(values)
      .where("id", "=", parsed.id)
      .where("menu_item_id", "=", parsed.menuItemId)
      .execute();
  }
  if (!parsed.id) {
    await db
      .insertInto("venue_menu_modifier_group")
      .values({ id: randomUUID(), ...values, created_at: now })
      .execute();
  }

  const group = await db
    .selectFrom("venue_menu_modifier_group")
    .select([
      "id",
      "max_selections",
      "menu_item_id",
      "min_selections",
      "name",
      "selection_type",
      "sort_order",
    ])
    .where("menu_item_id", "=", parsed.menuItemId)
    .where("name", "=", parsed.name)
    .orderBy("updated_at", "desc")
    .executeTakeFirstOrThrow();
  const options = await db
    .selectFrom("venue_menu_modifier_option")
    .select(["available", "id", "name", "price_delta_cents", "sort_order"])
    .where("group_id", "=", group.id)
    .orderBy("sort_order", "asc")
    .execute();
  return { group: toModifierGroup(group, options.map(toModifierOption)) };
};

export const upsertVenueMenuModifierOption = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const parsed = modifierOptionInputSchema.parse(input);
  await ensureVenueAccess(userId, parsed.locationId, isAdmin);
  const db = await getDb();
  const group = await db
    .selectFrom("venue_menu_modifier_group")
    .innerJoin(
      "venue_menu_item",
      "venue_menu_item.id",
      "venue_menu_modifier_group.menu_item_id"
    )
    .select("venue_menu_modifier_group.id")
    .where("venue_menu_modifier_group.id", "=", parsed.groupId)
    .where("venue_menu_item.location_id", "=", parsed.locationId)
    .executeTakeFirst();
  if (!group) throw new Error("Modifier group not found");

  const now = new Date();
  const values = {
    available: parsed.available ?? true,
    group_id: parsed.groupId,
    name: parsed.name,
    price_delta_cents: parsed.priceDeltaCents ?? 0,
    sort_order: parsed.sortOrder ?? 0,
    updated_at: now,
  };
  if (parsed.id) {
    await db
      .updateTable("venue_menu_modifier_option")
      .set(values)
      .where("id", "=", parsed.id)
      .where("group_id", "=", parsed.groupId)
      .execute();
  }
  if (!parsed.id) {
    await db
      .insertInto("venue_menu_modifier_option")
      .values({ id: randomUUID(), ...values, created_at: now })
      .execute();
  }

  const option = await db
    .selectFrom("venue_menu_modifier_option")
    .select(["available", "id", "name", "price_delta_cents", "sort_order"])
    .where("group_id", "=", parsed.groupId)
    .where("name", "=", parsed.name)
    .orderBy("updated_at", "desc")
    .executeTakeFirstOrThrow();
  return { option: toModifierOption(option) };
};
