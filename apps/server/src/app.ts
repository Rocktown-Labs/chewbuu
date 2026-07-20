import "./instrument";
import { auth } from "@chewbuu/auth";
import { env } from "@chewbuu/env/server";
import { apiReference } from "@scalar/hono-api-reference";
import * as Sentry from "@sentry/hono/node";
import { sentry } from "@sentry/hono/node";
import { initLogger } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import { cors } from "hono/cors";
import notFound from "stoker/middlewares/not-found";
import onError from "stoker/middlewares/on-error";

import { createRouter } from "./lib/create-app";
import indexRoute from "./routes";
import aiRoute from "./routes/ai";
import authRoute from "./routes/auth";
import datingRoute from "./routes/dating";
import pricingRoute from "./routes/pricing";
import reviewsRoute from "./routes/reviews";
import streamRoute from "./routes/stream";
import uploadRoute from "./routes/upload";
import { workflowRouter } from "./routes/workflow";

initLogger({
  env: { service: "chewbuu-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

const app = createRouter();

app.use(sentry(app));
app.use(evlog());
app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  return next();
});

app.use(
  "/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    credentials: true,
    origin: env.CORS_ORIGIN,
  })
);

app.doc("/openapi.json", {
  info: {
    title: "Chewbuu API",
    version: "0.1.0",
  },
  openapi: "3.0.0",
});

app.get("/debug-sentry", (c) => {
  Sentry.logger.info("User triggered test error", {
    action: "test_error_endpoint",
  });
  Sentry.metrics.count("test_counter", 1);
  throw new Error("My first Sentry error!");
});

app.get(
  "/docs",
  apiReference({
    pageTitle: "Chewbuu API Reference",
    spec: {
      url: "/openapi.json",
    },
  })
);

const routes = app
  .route("/", indexRoute)
  .route("/", authRoute)
  .route("/", aiRoute)
  .route("/", datingRoute)
  .route("/", pricingRoute)
  .route("/", reviewsRoute)
  .route("/", streamRoute)
  .route("/", uploadRoute)
  .route("/workflows", workflowRouter);

app.notFound(notFound);
app.onError(onError);

export type AppType = typeof routes;
export default app;
