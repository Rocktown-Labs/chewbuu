import { z } from "zod";

export const moderationClassificationSchema = z.object({
  confidence: z.number().min(0).max(1),
  labels: z.array(z.string().trim().min(1).max(80)).max(8),
  severity: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string().trim().min(1).max(600),
});

export type ModerationClassification = z.infer<
  typeof moderationClassificationSchema
>;
