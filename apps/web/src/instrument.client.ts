import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://61392ffb1e892655296aff79bd2e1778@o4510278858309632.ingest.us.sentry.io/4511765169438720",

  dataCollection: {
    // userInfo: false,
    // httpBodies: [],
  },

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: 1,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,

  enableLogs: true,
});
