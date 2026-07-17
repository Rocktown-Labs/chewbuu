import { db } from "@chewbuu/db";
import { and, eq } from "@chewbuu/db/orm";
import { dateMatch, dateRequest } from "@chewbuu/db/schema/dating";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { getSessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";
import {
  getStreamClients,
  toStreamId,
  upsertStreamUser,
  upsertSyntheticStreamUser,
} from "../lib/stream";

const streamRoute = createRouter();

const assertStreamClients = () => {
  const clients = getStreamClients();

  if (!clients) {
    throw new HTTPException(HttpStatusCodes.SERVICE_UNAVAILABLE, {
      message:
        "Stream is not configured yet. Add STREAM_API_KEY and STREAM_API_SECRET.",
    });
  }

  return clients;
};

const getOwnedMatch = async (matchId: string, userId: string) => {
  const [row] = await db
    .select({
      compatibility: dateMatch.compatibility,
      displayName: dateMatch.displayName,
      id: dateMatch.id,
      introVideoUrl: dateMatch.introVideoUrl,
      profilePhotoUrl: dateMatch.profilePhotoUrl,
      profileSummary: dateMatch.profileSummary,
      requestId: dateMatch.requestId,
      status: dateMatch.status,
      userId: dateMatch.userId,
      videoRepliesRequired: dateMatch.videoRepliesRequired,
    })
    .from(dateMatch)
    .innerJoin(dateRequest, eq(dateRequest.id, dateMatch.requestId))
    .where(and(eq(dateMatch.id, matchId), eq(dateRequest.userId, userId)))
    .limit(1);

  if (!row) {
    throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
      message: "Match not found.",
    });
  }

  return row;
};

streamRoute.get("/stream/token", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  const clients = assertStreamClients();
  const streamUser = await upsertStreamUser(clients, sessionUser);
  const tokenPayload = { user_id: streamUser.id };
  const token = clients.streamClient.generateUserToken(tokenPayload);

  return c.json({
    apiKey: clients.apiKey,
    chatToken: clients.chatClient.createToken(streamUser.id),
    feedToken: token,
    name: streamUser.name,
    userId: streamUser.id,
    videoToken: token,
  });
});

streamRoute.post("/stream/matches/:matchId/conversation", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  const match = await getOwnedMatch(c.req.param("matchId"), sessionUser.id);
  const clients = assertStreamClients();
  const requester = await upsertStreamUser(clients, sessionUser);
  const matchedUser = await upsertSyntheticStreamUser(clients, {
    displayName: match.displayName,
    id: match.userId,
    image: match.profilePhotoUrl,
  });
  const channelId = toStreamId(`match_${match.id}`);
  const channel = clients.chatClient.channel("messaging", channelId, {
    created_by_id: requester.id,
    members: [requester.id, matchedUser.id],
    name: `${sessionUser.name} & ${match.displayName}`,
  } as never);

  await channel.watch();

  return c.json({
    callId: channelId,
    callType: "default",
    channelCid: channel.cid,
    channelId,
    channelType: "messaging",
    match: {
      compatibility: match.compatibility,
      displayName: match.displayName,
      id: match.id,
      introVideoUrl: match.introVideoUrl,
      profilePhotoUrl: match.profilePhotoUrl,
      profileSummary: match.profileSummary,
      status: match.status,
      userId: match.userId,
      videoRepliesRequired: match.videoRepliesRequired,
    },
    matchedUserId: matchedUser.id,
    requesterId: requester.id,
  });
});

export default streamRoute;
