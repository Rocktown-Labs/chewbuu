import {
  createCollection,
  localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";

export const onboardingDraftSchema = z.object({
  // "current" or userId
  id: z.string(),
  step: z.number().default(0),
  name: z.string().default(""),
  birthday: z.string().default(""),
  gender: z.string().default(""),
  area: z.string().default(""),
  neighborhood: z.string().default(""),
  headline: z.string().default(""),
  bio: z.string().default(""),
  occupation: z.string().default(""),
  education: z.string().default(""),
  heightInches: z.number().nullable().default(null),
  intent: z.string().default("dating"),
  relationshipStatus: z.string().default("single"),
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),
  interests: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  videos: z.array(z.string()).default([]),
  notificationsEnabled: z.boolean().default(false),
  cameraAllowed: z.boolean().default(false),
  micAllowed: z.boolean().default(false),
  locationAllowed: z.boolean().default(false),
  alertsAllowed: z.boolean().default(false),
  updatedAt: z.number().default(() => Date.now()),
});

export type DbOnboardingDraft = z.infer<typeof onboardingDraftSchema>;

/**
 * Normalized TanStack DB collection for Onboarding Profile Drafts
 */
export const onboardingDraftCollection = createCollection(
  localOnlyCollectionOptions({
    id: "onboarding-draft",
    schema: onboardingDraftSchema,
    getKey: (item) => item.id,
  })
);

/**
 * Upsert helper for onboarding draft
 */
export function upsertOnboardingDraft(
  draftData: Partial<DbOnboardingDraft> & { id: string }
): void {
  const existing = onboardingDraftCollection.get(draftData.id);
  if (existing) {
    onboardingDraftCollection.update(draftData.id, (draft) => {
      Object.assign(draft, draftData);
      draft.updatedAt = Date.now();
    });
  } else {
    onboardingDraftCollection.insert({
      step: 0,
      name: "",
      birthday: "",
      gender: "",
      area: "",
      neighborhood: "",
      headline: "",
      bio: "",
      occupation: "",
      education: "",
      heightInches: null,
      intent: "dating",
      relationshipStatus: "single",
      latitude: null,
      longitude: null,
      interests: [],
      photos: [],
      videos: [],
      notificationsEnabled: false,
      cameraAllowed: false,
      micAllowed: false,
      locationAllowed: false,
      alertsAllowed: false,
      updatedAt: Date.now(),
      ...draftData,
    });
  }
}
