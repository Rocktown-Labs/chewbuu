import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    "https://61392ffb1e892655296aff79bd2e1778@o4510278858309632.ingest.us.sentry.io/4511765169438720",

  dataCollection: {
    // userInfo: false,
    // httpBodies: [],
  },

  tracesSampleRate: 1,

  enableLogs: true,
});
