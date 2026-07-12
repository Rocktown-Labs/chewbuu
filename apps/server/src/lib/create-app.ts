import { OpenAPIHono } from "@hono/zod-openapi";
import defaultHook from "stoker/openapi/default-hook";

import type { AppBindings } from "./types";

export const createRouter = () =>
  new OpenAPIHono<AppBindings>({
    defaultHook,
    strict: false,
  });
