import { AsyncJob, CronJob, Scope } from "@aws-blocks/blocks";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("AWS Blocks Job Orchestration", () => {
  it("instantiates a CronJob with rate(1 minute) schedule", () => {
    const scope = new Scope("test-jobs");
    const cron = new CronJob(scope, "date-lifecycle-cron", {
      description:
        "Recurring dating lifecycle state transitions and review settlement",
      handler: async () => {},
      schedule: "rate(1 minute)",
    });
    expect(cron).toBeDefined();
  });

  it("instantiates notification delivery and media processing AsyncJobs", () => {
    const scope = new Scope("test-jobs");
    const notificationJob = new AsyncJob(scope, "notification-delivery", {
      handler: async () => {},
      schema: z.object({
        body: z.string(),
        dedupeKey: z.string(),
        kind: z.string(),
        title: z.string(),
        userId: z.string(),
      }),
    });
    const mediaJob = new AsyncJob(scope, "media-processing", {
      handler: async () => {},
      schema: z.object({
        mediaId: z.string(),
        userId: z.string(),
      }),
    });

    expect(notificationJob).toBeDefined();
    expect(mediaJob).toBeDefined();
  });
});
