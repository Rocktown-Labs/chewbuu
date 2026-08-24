import {
  CreateScheduleCommand,
  SchedulerClient,
  UpdateScheduleCommand,
} from "@aws-sdk/client-scheduler";

export const DATE_LIFECYCLE_EVENT_SOURCE = "chewbuu.date-lifecycle";

const scheduler = new SchedulerClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const scheduleName = (dateRequestId: string) =>
  `chewbuu-date-${dateRequestId.replaceAll(/[^a-zA-Z0-9-_]/g, "-")}`.slice(
    0,
    64
  );

const executionTime = (scheduledAt: Date, now = Date.now()) => {
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new TypeError("Date lifecycle time is invalid");
  }

  return new Date(Math.max(scheduledAt.getTime(), now + 60_000));
};

const scheduleExpression = (at: Date) => `at(${at.toISOString().slice(0, 19)})`;

export const buildDateLifecycleSchedule = ({
  dateRequestId,
  executionAt,
  functionArn,
  roleArn,
}: {
  dateRequestId: string;
  executionAt: Date;
  functionArn: string;
  roleArn: string;
}) => ({
  ActionAfterCompletion: "DELETE" as const,
  Description: `Process date lifecycle for ${dateRequestId}`,
  FlexibleTimeWindow: { Mode: "OFF" as const },
  Name: scheduleName(dateRequestId),
  ScheduleExpression: scheduleExpression(executionAt),
  Target: {
    Arn: functionArn,
    Input: JSON.stringify({
      at: executionAt.toISOString(),
      dateRequestId,
      source: DATE_LIFECYCLE_EVENT_SOURCE,
    }),
    RoleArn: roleArn,
  },
});

export const scheduleDateLifecycle = async ({
  dateRequestId,
  scheduledAt,
}: {
  dateRequestId: string;
  scheduledAt: Date;
}) => {
  const functionArn = process.env.DATE_LIFECYCLE_FUNCTION_ARN;
  const roleArn = process.env.DATE_LIFECYCLE_SCHEDULER_ROLE_ARN;

  if (!functionArn || !roleArn) {
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      throw new Error("Date lifecycle scheduler is not configured");
    }
    return;
  }

  const executionAt = executionTime(scheduledAt);
  const input = buildDateLifecycleSchedule({
    dateRequestId,
    executionAt,
    functionArn,
    roleArn,
  });

  try {
    await scheduler.send(new CreateScheduleCommand(input));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "ConflictException") {
      throw error;
    }

    await scheduler.send(new UpdateScheduleCommand(input));
  }
};

export const getDateLifecycleExecutionTime = executionTime;
