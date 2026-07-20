import { passkeyPlugin, usernamePlugin } from "@better-auth-ui/core/plugins";
import type { AuthPlugin } from "@better-auth-ui/react";

import { PasskeySignInButton } from "./passkey";

/**
 * better-auth-ui plugin configuration shared by the AuthProvider.
 *
 * - `usernamePlugin` renders the username field on sign-up and profile views
 *   (backed by the server-side `username()` Better Auth plugin).
 * - `passkeyPlugin` contributes passkey localization; the sign-in button is
 *   registered through the plugin `authButtons` slot.
 */
export const authPlugins: AuthPlugin[] = [
  usernamePlugin({ isUsernameAvailable: true }),
  { ...passkeyPlugin(), authButtons: [PasskeySignInButton] },
];
