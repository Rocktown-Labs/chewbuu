import { getDb } from "./database";
import type {
  UsernameChangeRequest,
  UsernameChangeRequestStatus,
} from "./types";

const REQUEST_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 2;
const VERIFICATION_WINDOW_MS = 30 * 60 * 1000;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

const normalizeUsername = (username: string) =>
  username.trim().replace(/^@/, "").toLowerCase();

const mapRequest = (request: {
  created_at: Date | string;
  id: string;
  requested_username: string;
  status: string;
}): UsernameChangeRequest => ({
  createdAt: new Date(request.created_at).toISOString(),
  id: request.id,
  requestedUsername: request.requested_username,
  status: request.status as UsernameChangeRequestStatus,
});

export const requestUsernameChange = async (
  userId: string,
  input: { username: string },
  sendEmail: (input: {
    body: string;
    html: string;
    subject: string;
    to: string;
  }) => Promise<void>,
  appUrl: string
) => {
  const requestedUsername = normalizeUsername(input.username);
  if (!USERNAME_PATTERN.test(requestedUsername)) {
    throw new Error(
      "Use 3–30 lowercase letters, numbers, or underscores for your username."
    );
  }
  if (["chewbuu", "chewbuusync"].includes(requestedUsername)) {
    throw new Error("That username is reserved.");
  }

  const db = await getDb();
  const user = await db
    .selectFrom("user")
    .select(["email", "name", "username"])
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new Error("User not found");
  if (normalizeUsername(user.username ?? "") === requestedUsername) {
    throw new Error("That is already your username.");
  }

  const taken = await db
    .selectFrom("user")
    .select("id")
    .where("username", "=", requestedUsername)
    .where("id", "!=", userId)
    .executeTakeFirst();
  if (taken) throw new Error("That username is already taken.");

  const now = new Date();
  const recentRequests = await db
    .selectFrom("username_change_request")
    .select("id")
    .where("user_id", "=", userId)
    .where("created_at", ">=", new Date(now.getTime() - REQUEST_WINDOW_MS))
    .execute();
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error(
      "Username changes are limited to two requests every 30 days."
    );
  }

  const pending = await db
    .selectFrom("username_change_request")
    .select("id")
    .where("user_id", "=", userId)
    .where("status", "in", ["pending_verification", "pending_approval"])
    .executeTakeFirst();
  if (pending) {
    throw new Error(
      "You already have a username change waiting for verification or approval."
    );
  }

  const token = crypto.randomUUID();
  const request = {
    created_at: now,
    expires_at: new Date(now.getTime() + VERIFICATION_WINDOW_MS),
    id: crypto.randomUUID(),
    requested_username: requestedUsername,
    status: "pending_verification",
    updated_at: now,
    user_id: userId,
    verification_token_hash: await hashToken(token),
  } as const;
  await db.insertInto("username_change_request").values(request).execute();

  const verificationUrl = `${appUrl}/username/verify?token=${encodeURIComponent(token)}`;
  await sendEmail({
    body: `Confirm your requested Chewbuu username change to @${requestedUsername}: ${verificationUrl}`,
    html: `<p>Confirm your requested Chewbuu username change to <strong>@${requestedUsername}</strong>.</p><p><a href="${verificationUrl}">Confirm username change</a></p><p>This link expires in 30 minutes.</p>`,
    subject: "Confirm your Chewbuu username change",
    to: user.email,
  });

  return { request: mapRequest(request) };
};

export const getUsernameChangeStatus = async (userId: string) => {
  const db = await getDb();
  const request = await db
    .selectFrom("username_change_request")
    .select(["created_at", "id", "requested_username", "status"])
    .where("user_id", "=", userId)
    .orderBy("created_at", "desc")
    .executeTakeFirst();
  return { request: request ? mapRequest(request) : null };
};

