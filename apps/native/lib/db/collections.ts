import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";

import { datingApi } from "@/lib/dating-api";
import { queryClient } from "@/lib/db/query-client";

const dateMatchSchema = z.object({
  compatibility: z.number(),
  distanceMiles: z.number().optional(),
  displayName: z.string(),
  id: z.string(),
  introVideoUrl: z.string(),
  profilePhotoUrl: z.string().nullable(),
  profileSummary: z.string(),
  status: z.string(),
  userId: z.string(),
  videoRepliesRequired: z.number(),
});

export const dateRequestSchema = z.object({
  filters: z.array(z.string()),
  id: z.string(),
  matches: z.array(dateMatchSchema),
  partyMembers: z.array(
    z.object({
      displayName: z.string(),
      email: z.string().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
    })
  ),
  partySize: z.number(),
  paymentMode: z.string(),
  places: z.array(
    z.object({
      address: z.string().optional(),
      name: z.string(),
      placeId: z.string(),
      rating: z.string().optional(),
      types: z.array(z.string()),
    })
  ),
  scheduledAt: z.string(),
  searchArea: z.string(),
  status: z.string(),
  what: z.array(z.string()),
});

export type NativeDateRequest = z.infer<typeof dateRequestSchema>;

export const recapSchema = z.object({
  authorUserId: z.string(),
  caption: z.string().optional(),
  createdAt: z.string(),
  dateRequestId: z.string(),
  id: z.string(),
  media: z
    .array(
      z.object({
        createdAt: z.string(),
        dateRequestId: z.string(),
        id: z.string(),
        kind: z.string(),
        thumbnailUrl: z.string().nullable(),
        uploadedByUserId: z.string(),
        url: z.string(),
      })
    )
    .optional(),
  publishedAt: z.string().nullable(),
  reviewId: z.string().optional(),
  storyExpiresAt: z.string().nullable(),
  storyHours: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  videoUrl: z.string().optional(),
});

export type NativeRecap = z.infer<typeof recapSchema>;

const profileSchema = z
  .object({
    media: z.array(
      z.object({
        id: z.string(),
        isPrimary: z.boolean(),
        kind: z.string(),
        sortOrder: z.number(),
        url: z.string(),
      })
    ),
    userId: z.string(),
  })
  .passthrough();

export const dateRequestsCollection = createCollection(
  queryCollectionOptions({
    getKey: (request) => request.id,
    queryClient,
    queryFn: async () => {
      const summary = await datingApi.getSummary();
      return summary.requests;
    },
    queryKey: ["native", "dating-summary", "requests"],
    schema: dateRequestSchema,
  })
);

export const recapsCollection = createCollection(
  queryCollectionOptions({
    getKey: (recap) => recap.id,
    queryClient,
    queryFn: async () => {
      const result = await datingApi.getRecaps();
      return result.recaps;
    },
    queryKey: ["native", "recaps"],
    schema: recapSchema,
  })
);

export const profileCollection = createCollection(
  queryCollectionOptions({
    getKey: (profile) => profile.userId,
    queryClient,
    queryFn: async () => {
      const { profile } = await datingApi.getProfile();
      return profile ? [profile] : [];
    },
    queryKey: ["native", "dating-profile"],
    schema: profileSchema,
  })
);

export const refreshDatingData = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["native", "dating-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["native", "recaps"] }),
    queryClient.invalidateQueries({ queryKey: ["native", "dating-profile"] }),
  ]);
};
