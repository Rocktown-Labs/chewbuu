import { auth } from "@chewbuu/auth";
import { env } from "@chewbuu/env/server";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

export interface SessionUser {
  dailyDateLimit: number;
  email: string;
  hasCompletedOnboarding: boolean;
  hasIntroVideo: boolean;
  hasProfilePhoto: boolean;
  id: string;
  membershipTier: string;
  name: string;
}

const toBoolean = (value: string | null) => value === "true";

export const getSessionUser = async (
  headers: Headers
): Promise<SessionUser> => {
  if (env.NODE_ENV === "test") {
    const testUserId = headers.get("x-chewbuu-test-user-id");

    if (testUserId) {
      return {
        dailyDateLimit: Number(headers.get("x-chewbuu-test-daily-limit") ?? 2),
        email: headers.get("x-chewbuu-test-email") ?? "test@chewbuu.local",
        hasCompletedOnboarding: toBoolean(
          headers.get("x-chewbuu-test-onboarded")
        ),
        hasIntroVideo: toBoolean(headers.get("x-chewbuu-test-intro-video")),
        hasProfilePhoto: toBoolean(headers.get("x-chewbuu-test-profile-photo")),
        id: testUserId,
        membershipTier: headers.get("x-chewbuu-test-tier") ?? "social",
        name: headers.get("x-chewbuu-test-name") ?? "Test User",
      };
    }
  }

  const session = await auth.api.getSession({
    headers,
  });

  if (!session?.user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: "Authentication required",
    });
  }

  return {
    dailyDateLimit: session.user.dailyDateLimit ?? 2,
    email: session.user.email,
    hasCompletedOnboarding: session.user.hasCompletedOnboarding ?? false,
    hasIntroVideo: session.user.hasIntroVideo ?? false,
    hasProfilePhoto: session.user.hasProfilePhoto ?? false,
    id: session.user.id,
    membershipTier: session.user.membershipTier ?? "social",
    name: session.user.name,
  };
};
