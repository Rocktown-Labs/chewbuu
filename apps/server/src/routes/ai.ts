import { devToolsMiddleware } from "@ai-sdk/devtools";
import { google } from "@ai-sdk/google";
import { createRoute, z } from "@hono/zod-openapi";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  wrapLanguageModel,
} from "ai";
import type { UIMessage } from "ai";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";
import jsonContentRequired from "stoker/openapi/helpers/json-content-required";

import { createRouter } from "../lib/create-app";

const aiRequestSchema = z.object({
  messages: z.array(z.unknown()).default([]),
});

const isUiMessage = (message: unknown): message is UIMessage => {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as {
    id?: unknown;
    parts?: unknown;
    role?: unknown;
  };

  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.parts) &&
    typeof candidate.role === "string"
  );
};

const toUiMessages = (messages: unknown[]): UIMessage[] => {
  const uiMessages: UIMessage[] = [];

  for (const message of messages) {
    if (!isUiMessage(message)) {
      throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
        message: "Invalid AI message payload",
      });
    }

    uiMessages.push(message);
  }

  return uiMessages;
};

const aiRoute = createRoute({
  method: "post",
  path: "/ai",
  request: {
    body: jsonContentRequired(aiRequestSchema, "AI chat request"),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "text/event-stream": {
          schema: z.string().openapi({
            description: "AI SDK UI message stream",
          }),
        },
      },
      description: "AI stream response",
    },
  },
  tags: ["AI"],
});

const router = createRouter().openapi(aiRoute, async (c) => {
  const { messages } = c.req.valid("json");
  const model = wrapLanguageModel({
    middleware: devToolsMiddleware(),
    model: google("gemini-2.5-flash"),
  });
  const result = streamText({
    messages: await convertToModelMessages(toUiMessages(messages)),
    model,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
});

export default router;
