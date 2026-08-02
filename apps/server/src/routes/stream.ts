import { db } from "@chewbuu/db";
import { and, eq } from "@chewbuu/db/orm";
import { dateMatch, dateRequest } from "@chewbuu/db/schema/dating";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { getSessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";
import { toStreamId } from "../lib/stream";

const streamRoute = createRouter();

const demoFriends = [
  {
    id: "demo-avery-price",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
    name: "Avery Price",
    text: "Hey, I saw your recap from The Root. Want to try that new taco spot this week?",
  },
  {
    id: "demo-maya-ellis",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80",
    name: "Maya Ellis",
    text: "I am down for coffee, karaoke, or both. Your move.",
  },
] as const;

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
  const streamUserId = toStreamId(sessionUser.id);

  return c.json({
    apiKey: "chewbuu_local_key",
    chatToken: "chewbuu_local_chat_token",
    feedToken: "chewbuu_local_feed_token",
    name: sessionUser.name || sessionUser.email,
    userId: streamUserId,
    videoToken: "chewbuu_local_video_token",
  });
});

streamRoute.post("/stream/matches/:matchId/conversation", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  const match = await getOwnedMatch(c.req.param("matchId"), sessionUser.id);
  const requesterId = toStreamId(sessionUser.id);
  const matchedUserId = toStreamId(match.userId);
  const channelId = toStreamId(`match_${match.id}`);

  return c.json({
    callId: channelId,
    callType: "default",
    channelCid: `messaging:${channelId}`,
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
    matchedUserId,
    requesterId,
  });
});

streamRoute.post("/stream/chats/demo-friends", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  const requesterId = toStreamId(sessionUser.id);

  const channels = demoFriends.map((friend) => {
    const friendId = toStreamId(friend.id);
    const channelId = toStreamId(`friend_${requesterId}_${friendId}`);
    return {
      cid: `messaging:${channelId}`,
      friendName: friend.name,
      id: channelId,
    };
  });

  return c.json({ channels });
});

export default streamRoute;
