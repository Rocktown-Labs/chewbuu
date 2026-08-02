import { db } from "@chewbuu/db";
import { and, eq } from "@chewbuu/db/orm";
import { chatParticipant } from "@chewbuu/db/schema/dating";
import { handle } from "@upstash/realtime";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { getSessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";
import { isRealtimeConfigured, realtime } from "../lib/realtime";

const realtimeRoute = createRouter();

const authorizeChannel = async (channel: string, userId: string) => {
  if (channel === `user:${userId}`) {
    return;
  }

  if (!channel.startsWith("chat:")) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Realtime channel is not available.",
    });
  }

  const roomId = channel.slice("chat:".length);
  const [participant] = await db
    .select({ id: chatParticipant.id })
    .from(chatParticipant)
    .where(
      and(
        eq(chatParticipant.roomId, roomId),
        eq(chatParticipant.userId, userId)
      )
    )
    .limit(1);

  if (!participant) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Realtime channel is not available.",
    });
  }
};

const realtimeHandler = handle({
  middleware: async ({ channels, request }) => {
    if (!isRealtimeConfigured()) {
      return Response.json(
        { message: "Realtime is not configured." },
        { status: HttpStatusCodes.SERVICE_UNAVAILABLE }
      );
    }

    const sessionUser = await getSessionUser(request.headers);

    if (channels.length === 0) {
      return Response.json(
        { message: "Choose at least one realtime channel." },
        { status: HttpStatusCodes.UNPROCESSABLE_ENTITY }
      );
    }

    for (const channel of channels) {
      await authorizeChannel(channel, sessionUser.id);
    }
  },
  realtime,
});

realtimeRoute.get("/realtime", async (c) => {
  return realtimeHandler(c.req.raw);
});

export default realtimeRoute;
