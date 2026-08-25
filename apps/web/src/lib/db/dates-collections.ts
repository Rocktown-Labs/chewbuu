import {
  createCollection,
  localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";

export const dateBookingSchema = z.object({
  id: z.string(),
  status: z.enum([
    "proposed",
    "accepted",
    "confirmed",
    "active",
    "completed",
    "cancelled",
    "reviewed",
  ]),
  dateType: z.enum(["one_on_one", "double_date", "group_party"]),
  spotId: z.string().optional(),
  spotName: z.string(),
  spotAddress: z.string().optional(),
  category: z.string().optional(),
  dateTime: z.string(),
  scheduledAt: z.number(),
  partnerUserId: z.string().optional(),
  partnerName: z.string(),
  partnerAvatarUrl: z.string().optional(),
  videoRoomId: z.string().optional(),
  dressCode: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number(),
});

export type DbDateBooking = z.infer<typeof dateBookingSchema>;

export const dateRequestSchema = z.object({
  id: z.string(),
  proposerUserId: z.string(),
  proposerName: z.string(),
  proposerAvatarUrl: z.string().optional(),
  targetUserId: z.string(),
  spotName: z.string(),
  spotCategory: z.string(),
  proposedTime: z.string(),
  status: z.enum(["pending", "accepted", "declined", "expired"]),
  createdAt: z.number(),
});

export type DbDateRequest = z.infer<typeof dateRequestSchema>;

/**
 * Normalized TanStack DB collection for Date Bookings & History
 */
export const dateBookingsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "date-bookings",
    schema: dateBookingSchema,
    getKey: (date) => date.id,
  })
);

/**
 * Normalized TanStack DB collection for Date Requests / Proposals
 */
export const dateRequestsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "date-requests",
    schema: dateRequestSchema,
    getKey: (req) => req.id,
  })
);
