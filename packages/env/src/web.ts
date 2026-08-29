import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const sameOriginUrlSchema = z
  .string()
  .regex(/^\/(?!\/)/, "Use an absolute URL or a same-origin path");
const serverUrlSchema = z.union([z.url(), sameOriginUrlSchema]);
const apiUrlSchema = z.union([z.url(), sameOriginUrlSchema]);

export const env = createEnv({
  client: {
    VITE_BLOCKS_API_URL: apiUrlSchema.optional(),
    VITE_SERVER_URL: serverUrlSchema.default("/"),
    VITE_VAPID_PUBLIC_KEY: z.string().optional(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: (import.meta as any).env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
