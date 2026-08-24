import { describe, expect, it } from "vitest";

import {
  DATE_LIFECYCLE_EVENT_SOURCE,
  buildDateLifecycleSchedule,
  getDateLifecycleExecutionTime,
} from "./date-lifecycle-scheduler";

describe("date lifecycle scheduler", () => {
  it("schedules at the requested time when it is in the future", () => {
    const scheduledAt = new Date("2026-08-03T18:00:00.000Z");
    const executionAt = getDateLifecycleExecutionTime(
      scheduledAt,
      new Date("2026-08-03T17:00:00.000Z").getTime()
    );
    const schedule = buildDateLifecycleSchedule({
      dateRequestId: "request/123",
      executionAt,
      functionArn: "arn:aws:lambda:us-east-1:123:function:chewbuu",
      roleArn: "arn:aws:iam::123:role/scheduler",
    });

    expect(schedule.Name).toBe("chewbuu-date-request-123");
    expect(schedule.ScheduleExpression).toBe("at(2026-08-03T18:00:00)");
    expect(JSON.parse(schedule.Target.Input)).toEqual({
      at: "2026-08-03T18:00:00.000Z",
      dateRequestId: "request/123",
      source: DATE_LIFECYCLE_EVENT_SOURCE,
    });
  });

  it("moves past lifecycle times into a near-future execution", () => {
    const now = new Date("2026-08-03T18:00:00.000Z").getTime();
    const executionAt = getDateLifecycleExecutionTime(
      new Date("2026-08-03T17:00:00.000Z"),
      now
    );

    expect(executionAt.toISOString()).toBe("2026-08-03T18:01:00.000Z");
  });
});
