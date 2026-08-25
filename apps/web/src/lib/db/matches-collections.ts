import {
  createCollection,
  localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";

export const matchProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  gender: z.string().optional(),
  bio: z.string().optional(),
  area: z.string(),
  distanceMiles: z.number().optional(),
  compatibilityScore: z.number().optional(),
  photos: z.array(z.string()).default([]),
  videos: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  isVerified: z.boolean().default(false),
  headline: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  heightInches: z.number().optional(),
  hometown: z.string().optional(),
  smoking: z.string().optional(),
  drinking: z.string().optional(),
  intent: z.string().optional(),
  createdAt: z.number(),
});

export type DbMatchProfile = z.infer<typeof matchProfileSchema>;

export const matchDecisionSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  userId: z.string(),
  decision: z.enum(["like", "pass", "maybe", "request_date"]),
  createdAt: z.number(),
  notes: z.string().optional(),
  synced: z.boolean().default(false),
});

export type DbMatchDecision = z.infer<typeof matchDecisionSchema>;

/**
 * Normalized TanStack DB collection for Candidate Match Profiles
 */
export const matchesCollection = createCollection(
  localOnlyCollectionOptions({
    id: "matches",
    schema: matchProfileSchema,
    getKey: (profile) => profile.id,
  })
);

/**
 * Normalized TanStack DB collection for Match Decisions
 */
export const matchDecisionsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "match-decisions",
    schema: matchDecisionSchema,
    getKey: (item) => item.id,
  })
);
