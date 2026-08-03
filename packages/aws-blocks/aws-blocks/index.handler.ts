import { createLambdaHandler } from "@aws-blocks/blocks/lambda-handler";

import { runDateLifecycle } from "../src/index.blocks.js";

const apiHandler = createLambdaHandler(() => import("../src/index.blocks.js"));
type ApiEvent = Parameters<typeof apiHandler>[0];
type ApiContext = Parameters<typeof apiHandler>[1];

export const handler = async (
  event: ApiEvent | { source: string },
  context: ApiContext
) => {
  if (
    event &&
    typeof event === "object" &&
    "source" in event &&
    event.source === "aws.events"
  ) {
    return runDateLifecycle();
  }

  return apiHandler(event, context);
};
