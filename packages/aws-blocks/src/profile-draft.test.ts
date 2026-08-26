import { describe, expect, it } from "vitest";
import { z } from "zod";

const profileMediaInputSchema = z.object({
  id: z.string().optional(),
  isPrimary: z.boolean().default(false),
  kind: z.enum([
    "profile_photo",
    "intro_video",
    "photo",
    "video",
    "voice_note",
  ]),
  sortOrder: z.number().int().default(0),
  url: z.string().url(),
});

const profileInputSchema = z.object({
  ageRangeMax: z.number().int().min(18).max(99).optional(),
  ageRangeMin: z.number().int().min(18).max(99).optional(),
  area: z.string().trim().min(1),
  bio: z.string().optional(),
  birthday: z.string().trim().min(1),
  datingModes: z.array(z.string()).default([]),
  distanceMiles: z.number().int().min(1).max(250).default(25),
  favoriteThings: z.array(z.string()).default([]),
  friendInvites: z.array(z.record(z.string(), z.unknown())).default([]),
  height: z.string().optional(),
  interestDetails: z.record(z.string(), z.array(z.string())).default({}),
  interestedIn: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  kids: z.string().optional(),
  latitude: z.string().optional(),
  lookingFor: z.array(z.string()).default([]),
  longitude: z.string().optional(),
  maritalStatus: z.string().optional(),
  media: z.array(profileMediaInputSchema).max(7).default([]),
  name: z.string().optional(),
  occupation: z.string().optional(),
  politics: z.string().optional(),
  phone: z.string().optional(),
  race: z.string().optional(),
  religion: z.string().optional(),
  safetyOptIn: z.boolean().default(false),
  sex: z.string().trim().min(1),
  sexuality: z.string().trim().min(1),
  trustedContacts: z.array(z.record(z.string(), z.unknown())).default([]),
  username: z.string().optional(),
  weight: z.string().optional(),
  wantsKids: z.string().optional(),
});

const profileDraftInputSchema = z.object({
  ageRangeMax: z.number().int().min(18).max(99).optional().nullable(),
  ageRangeMin: z.number().int().min(18).max(99).optional().nullable(),
  area: z.string().trim().optional().nullable(),
  bio: z.string().optional().nullable(),
  birthday: z.string().trim().optional().nullable(),
  datingModes: z.array(z.string()).default([]),
  distanceMiles: z.number().int().min(1).max(250).default(25),
  favoriteThings: z.array(z.string()).default([]),
  friendInvites: z.array(z.record(z.string(), z.unknown())).default([]),
  height: z.string().optional().nullable(),
  interestDetails: z.record(z.string(), z.array(z.string())).default({}),
  interestedIn: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  kids: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  lookingFor: z.array(z.string()).default([]),
  longitude: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  media: z.array(profileMediaInputSchema).max(7).default([]),
  name: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  politics: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  race: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  safetyOptIn: z.boolean().default(false),
  sex: z.string().trim().optional().nullable(),
  sexuality: z.string().trim().optional().nullable(),
  trustedContacts: z.array(z.record(z.string(), z.unknown())).default([]),
  username: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  wantsKids: z.string().optional().nullable(),
});

describe("Profile Draft Validation", () => {
  it("allows empty draft payload without validation errors", () => {
    const parsed = profileDraftInputSchema.parse({});
    expect(parsed.distanceMiles).toBe(25);
    expect(parsed.media).toEqual([]);
    expect(parsed.interests).toEqual([]);
  });

  it("allows initial onboarding form state with empty strings when saving for later", () => {
    const initialFormState = {
      area: "",
      birthday: "",
      datingModes: [],
      distanceMiles: 25,
      favoriteThings: [],
      friendInvites: [],
      interestDetails: {},
      interestedIn: [],
      interests: [],
      lookingFor: [],
      media: [],
      safetyOptIn: false,
      sex: "",
      sexuality: "",
      trustedContacts: [],
    };

    const parsed = profileDraftInputSchema.parse(initialFormState);
    expect(parsed.area).toBe("");
    expect(parsed.birthday).toBe("");
    expect(parsed.sex).toBe("");
  });

  it("differentiates full profile submission which strictly requires mandatory fields", () => {
    const invalidFullSubmission = {
      area: "",
      birthday: "",
      sex: "",
      sexuality: "",
    };

    expect(() => profileInputSchema.parse(invalidFullSubmission)).toThrow();
  });
});
