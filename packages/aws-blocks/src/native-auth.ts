import type { BlocksMiddleware } from "@aws-blocks/core/client";

/**
 * Shared React Native auth middleware for Blocks API clients.
 *
 * The browser client relies on document cookies (`credentials: "include"`),
 * which is a no-op on native. Every authenticated Blocks method gates on
 * `requireSession(headers)` server-side, so native apps must forward the
 * Better Auth session cookie explicitly (documented pattern:
 * https://better-auth.com/docs/integrations/expo).
 *
 * Pass your app's `authClient.getCookie` (expo plugin action). Both the
 * social (native) and sync apps share this so the cookie handling can't drift.
 */
export function createNativeBlocksAuthMiddleware(
  getCookies: () => string | Promise<string>,
  options?: {
    apiUrlEnvVar?: string;
    appName?: string;
  }
): BlocksMiddleware {
  const apiUrlEnvVar = options?.apiUrlEnvVar ?? "EXPO_PUBLIC_BLOCKS_API_URL";
  const appName = options?.appName ?? "native";
  let warnedLocalhost = false;

  return {
    onRequest: async (request) => {
      const baseUrl = process.env[apiUrlEnvVar];
      if (!baseUrl || !baseUrl.trim()) {
        throw new Error(
          `${apiUrlEnvVar} is not set. Add it to apps/${appName}/.env ` +
            "(use your computer's LAN IP, not localhost, on a physical device)."
        );
      }
      const isReactNative =
        typeof navigator !== "undefined" &&
        (navigator as { product?: string }).product === "ReactNative";
      if (
        isReactNative &&
        !warnedLocalhost &&
        /localhost|127\.0\.0\.1/.test(baseUrl)
      ) {
        warnedLocalhost = true;
        console.warn(
          `[blocks] ${apiUrlEnvVar} points at localhost, which is ` +
            "unreachable from a physical device. Use your LAN IP instead."
        );
      }

      const cookies = await getCookies();
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
}

function mergeCookieHeader(existing: string, incoming: string): string {
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
}
