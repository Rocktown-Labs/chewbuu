import { z } from "zod";

export const httpUrl = z
  .url()
  .refine(
    (value) => value.startsWith("https://") || value.startsWith("http://"),
    "URL must use http or https"
  );

export const brandStyleSchema = z
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

export const handleSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .transform((value) => value.replace(/^@/, "").toLowerCase())
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: "Handles use lowercase letters, numbers, and single hyphens.",
  });

export const venueLocationInputSchema = z.object({
  address: z.string().trim().min(1, "Address is required.").max(500),
  description: z.string().trim().max(500).optional(),
  discoveryPlaceId: z.string().trim().max(300).optional(),
  handle: handleSchema.optional(),
  menuUrl: httpUrl.optional(),
  name: z.string().trim().min(1).max(160),
  organizationName: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().min(7, "Enter a valid phone number.").max(50),
  venueRole: z.enum(["owner", "referrer"]).default("referrer"),
  style: brandStyleSchema,
  websiteUrl: httpUrl,
});
