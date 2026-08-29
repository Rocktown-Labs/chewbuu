import { createHmac, randomUUID } from "node:crypto";

import type { Kysely } from "kysely";
import { z } from "zod";

import { getDb, jsonb } from "./database";
import type { BlocksDatabase } from "./database";
import type {
  VenueAttendanceSegment,
  VenueJobListing,
  VenueServiceBoard,
  VenueServiceConfig,
  VenueServiceCustomer,
  VenueServiceOrder,
  VenueServiceOrderItem,
  VenueServiceTable,
  VenueShift,
  VenueShiftAttendance,
  VenueStaffRole,
  VenueStaffStatus,
  VenueSyncChannel,
} from "./types";
import { validateVenueOrderItems } from "./venue-pricing";

type Db = Kysely<BlocksDatabase>;
type Access = {
  locationId: string;
  organizationId: string;
  role: VenueStaffRole;
};

const managerRoles = new Set<VenueStaffRole>([
  "admin",
  "lead",
  "manager",
  "owner",
]);
const roleSchema: z.ZodType<VenueStaffRole> = z.enum([
  "admin",
  "host",
  "kitchen",
  "lead",
  "manager",
  "owner",
  "server",
  "staff",
]);
const attendanceStatusSchema = z.enum([
  "break",
  "rest_break",
  "clocked_in",
  "clocked_out",
  "lunch",
  "scheduled",
]);
const serviceModeSchema = z.enum(["closed", "closing", "open", "pre_open"]);
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
const paymentStatusSchema = z.enum(["paid", "unpaid"]);
const serviceCustomerSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  email: z.email().optional(),
  locationId: z.string().min(1),
  notes: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(40).optional(),
  userId: z.string().min(1).optional(),
});
const serviceOrderSchema = z.object({
  customerId: z.string().min(1).optional(),
  customerName: z.string().trim().min(1).max(160).optional(),
  diningSessionId: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1).optional(),
        modifiers: z.array(z.unknown()).default([]),
        name: z.string().trim().min(1).max(200),
        notes: z.string().trim().max(500).optional(),
        quantity: z.number().int().min(1).max(100),
        unitPriceCents: z.number().int().min(0).max(1_000_000),
      })
    )
    .min(1)
    .max(100),
  locationId: z.string().min(1),
  source: z.enum(["preorder", "staff"]).default("staff"),
  tableId: z.string().min(1).optional(),
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
});

const toRole = (role: string): VenueStaffRole => {
  const parsed = roleSchema.safeParse(role);
  return parsed.success ? parsed.data : "staff";
};

const toIso = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : undefined;

const isManager = (role: VenueStaffRole) => managerRoles.has(role);

const distanceMeters = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const deltaLatitude = radians(latitudeB - latitudeA);
  const deltaLongitude = radians(longitudeB - longitudeA);
  const latitude = radians(latitudeA);
  const targetLatitude = radians(latitudeB);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.sin(deltaLongitude / 2) ** 2 *
      Math.cos(latitude) *
      Math.cos(targetLatitude);
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
};

const dailyCode = (locationId: string, date: Date) => {
  const dateKey = date.toISOString().slice(0, 10);
  const configuredSecret = process.env.SYNC_ATTENDANCE_SECRET;
  if (!configuredSecret && process.env.CHEWBUU_STAGE === "production") {
    throw new Error("SYNC_ATTENDANCE_SECRET is required in production.");
  }
  const secret = configuredSecret ?? "local-sync-attendance";
  const digest = createHmac("sha256", secret)
    .update(`${locationId}:${dateKey}`)
    .digest("hex");
  return String(Number.parseInt(digest.slice(0, 8), 16) % 1000).padStart(
    3,
    "0"
  );
};

const assertAccess = async (
  userId: string,
  locationId: string,
  isAdmin: boolean,
  requiredManager = false
): Promise<Access> => {
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select(["id", "organization_id", "submitted_by_user_id"])
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found.");
  if (isAdmin)
    return {
      locationId,
      organizationId: location.organization_id,
      role: "admin",
    };

  const assignment = await db
    .selectFrom("venue_member_location")
    .select(["role", "status"])
    .where("location_id", "=", locationId)
    .where("user_id", "=", userId)
    .where("status", "=", "active")
    .executeTakeFirst();
  const role = toRole(
    assignment?.role ??
      (location.submitted_by_user_id === userId ? "owner" : "staff")
  );
  if (!assignment && location.submitted_by_user_id !== userId) {
    throw new Error("Venue access required.");
  }
  if (requiredManager && !isManager(role)) {
    throw new Error("Manager permission required.");
  }
  return { locationId, organizationId: location.organization_id, role };
};

const toSegment = (segment: {
  ended_at: Date | string | null;
  id: string;
  kind: string;
  started_at: Date | string;
}): VenueAttendanceSegment => ({
  ...(toIso(segment.ended_at) ? { endedAt: toIso(segment.ended_at) } : {}),
  id: segment.id,
  kind: segment.kind === "lunch" ? "lunch" : "break",
  startedAt: new Date(segment.started_at).toISOString(),
});

