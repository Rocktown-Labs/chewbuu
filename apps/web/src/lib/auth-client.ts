import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";
import { env } from "@chewbuu/env/web";
import {
  adminClient,
  inferAdditionalFields,
  organizationClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const getServerUrl = (url: string) => {
  const normalized =
    url === "/" ? url : url.endsWith("/") ? url.slice(0, -1) : url;

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  const processEnv = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  const vercelUrl =
    processEnv?.VERCEL_ENV === "production"
      ? (processEnv?.VERCEL_PROJECT_PRODUCTION_URL ?? processEnv?.VERCEL_URL)
      : (processEnv?.VERCEL_URL ?? processEnv?.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelUrl) {
    const origin = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;
    return `${origin}${normalized}`;
  }

  if (processEnv?.PORTLESS_URL) {
    return `${processEnv.PORTLESS_URL}${normalized}`;
  }

  return `http://localhost:3000${normalized}`;
};
export const authClient = createAuthClient({
  // better-auth derives its route-matching base from this URL's path, so the
  // public auth path must equal the server-side mount (/api/auth everywhere)
  baseURL: new URL("/api/auth", getServerUrl(env.VITE_SERVER_URL)).toString(),
  plugins: [
    inferAdditionalFields({
      user: {
        dailyDateLimit: {
          input: false,
          required: false,
          type: "number",
        },
        hasCompletedOnboarding: {
          input: false,
          required: false,
          type: "boolean",
        },
        hasIntroVideo: {
          input: false,
          required: false,
          type: "boolean",
        },
        hasProfilePhoto: {
          input: false,
          required: false,
          type: "boolean",
        },
        membershipTier: {
          input: false,
          required: false,
          type: "string",
        },
        stripeCustomerId: {
          input: false,
          required: false,
          type: "string",
        },
      },
    }),
    usernameClient(),
    passkeyClient(),
    adminClient(),
    organizationClient(),
    stripeClient({
      subscription: true,
    }),
  ],
});
