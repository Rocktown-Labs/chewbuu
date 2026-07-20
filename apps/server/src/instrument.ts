import * as Sentry from "@sentry/hono/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const dsn =
  process.env.SENTRY_DSN ||
  "https://c22716f2095b498efaf7d7e0acfa2b38@o4510278858309632.ingest.us.sentry.io/4511765176254464";

if (dsn) {
  Sentry.init({
    dsn,

    integrations: [nodeProfilingIntegration()],

    tracesSampleRate: 1,

    enabled: process.env.NODE_ENV !== "test",

    profileSessionSampleRate: 1,
    profileLifecycle: "trace",

    enableLogs: true,

    dataCollection: {
      // userInfo: false,
      // httpBodies: [],
    },
  });
}
