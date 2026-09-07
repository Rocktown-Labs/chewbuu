import { expoClient } from "@better-auth/expo/client";
import { env } from "@chewbuu/env/native";
import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const getBaseURL = () => {
  const raw = env.EXPO_PUBLIC_SERVER_URL.replace(/\/$/, "");
  // better-auth derives route matching from this path, so it must equal the
  // server-side mount (/api/auth everywhere, same as web client).
  return raw.endsWith("/api/auth") ? raw : `${raw}/api/auth`;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    expoClient({
      scheme: Constants.expoConfig?.scheme as string,
      storage: SecureStore,
      storagePrefix: Constants.expoConfig?.scheme as string,
    }),
    usernameClient(),
    inferAdditionalFields({
      user: {
        hasCompletedOnboarding: {
          input: false,
          required: false,
          type: "boolean",
        },
      },
    }),
  ],
});