const loadAttendance = async (
  db: Db,
  row: {
    clock_in_at: Date | string | null;
    clock_out_at: Date | string | null;
    current_segment_kind: string | null;
    current_segment_started_at: Date | string | null;
    eta_at: Date | string | null;
    id: string;
    late_minutes: number;
    location_id: string;
    shift_id: string;
    status: string;
    user_id: string;
  }
): Promise<VenueShiftAttendance> => {
  const segments = await db
    .selectFrom("venue_attendance_segment")
    .select(["ended_at", "id", "kind", "started_at"])
    .where("attendance_id", "=", row.id)
    .orderBy("started_at", "asc")
    .execute();
  return {
    ...(toIso(row.clock_in_at) ? { clockInAt: toIso(row.clock_in_at) } : {}),
    ...(toIso(row.clock_out_at) ? { clockOutAt: toIso(row.clock_out_at) } : {}),
    ...(row.current_segment_kind
      ? {
          currentSegmentKind:
            row.current_segment_kind === "lunch" ? "lunch" : "break",
        }
      : {}),
    ...(toIso(row.current_segment_started_at)
      ? { currentSegmentStartedAt: toIso(row.current_segment_started_at) }
      : {}),
    ...(toIso(row.eta_at) ? { etaAt: toIso(row.eta_at) } : {}),
    id: row.id,
    lateMinutes: row.late_minutes,
    locationId: row.location_id,
    segments: segments.map(toSegment),
    shiftId: row.shift_id,
    status: attendanceStatusSchema.parse(row.status),
    userId: row.user_id,
  };
};

const attendanceForShift = async (db: Db, shiftId: string) => {
  const row = await db
    .selectFrom("venue_shift_attendance")
    .select([
      "clock_in_at",
      "clock_out_at",
      "current_segment_kind",
      "current_segment_started_at",
      "eta_at",
      "id",
      "late_minutes",
      "location_id",
      "shift_id",
      "status",
      "user_id",
    ])
    .where("shift_id", "=", shiftId)
    .executeTakeFirst();
  return row ? loadAttendance(db, row) : undefined;
};

const toCustomer = (customer: {
  display_name: string;
  id: string;
  location_id: string;
  notes: string | null;
  user_id: string | null;
}): VenueServiceCustomer => ({
  displayName: customer.display_name,
  id: customer.id,
  locationId: customer.location_id,
  ...(customer.notes ? { notes: customer.notes } : {}),
  ...(customer.user_id ? { userId: customer.user_id } : {}),
});

const toServiceItem = (item: {
  id: string;
  menu_item_id: string | null;
  modifiers: unknown[];
  name: string;
  notes: string | null;
  quantity: number;
  unit_price_cents: number;
}): VenueServiceOrderItem => ({
  id: item.id,
  ...(item.menu_item_id ? { menuItemId: item.menu_item_id } : {}),
  modifiers: item.modifiers,
  name: item.name,
  ...(item.notes ? { notes: item.notes } : {}),
  quantity: item.quantity,
  unitPriceCents: item.unit_price_cents,
});

const orderWithDetails = async (
  db: Db,
  order: {
    assigned_staff_user_id: string | null;
    currency: string;
    dining_session_id: string | null;
    id: string;
    location_id: string;
    payment_status: string;
    reservation_id: string | null;
    service_customer_id: string | null;
    source: string;
    status: string;
    subtotal_cents: number;
    table_id: string | null;
    tip_cents: number;
    total_cents: number;
  }
): Promise<VenueServiceOrder> => {
  const [items, customer] = await Promise.all([
    db
      .selectFrom("venue_order_item")
      .select([
        "id",
        "menu_item_id",
        "modifiers",
        "name",
        "notes",
        "quantity",
        "unit_price_cents",
      ])
      .where("order_id", "=", order.id)
      .orderBy("created_at", "asc")
      .execute(),
    order.service_customer_id
      ? db
          .selectFrom("venue_service_customer")
          .select(["display_name", "id", "location_id", "notes", "user_id"])
          .where("id", "=", order.service_customer_id)
          .executeTakeFirst()
      : undefined,
  ]);
  return {
    ...(order.assigned_staff_user_id
      ? { assignedStaffUserId: order.assigned_staff_user_id }
      : {}),
    currency: order.currency,
    ...(order.dining_session_id
      ? { diningSessionId: order.dining_session_id }
      : {}),
    id: order.id,
    locationId: order.location_id,
    paymentStatus: paymentStatusSchema.parse(order.payment_status),
    status: order.status,
    subtotalCents: order.subtotal_cents,
    tipCents: order.tip_cents,
    totalCents: order.total_cents,
    items: items.map((item) =>
      toServiceItem({ ...item, modifiers: item.modifiers as unknown[] })
    ),
    ...(customer ? { customer: toCustomer(customer) } : {}),
    source:
      order.source === "preorder"
        ? "preorder"
        : order.source === "staff"
          ? "staff"
          : "guest",
    ...(order.table_id ? { tableId: order.table_id } : {}),
  };
};

const serviceMode = (
  now: Date,
  openMinute: number,
  closeMinute: number,
  override: string | null
) => {
  if (override) return serviceModeSchema.parse(override);
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (minute < openMinute) return "pre_open" as const;
  if (minute >= closeMinute) return "closed" as const;
  if (minute >= closeMinute - 60) return "closing" as const;
  return "open" as const;
};

export const updateVenueServiceConfig = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      closeMinute: z.number().int().min(0).max(1439).optional(),
      geofenceRadiusMeters: z.number().int().min(25).max(1000).optional(),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      locationId: z.string().min(1),
      longitude: z.number().min(-180).max(180).nullable().optional(),
      openMinute: z.number().int().min(0).max(1439).optional(),
      override: serviceModeSchema.nullable().optional(),
    })
    .parse(input);
  await assertAccess(userId, body.locationId, isAdmin, true);
  const db = await getDb();
  const current = await db
    .selectFrom("venue_location")
    .select([
      "geofence_radius_meters",
      "latitude",
      "longitude",
      "service_close_minute",
      "service_mode_override",
      "service_open_minute",
    ])
    .where("id", "=", body.locationId)
    .executeTakeFirstOrThrow();
  const openMinute = body.openMinute ?? current.service_open_minute;
  const closeMinute = body.closeMinute ?? current.service_close_minute;
  if (openMinute >= closeMinute)
    throw new Error("Service close time must be after open time.");
  const updated = await db
    .updateTable("venue_location")
    .set({
      ...(body.geofenceRadiusMeters !== undefined
        ? { geofence_radius_meters: body.geofenceRadiusMeters }
        : {}),
      ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
      ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
      service_close_minute: closeMinute,
      service_mode_override:
        body.override === undefined
          ? current.service_mode_override
          : body.override,
      service_open_minute: openMinute,
      updated_at: new Date(),
    })
    .where("id", "=", body.locationId)
    .returning([
      "geofence_radius_meters",
      "latitude",
      "longitude",
      "service_close_minute",
      "service_mode_override",
      "service_open_minute",
    ])
    .executeTakeFirstOrThrow();
  const config: VenueServiceConfig = {
    closeMinute: updated.service_close_minute,
    geofenceRadiusMeters: updated.geofence_radius_meters,
    ...(updated.latitude === null ? {} : { latitude: updated.latitude }),
    locationId: body.locationId,
    ...(updated.longitude === null ? {} : { longitude: updated.longitude }),
    openMinute: updated.service_open_minute,
    ...(updated.service_mode_override
      ? { override: serviceModeSchema.parse(updated.service_mode_override) }
      : {}),
  };
  return { config };
};

