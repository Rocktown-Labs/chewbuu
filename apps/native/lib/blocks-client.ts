import {
  api,
  createNativeBlocksAuthMiddleware,
  registerMiddleware,
} from "@chewbuu/aws-blocks";

import { authClient } from "@/lib/auth-client";

// Shared native auth middleware (see packages/aws-blocks/src/native-auth.ts):
// forwards the Better Auth session cookie on every Blocks request.
registerMiddleware(
  createNativeBlocksAuthMiddleware(() => authClient.getCookie(), {
    appName: "native",
  })
);

export const blocksApi = api;
