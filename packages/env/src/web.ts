import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const serverUrlSchema = z.union([
  z.url(),
  z
    .string()
    .regex(/^\/(?!\/)/, "Use an absolute URL or a same-origin path like /api"),
]);

export const env = createEnv({
  client: {
    VITE_SERVER_URL: serverUrlSchema,
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: (import.meta as any).env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