export const verifyUsernameChange = async (
  token: string,
  sendEmail: (input: {
    body: string;
    html: string;
    subject: string;
    to: string;
  }) => Promise<void>
) => {
  const db = await getDb();
  const request = await db
    .selectFrom("username_change_request as request")
    .innerJoin("user", "user.id", "request.user_id")
    .select([
      "request.created_at",
      "request.expires_at",
      "request.id",
      "request.requested_username",
      "request.status",
      "request.verification_token_hash",
      "request.user_id",
      "user.email",
    ])
    .where("request.verification_token_hash", "=", await hashToken(token))
    .executeTakeFirst();
  if (!request) throw new Error("That username verification link is invalid.");
  if (request.status !== "pending_verification") {
    throw new Error("That username verification link has already been used.");
  }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    throw new Error("That username verification link has expired.");
  }

  const taken = await db
    .selectFrom("user")
    .select("id")
    .where("username", "=", request.requested_username)
    .where("id", "!=", request.user_id)
    .executeTakeFirst();
  if (taken)
    throw new Error("That username was claimed while you were verifying it.");

  const verifiedAt = new Date();
  await db
    .updateTable("username_change_request")
    .set({
      status: "pending_approval",
      updated_at: verifiedAt,
      verified_at: verifiedAt,
    })
    .where("id", "=", request.id)
    .execute();
  await sendEmail({
    body: `Your username change to @${request.requested_username} was verified and is waiting for approval.`,
    html: `<p>Your username change to <strong>@${request.requested_username}</strong> was verified and is waiting for approval.</p>`,
    subject: "Your Chewbuu username change is queued",
    to: request.email,
  });

  return {
    request: mapRequest({
      created_at: request.created_at,
      id: request.id,
      requested_username: request.requested_username,
      status: "pending_approval",
    }),
  };
};

export const listUsernameChangeRequests = async () => {
  const db = await getDb();
  const requests = await db
    .selectFrom("username_change_request as request")
    .innerJoin("user", "user.id", "request.user_id")
    .select([
      "request.created_at",
      "request.id",
      "request.requested_username",
      "request.status",
      "user.email",
      "user.name",
    ])
    .where("request.status", "=", "pending_approval")
    .orderBy("request.created_at", "asc")
    .execute();
  return {
    requests: requests.map((request) => ({
      ...mapRequest(request),
      email: request.email,
      name: request.name,
    })),
  };
};

export const approveUsernameChange = async (
  requestId: string,
  sendEmail: (input: {
    body: string;
    html: string;
    subject: string;
    to: string;
  }) => Promise<void>
) => {
  const db = await getDb();
  const request = await db
    .selectFrom("username_change_request as request")
    .innerJoin("user", "user.id", "request.user_id")
    .select([
      "request.created_at",
      "request.id",
      "request.requested_username",
      "request.status",
      "request.user_id",
      "user.email",
    ])
    .where("request.id", "=", requestId)
    .executeTakeFirst();
  if (!request || request.status !== "pending_approval") {
    throw new Error("Username change request is not awaiting approval.");
  }

  const taken = await db
    .selectFrom("user")
    .select("id")
    .where("username", "=", request.requested_username)
    .where("id", "!=", request.user_id)
    .executeTakeFirst();
  if (taken) throw new Error("That username was claimed before approval.");

  const approvedAt = new Date();
  await db.transaction().execute(async (tx) => {
    await tx
      .updateTable("user")
      .set({
        display_username: request.requested_username,
        username: request.requested_username,
      })
      .where("id", "=", request.user_id)
      .execute();
    await tx
      .updateTable("username_change_request")
      .set({
        approved_at: approvedAt,
        status: "approved",
        updated_at: approvedAt,
      })
      .where("id", "=", request.id)
      .execute();
  });
  await sendEmail({
    body: `Your Chewbuu username is now @${request.requested_username}.`,
    html: `<p>Your Chewbuu username change was approved. Your new username is <strong>@${request.requested_username}</strong>.</p>`,
    subject: "Your Chewbuu username change was approved",
    to: request.email,
  });

  return {
    request: mapRequest({
      created_at: request.created_at,
      id: request.id,
      requested_username: request.requested_username,
      status: "approved",
    }),
  };
};
