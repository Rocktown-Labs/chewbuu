import {
  api,
  registerMiddleware,
  type BlocksMiddleware,
} from "@chewbuu/aws-blocks";

import { authClient } from "@/lib/auth-client";

// The shared Blocks client (packages/aws-blocks/src/client.ts) targets
// browsers: it relies on document cookies via `credentials: "include"`, which
// is a no-op in React Native. Every authenticated Blocks method gates on
// requireSession(headers) server-side, so without this middleware all native
// API calls fail auth even when the user is signed in.
//
// This follows the documented Better Auth Expo pattern ("Making Authenticated
// Requests to Your Server"): read the session cookie via authClient.getCookie()
// and send it as a Cookie header.
// https://better-auth.com/docs/integrations/expo
const mergeCookieHeader = (existing: string, incoming: string): string => {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const names = new Set(
    existing
      .split(";")
      .filter(Boolean)
      .map((part) => part.trim().split("=")[0])
  );
  const additions = incoming
    .split(";")
    .filter(Boolean)
    .filter((part) => !names.has(part.trim().split("=")[0]))
    .join("; ");
  return additions ? `${existing}; ${additions}` : existing;
};

let warnedLocalhost = false;

const nativeAuthMiddleware: BlocksMiddleware = {
  onRequest: async (request) => {
    const baseUrl = process.env.EXPO_PUBLIC_BLOCKS_API_URL;
    if (!baseUrl || !baseUrl.trim()) {
      throw new Error(
        "EXPO_PUBLIC_BLOCKS_API_URL is not set. Add it to apps/native/.env " +
          "(use your computer's LAN IP, not localhost, on a physical device)."
      );
    }
    if (__DEV__ && !warnedLocalhost && /localhost|127\.0\.0\.1/.test(baseUrl)) {
      warnedLocalhost = true;
      console.warn(
        "[blocks] EXPO_PUBLIC_BLOCKS_API_URL points at localhost, which is " +
          "unreachable from a physical device. Use your LAN IP instead."
      );
    }

    const cookies = await authClient.getCookie();
    if (cookies) {
      const headers = request.headers as Record<string, string>;
      const next: Record<string, string> = {};
      let existing = "";
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === "cookie") {
          existing = value;
        } else {
          next[key] = value;
        }
      }
      next.Cookie = mergeCookieHeader(existing, cookies);
      request.headers = next;
    }
    return request;
  },
};

registerMiddleware(nativeAuthMiddleware);

export const blocksApi = api;
