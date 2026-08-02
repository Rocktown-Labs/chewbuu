import { Hono } from "hono";
import { start } from "workflow/api";

import {
  dateMatchingWorkflow,
  onboardingWorkflow,
  recapProcessingWorkflow,
  reviewProcessingWorkflow,
} from "../workflows";

export const workflowRouter = new Hono()
  .post("/recap", async (c) => {
    try {
      const body = await c.req.json();
      const run = await start(recapProcessingWorkflow, [body]);
      return c.json({ runId: run.runId, status: "started" }, 202);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Workflow trigger failed",
        },
        500
      );
    }
  })
  .post("/date-match", async (c) => {
    try {
      const body = await c.req.json();
      const run = await start(dateMatchingWorkflow, [body]);
      return c.json({ runId: run.runId, status: "started" }, 202);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Workflow trigger failed",
        },
        500
      );
    }
  })
  .post("/onboarding", async (c) => {
    try {
      const body = await c.req.json();
      const run = await start(onboardingWorkflow, [body]);
      return c.json({ runId: run.runId, status: "started" }, 202);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Workflow trigger failed",
        },
        500
      );
    }
  })
  .post("/review", async (c) => {
    try {
      const body = await c.req.json();
      const run = await start(reviewProcessingWorkflow, [body]);
      return c.json({ runId: run.runId, status: "started" }, 202);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Workflow trigger failed",
        },
        500
      );
    }
  });
