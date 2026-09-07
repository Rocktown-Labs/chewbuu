import { afterEach, describe, expect, it, vi } from "vitest";

import { slackTextForReport, withModerationRetry } from "./moderation-ai";
import { moderationClassificationSchema } from "./moderation-ai-schema";

vi.mock("./database", () => ({
  getDb: vi.fn(),
  jsonb: (value: unknown) => JSON.stringify(value),
}));

afterEach(() => {
  vi.useRealTimers();
});

describe("moderation AI review aid", () => {
  it("escapes reviewer payload content and links to the queue", () => {
    const message = slackTextForReport({
      ai_confidence: 0.9,
      ai_labels: ["threat signal"],
      ai_summary: "A <script> tag was reported.",
      category: "threats_or_violence",
      details: "<do not trust this>",
      id: "report-123",
      priority: "urgent",
      target_id: "message-1",
      target_type: "chat_message",
    });

    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("report-123");
    expect(message).toContain("/admin?tab=moderation&report=report-123");
  });

  it("retries transient integration failures with bounded backoff", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValue("ready");

    const resultPromise = withModerationRetry(operation);
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toBe("ready");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("validates bounded, non-enforcing classification output", () => {
    const result = moderationClassificationSchema.parse({
      confidence: 0.84,
      labels: ["threat signal"],
      severity: "high",
      summary: "The report includes a direct threat allegation.",
    });

    expect(result.severity).toBe("high");
    expect(result.labels).toEqual(["threat signal"]);
  });
});