export const getVenueServiceConfig = async (
  userId: string,
  isAdmin: boolean,
  locationId: string
) => {
  await assertAccess(userId, locationId, isAdmin, true);
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select([
      "geofence_radius_meters",
      "latitude",
      "longitude",
      "service_close_minute",
      "service_mode_override",
      "service_open_minute",
    ])
    .where("id", "=", locationId)
    .executeTakeFirstOrThrow();
  return {
    config: {
      closeMinute: location.service_close_minute,
      geofenceRadiusMeters: location.geofence_radius_meters,
      ...(location.latitude === null ? {} : { latitude: location.latitude }),
      locationId,
      ...(location.longitude === null ? {} : { longitude: location.longitude }),
      openMinute: location.service_open_minute,
      ...(location.service_mode_override
        ? { override: serviceModeSchema.parse(location.service_mode_override) }
        : {}),
    } satisfies VenueServiceConfig,
  };
};

const loadStaff = async (
  db: Db,
  locationId: string,
  organizationId: string,
  now: Date
): Promise<VenueStaffStatus[]> => {
  const [assignments, owner, invites, shifts] = await Promise.all([
    db
      .selectFrom("venue_member_location as assignment")
      .innerJoin("user", "user.id", "assignment.user_id")
      .select([
        "assignment.role",
        "assignment.status",
        "assignment.user_id",
        "user.email",
        "user.name",
      ])
      .where("assignment.location_id", "=", locationId)
      .execute(),
    db
      .selectFrom("venue_location")
      .innerJoin("user", "user.id", "venue_location.submitted_by_user_id")
      .select(["user.email", "user.id", "user.name"])
      .where("venue_location.id", "=", locationId)
      .executeTakeFirst(),
    db
      .selectFrom("venue_member_invite")
      .select(["email", "name", "phone", "role", "status"])
      .where("organization_id", "=", organizationId)
      .where((expression) =>
        expression.or([
          expression("location_id", "=", locationId),
          expression("location_id", "is", null),
        ])
      )
      .where("status", "in", ["sent", "joined"])
      .execute(),
    db
      .selectFrom("venue_shift")
      .select(["id", "user_id"])
      .where("location_id", "=", locationId)
      .where("start_at", "<=", new Date(now.getTime() + 24 * 60 * 60 * 1000))
      .where("end_at", ">=", new Date(now.getTime() - 24 * 60 * 60 * 1000))
      .execute(),
  ]);
  const people = new Map<string, VenueStaffStatus>();
  if (owner) {
    people.set(owner.id, {
      displayName: owner.name,
      email: owner.email,
      role: "owner",
      status: "active",
      userId: owner.id,
    });
  }
  for (const assignment of assignments) {
    people.set(assignment.user_id, {
      displayName: assignment.name,
      email: assignment.email,
      role: toRole(assignment.role),
      status:
        assignment.status === "active"
          ? "active"
          : assignment.status === "removed"
            ? "removed"
            : "suspended",
      userId: assignment.user_id,
    });
  }
  const byUser = new Map<string, VenueShiftAttendance>();
  for (const shift of shifts) {
    const attendance = await attendanceForShift(db, shift.id);
    if (attendance) byUser.set(shift.user_id, attendance);
  }
  const result = [...people.values()].map((person) => ({
    ...person,
    ...(person.userId && byUser.has(person.userId)
      ? { attendance: byUser.get(person.userId) }
      : {}),
  }));
  for (const invite of invites) {
    const alreadyJoined =
      (invite.email &&
        result.some(
          (person) =>
            person.email?.toLowerCase() === invite.email?.toLowerCase()
        )) ||
      (invite.phone && result.some((person) => person.phone === invite.phone));
    if (!alreadyJoined) {
      result.push({
        displayName:
          invite.name ?? invite.email ?? invite.phone ?? "Invited staff",
        ...(invite.email ? { email: invite.email } : {}),
        ...(invite.phone ? { phone: invite.phone } : {}),
        role: toRole(invite.role),
        status: invite.status === "joined" ? "active" : "invited",
      });
    }
  }
  return result.toSorted((a, b) => a.displayName.localeCompare(b.displayName));
};

