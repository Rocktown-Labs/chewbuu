import { createLambdaHandler } from "@aws-blocks/blocks/lambda-handler";

import { DATE_LIFECYCLE_EVENT_SOURCE } from "../src/date-lifecycle-scheduler.js";
import { runDateLifecycle } from "../src/index.blocks.js";

const apiHandler = createLambdaHandler(() => import("../src/index.blocks.js"));
type ApiEvent = Parameters<typeof apiHandler>[0];
type ApiContext = Parameters<typeof apiHandler>[1];

type DateLifecycleEvent = {
  at: string;
  dateRequestId: string;
  source: typeof DATE_LIFECYCLE_EVENT_SOURCE;
};

const isDateLifecycleEvent = (
  event: ApiEvent | DateLifecycleEvent
): event is DateLifecycleEvent =>
  typeof event === "object" &&
  event !== null &&
  "source" in event &&
  event.source === DATE_LIFECYCLE_EVENT_SOURCE &&
  "at" in event &&
  typeof event.at === "string" &&
  "dateRequestId" in event &&
  typeof event.dateRequestId === "string";

export const handler = async (
  event: ApiEvent | { source: string },
  context: ApiContext
) => {
  if (isDateLifecycleEvent(event)) {
    return runDateLifecycle(event.at, event.dateRequestId);
  }

  return apiHandler(event, context);
};
