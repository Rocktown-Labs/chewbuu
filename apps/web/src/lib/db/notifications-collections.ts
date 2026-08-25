import {
  createCollection,
  localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";

export const notificationCategorySchema = z.enum([
  "chat",
  "match",
  "date",
  "system",
  "alert",
]);

export type NotificationCategory = z.infer<typeof notificationCategorySchema>;

export const notificationItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  category: notificationCategorySchema,
  isRead: z.boolean().default(false),
  createdAt: z.number(),
  time: z.string().default("Just now"),
  ctaUrl: z.string().optional(),
  ctaLabel: z.string().optional(),
  imageUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DbNotification = z.infer<typeof notificationItemSchema>;

/**
 * Normalized TanStack DB collection for Notifications & Alerts
 */
export const notificationsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "notifications",
    schema: notificationItemSchema,
    getKey: (item) => item.id,
  })
);