const loadTables = async (
  db: Db,
  locationId: string,
  options?: { section?: string; staffUserId?: string }
): Promise<VenueServiceTable[]> => {
  const tables = await db
    .selectFrom("venue_table")
    .select(["capacity", "id", "label", "location_id", "section", "status"])
    .where("location_id", "=", locationId)
    .orderBy("label", "asc")
    .execute();
  const orders = await db
    .selectFrom("venue_order")
    .leftJoin(
      "venue_service_customer",
      "venue_service_customer.id",
      "venue_order.service_customer_id"
    )
    .select([
      "venue_order.id",
      "venue_order.table_id",
      "venue_order.status",
      "venue_service_customer.display_name",
    ])
    .where("venue_order.location_id", "=", locationId)
    .where("venue_order.status", "not in", ["completed", "cancelled"])
    .$if(Boolean(options?.staffUserId), (query) =>
      query.where(
        "venue_order.assigned_staff_user_id",
        "=",
        options?.staffUserId ?? ""
      )
    )
    .execute();
  const visibleTables = options?.section
    ? tables.filter((table) => table.section === options.section)
    : tables;
  return visibleTables.map((table) => {
    const tableOrders = orders.filter((order) => order.table_id === table.id);
    return {
      capacity: table.capacity,
      customerNames: tableOrders.flatMap((order) =>
        order.display_name ? [order.display_name] : []
      ),
      currentOrderIds: tableOrders.map((order) => order.id),
      id: table.id,
      label: table.label,
      locationId: table.location_id,
      ...(table.section ? { section: table.section } : {}),
      occupiedSeats: tableOrders.length,
      status: table.status,
    };
  });
};

export const getVenueServiceBoard = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
): Promise<VenueServiceBoard> => {
  const body = z
    .object({ at: z.iso.datetime().optional(), locationId: z.string().min(1) })
    .parse(input);
  const access = await assertAccess(userId, body.locationId, isAdmin);
  const db = await getDb();
  const now = body.at ? new Date(body.at) : new Date();
  const location = await db
    .selectFrom("venue_location")
    .select([
      "service_close_minute",
      "service_mode_override",
      "service_open_minute",
    ])
    .where("id", "=", body.locationId)
    .executeTakeFirstOrThrow();
  const viewerIsManager = isManager(access.role);
  const shifts = await db
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
    .where("location_id", "=", body.locationId)
    .where("start_at", "<=", new Date(now.getTime() + 24 * 60 * 60 * 1000))
    .where("end_at", ">=", new Date(now.getTime() - 24 * 60 * 60 * 1000))
    .$if(!viewerIsManager, (query) => query.where("user_id", "=", userId))
    .orderBy("start_at", "desc")
    .limit(100)
    .execute();
  const viewerShift = shifts.find((shift) => shift.user_id === userId);
  const attendance = viewerShift
    ? await attendanceForShift(db, viewerShift.id)
    : undefined;
  const assignedSection = !viewerIsManager
    ? (viewerShift?.section ?? undefined)
    : undefined;
  const [tables, allStaff, orders] = await Promise.all([
    loadTables(db, body.locationId, {
      ...(assignedSection ? { section: assignedSection } : {}),
      ...(!viewerIsManager ? { staffUserId: userId } : {}),
    }),
    loadStaff(db, body.locationId, access.organizationId, now),
    db
      .selectFrom("venue_order")
      .select([
        "assigned_staff_user_id",
        "currency",
        "dining_session_id",
        "id",
        "location_id",
        "payment_status",
        "reservation_id",
        "service_customer_id",
        "source",
        "status",
        "subtotal_cents",
        "table_id",
        "tip_cents",
        "total_cents",
      ])
      .where("location_id", "=", body.locationId)
      .where("status", "not in", ["completed", "cancelled"])
      .$if(!viewerIsManager, (query) =>
        query.where("assigned_staff_user_id", "=", userId)
      )
      .orderBy("created_at", "asc")
      .limit(500)
      .execute(),
  ]);
  const detailedOrders = await Promise.all(
    orders.map((order) => orderWithDetails(db, order))
  );
  const staff = viewerIsManager
    ? allStaff
    : allStaff.filter((person) => person.userId === userId);
  return {
    ...(assignedSection ? { assignedSection } : {}),
    ...(attendance ? { attendance } : {}),
    ...(viewerIsManager ? { dailyCode: dailyCode(body.locationId, now) } : {}),
    locationId: body.locationId,
    mode: serviceMode(
      now,
      location.service_open_minute,
      location.service_close_minute,
      location.service_mode_override
    ),
    orders: detailedOrders.filter((order) => order.source !== "preorder"),
    preOrders: detailedOrders.filter((order) => order.source === "preorder"),
    shifts: shifts.map(toShift),
    staff,
    tables,
    viewerRole: access.role,
  };
};

export const getVenueStaffStatus = async (
  userId: string,
  isAdmin: boolean,
  locationId: string
) => {
  const access = await assertAccess(userId, locationId, isAdmin, true);
  const db = await getDb();
  return {
    staff: await loadStaff(db, locationId, access.organizationId, new Date()),
  };
};

export const updateVenueStaff = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      locationId: z.string().min(1),
      role: roleSchema.optional(),
      status: z.enum(["active", "removed", "suspended"]).optional(),
      userId: z.string().min(1),
    })
    .refine(
      (value) => value.role || value.status,
      "A role or status update is required."
    )
    .parse(input);
  const access = await assertAccess(userId, body.locationId, isAdmin, true);
  const db = await getDb();
  const member = await db
    .selectFrom("venue_member_location")
    .select(["role", "status"])
    .where("location_id", "=", body.locationId)
    .where("user_id", "=", body.userId)
    .executeTakeFirst();
  if (!member)
    throw new Error("Venue staff member is not assigned to this location.");
  const nextRole = body.role ?? toRole(member.role);
  const nextStatus =
    body.status ?? (member.status === "active" ? "active" : "suspended");
  await db.transaction().execute(async (tx) => {
    await tx
      .updateTable("venue_member_location")
      .set({ role: nextRole, status: nextStatus, updated_at: new Date() })
      .where("location_id", "=", body.locationId)
      .where("user_id", "=", body.userId)
      .execute();
    if (nextStatus === "removed") {
      const remainingAssignment = await tx
        .selectFrom("venue_member_location")
        .select("id")
        .where("user_id", "=", body.userId)
        .where("status", "=", "active")
        .executeTakeFirst();
      if (!remainingAssignment) {
        await tx
          .deleteFrom("member")
          .where("organization_id", "=", access.organizationId)
          .where("user_id", "=", body.userId)
          .execute();
      }
      await tx
        .deleteFrom("chat_participant")
        .where("user_id", "=", body.userId)
        .where(
          "room_id",
          "in",
          tx
            .selectFrom("venue_sync_channel")
            .select("room_id")
            .where("location_id", "=", body.locationId)
        )
        .execute();
    }
  });
  return {
    staff: await loadStaff(
      db,
      body.locationId,
      access.organizationId,
      new Date()
    ),
  };
};

