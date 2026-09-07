import { setTimeout as sleep } from "node:timers/promises";

import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";

import { getDb, jsonb } from "./database";
import {
  moderationClassificationSchema,
  type ModerationClassification,
} from "./moderation-ai-schema";

export { moderationClassificationSchema } from "./moderation-ai-schema";
export type { ModerationClassification } from "./moderation-ai-schema";

const MAX_AI_INPUT_LENGTH = 6000;
const MODERATION_RETRY_DELAYS_MS = [250, 1000, 3000] as const;

export const withModerationRetry = async <T>(operation: () => Promise<T>) => {
  let lastError: unknown;
  for (
    let attempt = 0;
    attempt <= MODERATION_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const delay = MODERATION_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await sleep(delay);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Moderation integration failed.");
};

const truncate = (value: string | null | undefined) =>
  value?.slice(0, MAX_AI_INPUT_LENGTH) ?? "(no text was provided)";

export const classifyModerationReport = async (input: {
  category: string;
  details?: string | null;
  reportedKind?: string | null;
  reportedText?: string | null;
}): Promise<ModerationClassification | null> => {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return null;
  }

  const result = await generateText({
    model: google(process.env.MODERATION_AI_MODEL ?? "gemini-2.5-flash"),
    output: Output.object({ schema: moderationClassificationSchema }),
    prompt: [
      "You are an internal trust-and-safety assistant.",
      "Summarize and classify this user report for a human reviewer.",
      "Do not decide enforcement, contact authorities, or recommend an automatic action.",
      "Use neutral language, identify only signals supported by the supplied text, and do not infer protected traits.",
      `Report category: ${input.category}`,
      `Reported content kind: ${input.reportedKind ?? "unknown"}`,
      `Reporter details: ${truncate(input.details)}`,
      `Reported content: ${truncate(input.reportedText)}`,
    ].join("\n\n"),
  });

  return result.output ?? null;
};

const slackSafe = (value: string | null | undefined) =>
  (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export type ModerationSlackReport = {
  ai_confidence: number | null;
  ai_labels: unknown;
  ai_summary: string | null;
  category: string;
  details: string | null;
  id: string;
  priority: string;
  target_id: string;
  target_type: string;
};

export const slackTextForReport = (report: ModerationSlackReport) => {
  const reviewUrl = `${(
    process.env.VENUE_APP_URL ?? "https://chewbuu.com"
  ).replace(
    /\/$/,
    ""
  )}/admin?tab=moderation&report=${encodeURIComponent(report.id)}`;
  const aiLabels = Array.isArray(report.ai_labels)
    ? report.ai_labels
    : typeof report.ai_labels === "string"
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(report.ai_labels);
            return Array.isArray(parsed)
              ? parsed.filter(
                  (label): label is string => typeof label === "string"
                )
              : [];
          } catch {
            return [];
          }
        })()
      : [];
  const aiLine = report.ai_summary
    ? `\n*AI review aid:* ${slackSafe(report.ai_summary)} (labels: ${slackSafe(aiLabels.join(", "))}; confidence: ${report.ai_confidence ?? "n/a"})`
    : "\n*AI review aid:* unavailable; review the report manually.";

  return [
    `*New Chewbuu moderation report* · ${slackSafe(report.priority)}`,
    `*Category:* ${slackSafe(report.category)} · *Target:* ${slackSafe(report.target_type)} ${slackSafe(report.target_id)}`,
    `*Report ID:* ${slackSafe(report.id)}`,
    `*Details:* ${slackSafe(report.details ?? "No additional details")}`,
    aiLine,
    `<${reviewUrl}|Open moderation queue>`,
  ].join("\n");
};

const notifySlack = async (report: ModerationSlackReport) => {
  const webhookUrl = process.env.SLACK_MODERATION_WEBHOOK_URL;
  if (!webhookUrl) {
    return "skipped" as const;
  }

  const response = await fetch(webhookUrl, {
    body: JSON.stringify({ text: slackTextForReport(report) }),
    headers: { "content-type": "application/json" },
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Moderation Slack notification failed (${response.status}).`
    );
  }
  return "completed" as const;
};

export const runModerationAnalysis = async (reportId: string) => {
  const db = await getDb();
  const report = await db
    .selectFrom("moderation_report")
    .selectAll()
    .where("id", "=", reportId)
    .executeTakeFirst();
  if (!report) {
    return;
  }

  let classification: ModerationClassification | null = null;
  let integrationError: unknown;
  try {
    classification = await withModerationRetry(() =>
      classifyModerationReport({
        category: report.category,
        details: report.details,
        reportedKind: report.reported_kind,
        reportedText: report.reported_text,
      })
    );
    await db
      .updateTable("moderation_report")
      .set({
        ai_completed_at: new Date(),
        ai_confidence: classification?.confidence ?? null,
        ai_labels: classification ? jsonb(classification.labels) : null,
        ai_model: classification
          ? (process.env.MODERATION_AI_MODEL ?? "gemini-2.5-flash")
          : null,
        ai_severity: classification?.severity ?? null,
        ai_status: classification ? "completed" : "skipped",
        ai_summary: classification?.summary ?? null,
        updated_at: new Date(),
      })
      .where("id", "=", reportId)
      .execute();
  } catch (error) {
    await db
      .updateTable("moderation_report")
      .set({ ai_status: "failed", updated_at: new Date() })
      .where("id", "=", reportId)
      .execute();
    integrationError = error;
  }

  const latestReport = await db
    .selectFrom("moderation_report")
    .selectAll()
    .where("id", "=", reportId)
    .executeTakeFirstOrThrow();
  try {
    const slackStatus = await withModerationRetry(() =>
      notifySlack(latestReport)
    );
    await db
      .updateTable("moderation_report")
      .set({
        slack_notified_at: slackStatus === "completed" ? new Date() : null,
        slack_status: slackStatus,
        updated_at: new Date(),
      })
      .where("id", "=", reportId)
      .execute();
  } catch (error) {
    await db
      .updateTable("moderation_report")
      .set({ slack_status: "failed", updated_at: new Date() })
      .where("id", "=", reportId)
      .execute();
    integrationError ??= error;
  }

  if (integrationError) {
    throw integrationError instanceof Error
      ? integrationError
      : new Error("Moderation integration failed.");
  }
};
