import { env } from "@chewbuu/env/server";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { getSessionUser } from "./auth-session";

const getAdminEmails = () =>
  env.BETTER_AUTH_ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const getAdminUser = async (headers: Headers) => {
  const sessionUser = await getSessionUser(headers);
  const isAdmin = getAdminEmails().includes(sessionUser.email.toLowerCase());

  if (!isAdmin) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Admin access required.",
    });
  }

  return sessionUser;
};
