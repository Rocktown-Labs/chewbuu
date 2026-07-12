import { auth } from "@chewbuu/auth";

import { createRouter } from "../lib/create-app";

const router = createRouter().on(["POST", "GET"], "/api/auth/*", (c) =>
  auth.handler(c.req.raw)
);

export default router;