export const clockInVenueShift = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      code: z.string().regex(/^\d{3,6}$/),
      latitude: z.number().min(-90).max(90).optional(),
      locationId: z.string().min(1),
      longitude: z.number().min(-180).max(180).optional(),
      shiftId: z.string().min(1),
      targetUserId: z.string().min(1).optional(),
    })
    .parse(input);
  const access = await assertAccess(userId, body.locationId, isAdmin);
  const effectiveUserId = body.targetUserId ?? userId;
  if (
    body.targetUserId &&
    body.targetUserId !== userId &&
    !isManager(access.role) &&
    !isAdmin
  ) {
    throw new Error("Manager permission required to clock in other staff.");
  }
  const db = await getDb();
  const [location, shift] = await Promise.all([
    db
      .selectFrom("venue_location")
      .select(["geofence_radius_meters", "id", "latitude", "longitude"])
      .where("id", "=", body.locationId)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("venue_shift")
      .select(["end_at", "id", "location_id", "start_at", "user_id"])
      .where("id", "=", body.shiftId)
      .where("location_id", "=", body.locationId)
      .executeTakeFirst(),
  ]);
  if (!shift || shift.user_id !== effectiveUserId)
    throw new Error("This shift is not assigned to the specified user.");
  if (body.code !== dailyCode(body.locationId, new Date()))
    throw new Error("The daily attendance code is incorrect.");
  if (location.latitude !== null && location.longitude !== null) {
    if (body.latitude === undefined || body.longitude === undefined) {
      throw new Error(
        "Location permission is required to clock in at this venue."
      );
    }
    if (
      distanceMeters(
        body.latitude,
        body.longitude,
        location.latitude,
        location.longitude
      ) > location.geofence_radius_meters
    ) {
      throw new Error("You must be at the venue to clock in.");
    }
  }
  const now = new Date();
  await db
    .insertInto("venue_shift_attendance")
    .values({
      clock_in_at: now,
      created_at: now,
      id: randomUUID(),
      late_minutes: 0,
      location_id: body.locationId,
      shift_id: body.shiftId,
      status: "clocked_in",
      updated_at: now,
      user_id: effectiveUserId,
    })
    .onConflict((conflict) =>
      conflict.column("shift_id").doUpdateSet({
        clock_in_at: now,
        clock_out_at: null,
        current_segment_kind: null,
        current_segment_started_at: null,
        status: "clocked_in",
        updated_at: now,
      })
    )
    .execute();
  const attendance = await attendanceForShift(db, body.shiftId);
  if (!attendance) throw new Error("Could not create attendance record.");
  return { attendance };
};

export const updateVenueAttendance = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      action: z.enum([
        "break_in",
        "break_out",
        "clock_out",
        "lunch_in",
        "lunch_out",
      ]),
      attendanceId: z.string().min(1),
    })
    .parse(input);
  const db = await getDb();
  const attendance = await db
    .selectFrom("venue_shift_attendance")
    .select([
      "current_segment_kind",
      "current_segment_started_at",
      "id",
      "location_id",
      "shift_id",
      "status",
      "user_id",
    ])
    .where("id", "=", body.attendanceId)
    .executeTakeFirst();
  if (!attendance) throw new Error("Attendance record not found.");
  const access = await assertAccess(userId, attendance.location_id, isAdmin);
  if (attendance.user_id !== userId && !isManager(access.role))
    throw new Error("You can only manage your own attendance.");
  const now = new Date();
  const startingKind =
    body.action === "break_out"
      ? "break"
      : body.action === "lunch_out"
        ? "lunch"
        : null;
  const ending = body.action === "break_in" || body.action === "lunch_in";
  if (startingKind && attendance.current_segment_kind)
    throw new Error("End the current break before starting another.");
  if (
    ending &&
    attendance.current_segment_kind !==
      (body.action === "lunch_in" ? "lunch" : "break")
  )
    throw new Error("The requested break is not active.");
  if (body.action === "clock_out" && attendance.current_segment_kind) {
    await db
      .updateTable("venue_attendance_segment")
      .set({ ended_at: now })
      .where("attendance_id", "=", body.attendanceId)
      .where("ended_at", "is", null)
      .execute();
  } else if (startingKind) {
    await db
      .insertInto("venue_attendance_segment")
      .values({
        attendance_id: body.attendanceId,
        id: randomUUID(),
        kind: startingKind,
        started_at: now,
      })
      .execute();
  } else if (ending) {
    await db
      .updateTable("venue_attendance_segment")
      .set({ ended_at: now })
      .where("attendance_id", "=", body.attendanceId)
      .where("ended_at", "is", null)
      .execute();
  }
  const nextStatus =
    body.action === "clock_out"
      ? "clocked_out"
      : startingKind === "lunch"
        ? "lunch"
        : startingKind === "break"
          ? "break"
          : "clocked_in";
  const updated = await db
    .updateTable("venue_shift_attendance")
    .set({
      ...(body.action === "clock_out" ? { clock_out_at: now } : {}),
      current_segment_kind: startingKind,
      current_segment_started_at: startingKind ? now : null,
      status: nextStatus,
      updated_at: now,
    })
    .where("id", "=", body.attendanceId)
    .returning([
      "clock_in_at",
      "clock_out_at",
      "current_segment_kind",
      "current_segment_started_at",
      "eta_at",
      "id",
      "late_minutes",
      "location_id",
      "shift_id",
      "status",
      "user_id",
    ])
    .executeTakeFirstOrThrow();
  return { attendance: await loadAttendance(db, updated) };
};

