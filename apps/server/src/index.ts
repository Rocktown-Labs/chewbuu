import { serve } from "@hono/node-server";

import app from "./app";

export { default } from "./app";

if (!process.env.VERCEL) {
  serve({
    fetch: app.fetch,
    port: 3000,
  });
}
