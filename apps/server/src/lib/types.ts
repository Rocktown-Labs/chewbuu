import type { OpenAPIHono } from "@hono/zod-openapi";
import type { EvlogVariables } from "evlog/hono";

export type AppBindings = EvlogVariables;
export type AppOpenAPI = OpenAPIHono<AppBindings>;