export const reportVenueStaffLate = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      attendanceId: z.string().min(1),
      etaAt: z.iso.datetime().optional(),
      lateMinutes: z
        .number()
        .int()
        .min(1)
        .max(24 * 60),
    })
    .parse(input);
  const db = await getDb();
  const existing = await db
    .selectFrom("venue_shift_attendance")
    .select(["id", "location_id", "shift_id", "user_id"])
    .where("id", "=", body.attendanceId)
    .executeTakeFirst();
  if (!existing) throw new Error("Attendance record not found.");
  const access = await assertAccess(userId, existing.location_id, isAdmin);
  if (existing.user_id !== userId && !isManager(access.role))
    throw new Error("You can only update your own ETA.");
  const updated = await db
    .updateTable("venue_shift_attendance")
    .set({
      eta_at: body.etaAt ? new Date(body.etaAt) : null,
      late_minutes: body.lateMinutes,
      updated_at: new Date(),
    })
    .where("id", "=", body.attendanceId)
    .returning([
      "clock_in_at",
      "clock_out_at",
      "current_segment_kind",
      "current_segment_started_at",
      "eta_at",
      "id",
      "late_minutes",
      "location_id",
      "shift_id",
      "status",
      "user_id",
    ])
    .executeTakeFirstOrThrow();
  return { attendance: await loadAttendance(db, updated) };
};

export const listVenueServiceCustomers = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      locationId: z.string().min(1),
      search: z.string().trim().max(160).optional(),
    })
    .parse(input);
  await assertAccess(userId, body.locationId, isAdmin);
  const db = await getDb();
  let query = db
    .selectFrom("venue_service_customer")
    .select(["display_name", "id", "location_id", "notes", "user_id"])
    .where("location_id", "=", body.locationId);
  if (body.search)
    query = query.where("display_name", "ilike", `%${body.search}%`);
  const customers = await query
    .orderBy("created_at", "desc")
    .limit(100)
    .execute();
  return { customers: customers.map(toCustomer) };
};

const toShift = (shift: {
  end_at: Date | string;
  id: string;
  location_id: string;
  role: string;
  section: string | null;
  start_at: Date | string;
  status: string;
  user_id: string;
}): VenueShift => ({
  endAt: new Date(shift.end_at).toISOString(),
  id: shift.id,
  locationId: shift.location_id,
  role: shift.role,
  ...(shift.section ? { section: shift.section } : {}),
  startAt: new Date(shift.start_at).toISOString(),
  status: shift.status,
  userId: shift.user_id,
});

export const upsertVenueShift = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      endAt: z.iso.datetime(),
      id: z.string().min(1).optional(),
      locationId: z.string().min(1),
      role: roleSchema,
      section: z.string().trim().max(80).optional(),
      startAt: z.iso.datetime(),
      status: z.string().trim().min(1).max(40).default("scheduled"),
      userId: z.string().min(1),
    })
    .parse(input);
  await assertAccess(userId, body.locationId, isAdmin, true);
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (startAt >= endAt) throw new Error("Shift must end after it starts.");
  const db = await getDb();
  const member = await db
    .selectFrom("venue_member_location")
    .select("user_id")
    .where("location_id", "=", body.locationId)
    .where("user_id", "=", body.userId)
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!member)
    throw new Error(
      "Assign this staff member to the location before scheduling them."
    );
  const now = new Date();
  const shift = await db
    .insertInto("venue_shift")
    .values({
      created_at: now,
      end_at: endAt,
      id: body.id ?? randomUUID(),
      location_id: body.locationId,
      role: body.role,
      section: body.section ?? null,
      start_at: startAt,
      status: body.status,
      updated_at: now,
      user_id: body.userId,
    })
    .onConflict((conflict) =>
      conflict.column("id").doUpdateSet({
        end_at: endAt,
        location_id: body.locationId,
        role: body.role,
        section: body.section ?? null,
        start_at: startAt,
        status: body.status,
        updated_at: now,
        user_id: body.userId,
      })
    )
    .returning([
      "end_at",
      "id",
      "location_id",
      "role",
      "section",
      "start_at",
      "status",
      "user_id",
    ])
    .executeTakeFirstOrThrow();
  return { shift: toShift(shift) };
};

export const createVenueServiceCustomer = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = serviceCustomerSchema.parse(input);
  await assertAccess(userId, body.locationId, isAdmin);
  const db = await getDb();
  const customer = await db
    .insertInto("venue_service_customer")
    .values({
      created_at: new Date(),
      display_name: body.displayName,
      email: body.email ?? null,
      id: randomUUID(),
      location_id: body.locationId,
      notes: body.notes ?? null,
      phone: body.phone ?? null,
      updated_at: new Date(),
      user_id: body.userId ?? null,
    })
    .returning(["display_name", "id", "location_id", "notes", "user_id"])
    .executeTakeFirstOrThrow();
  return { customer: toCustomer(customer) };
};

