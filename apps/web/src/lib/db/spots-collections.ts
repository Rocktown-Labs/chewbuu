import {
  createCollection,
  localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";

export const dateSpotCategorySchema = z.enum([
  "Eat",
  "Drink",
  "Play",
  "Move",
  "Watch",
  "Talk",
]);

export type DateSpotCategory = z.infer<typeof dateSpotCategorySchema>;

export const dateSpotSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: dateSpotCategorySchema,
  address: z.string(),
  neighborhood: z.string().optional(),
  description: z.string().optional(),
  priceTier: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  photoUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isCurated: z.boolean().default(false),
  popularTimes: z.string().optional(),
  websiteUrl: z.string().optional(),
});

export type DbDateSpot = z.infer<typeof dateSpotSchema>;

export const savedSpotSchema = z.object({
  id: z.string(),
  spotId: z.string(),
  userId: z.string(),
  savedAt: z.number(),
  notes: z.string().optional(),
});

export type DbSavedSpot = z.infer<typeof savedSpotSchema>;

/**
 * Normalized TanStack DB collection for Date Spots & Places
 */
export const dateSpotsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "date-spots",
    schema: dateSpotSchema,
    getKey: (spot) => spot.id,
  })
);

/**
 * Normalized TanStack DB collection for Saved/Bookmarked Spots
 */
export const savedSpotsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "saved-spots",
    schema: savedSpotSchema,
    getKey: (item) => item.id,
  })
);
