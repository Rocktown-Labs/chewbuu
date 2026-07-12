import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createRouter } from "../lib/create-app";

const indexRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "text/plain": {
          schema: z.string().openapi({
            example: "OK",
          }),
        },
      },
      description: "Health check",
    },
  },
  tags: ["System"],
});

const router = createRouter().openapi(indexRoute, (c) =>
  c.text("OK", HttpStatusCodes.OK)
);

export default router;