export const createVenueServiceOrder = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = serviceOrderSchema.parse(input);
  await assertAccess(userId, body.locationId, isAdmin);
  const db = await getDb();
  let { customerId } = body;
  if (customerId) {
    const customer = await db
      .selectFrom("venue_service_customer")
      .select("id")
      .where("id", "=", customerId)
      .where("location_id", "=", body.locationId)
      .executeTakeFirst();
    if (!customer) throw new Error("Service customer not found.");
  } else if (body.customerName) {
    const customer = await createVenueServiceCustomer(userId, isAdmin, {
      displayName: body.customerName,
      locationId: body.locationId,
    });
    customerId = customer.customer.id;
  }
  if (body.tableId) {
    const table = await db
      .selectFrom("venue_table")
      .select("id")
      .where("id", "=", body.tableId)
      .where("location_id", "=", body.locationId)
      .executeTakeFirst();
    if (!table) throw new Error("Table not found.");
  }
  const subtotalCents = await validateVenueOrderItems(
    db,
    body.locationId,
    body.items
  );
  const tipAllocations =
    body.tipAllocations ??
    (body.tipCents > 0
      ? [
          {
            amountCents: body.tipCents,
            beneficiaryKind: "house" as const,
          },
        ]
      : []);
  if (
    tipAllocations.reduce(
      (sum, allocation) => sum + allocation.amountCents,
      0
    ) !== body.tipCents
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
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("venue_order")
      .values({
        assigned_staff_user_id: userId,
        currency: "usd",
        dining_session_id: body.diningSessionId ?? null,
        id: orderId,
        location_id: body.locationId,
        payment_status: "unpaid",
        reservation_id: null,
        service_customer_id: customerId ?? null,
        source: body.source,
        status: "draft",
        subtotal_cents: subtotalCents,
        table_id: body.tableId ?? null,
        tip_cents: body.tipCents,
        total_cents: subtotalCents + body.tipCents,
        user_id: userId,
      })
      .execute();
    await tx
      .insertInto("venue_order_item")
      .values(
        body.items.map((item) => ({
          id: randomUUID(),
          menu_item_id: item.menuItemId ?? null,
          modifiers: jsonb(item.modifiers),
          name: item.name,
          notes: item.notes ?? null,
          order_id: orderId,
          quantity: item.quantity,
          unit_price_cents: item.unitPriceCents,
        }))
      )
      .execute();
    if (tipAllocations.length) {
      await tx
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
  const order = await db
    .selectFrom("venue_order")
    .select([
      "assigned_staff_user_id",
      "currency",
      "dining_session_id",
      "id",
      "location_id",
      "payment_status",
      "reservation_id",
      "service_customer_id",
      "source",
      "status",
      "subtotal_cents",
      "table_id",
      "tip_cents",
      "total_cents",
    ])
    .where("id", "=", orderId)
    .executeTakeFirstOrThrow();
  return { order: await orderWithDetails(db, order) };
};

export const updateVenueServiceOrder = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = z
    .object({
      assignedStaffUserId: z.string().min(1).optional(),
      orderId: z.string().min(1),
      paymentStatus: paymentStatusSchema.optional(),
      status: orderStatusSchema.optional(),
      tipCents: z.number().int().min(0).max(1_000_000).optional(),
    })
    .refine(
      (value) =>
        value.status ||
        value.paymentStatus ||
        value.assignedStaffUserId ||
        value.tipCents !== undefined,
      "An order update is required."
    )
    .parse(input);
  const db = await getDb();
  const existing = await db
    .selectFrom("venue_order")
    .select(["assigned_staff_user_id", "id", "location_id"])
    .where("id", "=", body.orderId)
    .executeTakeFirst();
  if (!existing) throw new Error("Order not found.");
  const access = await assertAccess(userId, existing.location_id, isAdmin);
  if (!isManager(access.role) && existing.assigned_staff_user_id !== userId)
    throw new Error("This order is assigned to another staff member.");
  const currentOrder = await db
    .selectFrom("venue_order")
    .select(["payment_status", "subtotal_cents", "tip_cents"])
    .where("id", "=", body.orderId)
    .executeTakeFirstOrThrow();
  if (
    body.tipCents !== undefined &&
    ["paid", "processing"].includes(currentOrder.payment_status)
  ) {
    throw new Error("Paid orders cannot be changed.");
  }
  const nextTipCents = body.tipCents ?? currentOrder.tip_cents;
  if (body.tipCents !== undefined && body.tipCents !== currentOrder.tip_cents) {
    await db
      .deleteFrom("venue_tip_allocation")
      .where("order_id", "=", body.orderId)
      .execute();
    if (nextTipCents > 0) {
      await db
        .insertInto("venue_tip_allocation")
        .values({
          amount_cents: nextTipCents,
          beneficiary_kind: "house",
          beneficiary_user_id: null,
          created_at: new Date(),
          id: randomUUID(),
          order_id: body.orderId,
          reversal_id: null,
          settled_at: null,
          status: "recorded",
          stripe_transfer_id: null,
        })
        .execute();
    }
  }
  const updated = await db
    .updateTable("venue_order")
    .set({
      ...(body.assignedStaffUserId
        ? { assigned_staff_user_id: body.assignedStaffUserId }
        : {}),
      ...(body.paymentStatus ? { payment_status: body.paymentStatus } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.tipCents !== undefined ? { tip_cents: body.tipCents } : {}),
      ...(body.tipCents !== undefined
        ? { total_cents: currentOrder.subtotal_cents + nextTipCents }
        : {}),
      updated_at: new Date(),
    })
    .where("id", "=", body.orderId)
    .returning([
      "assigned_staff_user_id",
      "currency",
      "dining_session_id",
      "id",
      "location_id",
      "payment_status",
      "reservation_id",
      "service_customer_id",
      "source",
      "status",
      "subtotal_cents",
      "table_id",
      "tip_cents",
      "total_cents",
    ])
    .executeTakeFirstOrThrow();
  return { order: await orderWithDetails(db, updated) };
};

export const listVenueSyncChannels = async (
  userId: string,
  isAdmin: boolean,
  locationId: string
): Promise<{ channels: VenueSyncChannel[] }> => {
  await assertAccess(userId, locationId, isAdmin);
  const db = await getDb();
  let channel = await db
    .selectFrom("venue_sync_channel")
    .innerJoin("chat_room", "chat_room.id", "venue_sync_channel.room_id")
    .select([
      "venue_sync_channel.id",
      "venue_sync_channel.location_id",
      "venue_sync_channel.room_id",
      "chat_room.title",
    ])
    .where("venue_sync_channel.location_id", "=", locationId)
    .where("venue_sync_channel.status", "=", "active")
    .executeTakeFirst();
  if (!channel) {
    const roomId = randomUUID();
    const channelId = randomUUID();
    await db.transaction().execute(async (tx) => {
      await tx
        .insertInto("chat_room")
        .values({
          id: roomId,
          kind: "sync_staff",
          phase: "active",
          title: "Staff channel",
          updated_at: new Date(),
        })
        .execute();
      await tx
        .insertInto("venue_sync_channel")
        .values({
          created_at: new Date(),
          id: channelId,
          location_id: locationId,
          room_id: roomId,
          status: "active",
          updated_at: new Date(),
        })
        .execute();
      const members = await tx
        .selectFrom("venue_member_location")
        .select(["user_id"])
        .where("location_id", "=", locationId)
        .where("status", "=", "active")
        .execute();
      for (const member of members) {
        const user = await tx
          .selectFrom("user")
          .select(["email", "name"])
          .where("id", "=", member.user_id)
          .executeTakeFirst();
        if (!user) continue;
        await tx
          .insertInto("chat_participant")
          .values({
            avatar_url: null,
            display_name: user.name || user.email,
            id: randomUUID(),
            room_id: roomId,
            user_id: member.user_id,
          })
          .execute();
      }
    });
    channel = {
      id: channelId,
      location_id: locationId,
      room_id: roomId,
      title: "Staff channel",
    };
  }
  const members = await db
    .selectFrom("venue_member_location")
    .innerJoin("user", "user.id", "venue_member_location.user_id")
    .select(["user.email", "user.id", "user.name"])
    .where("venue_member_location.location_id", "=", locationId)
    .where("venue_member_location.status", "=", "active")
    .execute();
  for (const member of members) {
    await db
      .insertInto("chat_participant")
      .values({
        avatar_url: null,
        display_name: member.name || member.email,
        id: randomUUID(),
        room_id: channel.room_id,
        user_id: member.id,
      })
      .onConflict((conflict) =>
        conflict.columns(["room_id", "user_id"]).doNothing()
      )
      .execute();
  }
  return {
    channels: [
      {
        id: channel.id,
        locationId: channel.location_id,
        roomId: channel.room_id,
        title: channel.title,
      },
    ],
  };
};

const jobSchema = z.object({
  applicationUrl: z.url().optional(),
  description: z.string().trim().min(1).max(5000),
  employmentType: z.string().trim().min(1).max(80),
  expiresAt: z.iso.datetime().optional(),
  id: z.string().min(1).optional(),
  locationId: z.string().min(1),
  payText: z.string().trim().max(160).optional(),
  scheduleText: z.string().trim().max(500).optional(),
  status: z.enum(["archived", "draft", "published"]).default("draft"),
  title: z.string().trim().min(1).max(160),
});

const toJob = (listing: {
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
  status:
    listing.status === "published"
      ? "published"
      : listing.status === "archived"
        ? "archived"
        : "draft",
  title: listing.title,
});

export const listVenueJobListings = async (
  userId: string | undefined,
  isAdmin: boolean,
  locationId: string,
  publicOnly = false
) => {
  if (!publicOnly) await assertAccess(userId ?? "", locationId, isAdmin, true);
  const db = await getDb();
  let query = db
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
    .where("venue_job_listing.location_id", "=", locationId);
  if (publicOnly) {
    query = query
      .innerJoin(
        "venue_location",
        "venue_location.id",
        "venue_job_listing.location_id"
      )
      .where("venue_job_listing.status", "=", "published")
      .where("venue_location.status", "in", ["claimed", "live", "verified"])
      .where("venue_location.stripe_identity_status", "=", "verified")
      .where((expression) =>
        expression.or([
          expression("venue_job_listing.expires_at", "is", null),
          expression("venue_job_listing.expires_at", ">", new Date()),
        ])
      );
  }
  const listings = await query
    .orderBy("created_at", "desc")
    .limit(100)
    .execute();
  return { listings: listings.map(toJob) };
};

export const upsertVenueJobListing = async (
  userId: string,
  isAdmin: boolean,
  input: unknown
) => {
  const body = jobSchema.parse(input);
  await assertAccess(userId, body.locationId, isAdmin, true);
  const db = await getDb();
  const now = new Date();
  const publishedAt = body.status === "published" ? now : null;
  const values = {
    application_url: body.applicationUrl ?? null,
    created_at: now,
    description: body.description,
    employment_type: body.employmentType,
    expires_at: body.expiresAt ? new Date(body.expiresAt) : null,
    id: body.id ?? randomUUID(),
    location_id: body.locationId,
    pay_text: body.payText ?? null,
    published_at: publishedAt,
    schedule_text: body.scheduleText ?? null,
    status: body.status,
    title: body.title,
    updated_at: now,
  };
  const listing = await db
    .insertInto("venue_job_listing")
    .values(values)
    .onConflict((conflict) =>
      conflict.column("id").doUpdateSet({
        application_url: values.application_url,
        description: values.description,
        employment_type: values.employment_type,
        expires_at: values.expires_at,
        location_id: values.location_id,
        pay_text: values.pay_text,
        published_at: values.published_at,
        schedule_text: values.schedule_text,
        status: values.status,
        title: values.title,
        updated_at: now,
      })
    )
    .returning([
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
    .executeTakeFirstOrThrow();
  return { listing: toJob(listing) };
};
