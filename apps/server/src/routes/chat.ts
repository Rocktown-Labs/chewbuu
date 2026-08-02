import { db } from "@chewbuu/db";
import { and, asc, desc, eq, inArray } from "@chewbuu/db/orm";
import { user } from "@chewbuu/db/schema/auth";
import {
  chatMessage,
  chatParticipant,
  chatReadState,
  chatRoom,
  dateMatch,
  dateRequest,
} from "@chewbuu/db/schema/dating";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { getSessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";
import {
  chatChannel,
  emitRealtimeEvent,
  isRealtimeConfigured,
} from "../lib/realtime";
import { toStreamId } from "../lib/stream";

const chatRoute = createRouter();

const messageKindSchema = z.enum(["photo", "system", "text", "video", "voice"]);

const sendMessageSchema = z
  .object({
    durationSec: z.number().int().positive().optional(),
    kind: messageKindSchema.default("text"),
    mediaThumbUrl: z.string().url().optional(),
    mediaUrl: z.string().url().optional(),
    text: z.string().trim().max(4000).optional(),
  })
  .refine(
    (value) => Boolean(value.text || value.mediaUrl),
    "Message text or media is required."
  );

const demoFriends = [
  {
    id: "demo-avery-price",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
    name: "Avery Price",
  },
  {
    id: "demo-maya-ellis",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80",
    name: "Maya Ellis",
  },
] as const;

type ChatMessageRow = typeof chatMessage.$inferSelect;
type ChatParticipantRow = typeof chatParticipant.$inferSelect;
type ChatRoomRow = typeof chatRoom.$inferSelect;

const toMessageKind = (kind: string) => {
  const parsed = messageKindSchema.safeParse(kind);
  return parsed.success ? parsed.data : "text";
};

const ensureUser = async (
  sessionUser: Awaited<ReturnType<typeof getSessionUser>>
) => {
  await db
    .insert(user)
    .values({
      email: sessionUser.email,
      id: sessionUser.id,
      name: sessionUser.name || sessionUser.email,
    })
    .onConflictDoNothing();
};

const getOwnedRoom = async (roomId: string, userId: string) => {
  const [row] = await db
    .select({ room: chatRoom })
    .from(chatRoom)
    .innerJoin(chatParticipant, eq(chatParticipant.roomId, chatRoom.id))
    .where(and(eq(chatRoom.id, roomId), eq(chatParticipant.userId, userId)))
    .limit(1);

  if (!row) {
    throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
      message: "Chat room not found.",
    });
  }

  return row.room;
};

const serializeMessage = (message: ChatMessageRow) => ({
  createdAt: message.createdAt.toISOString(),
  durationSec: message.durationSec ?? undefined,
  id: message.id,
  kind: toMessageKind(message.kind),
  mediaThumbUrl: message.mediaThumbUrl ?? undefined,
  mediaUrl: message.mediaUrl ?? undefined,
  roomId: message.roomId,
  senderId: message.senderId,
  systemIcon: message.systemIcon ?? undefined,
  text: message.text ?? undefined,
});

const serializeParticipant = (participant: ChatParticipantRow) => ({
  avatarUrl: participant.avatarUrl ?? undefined,
  displayName: participant.displayName,
  id: participant.id,
  userId: participant.userId ?? undefined,
});

const serializeRoom = (
  room: ChatRoomRow,
  participants: ChatParticipantRow[],
  messages: ChatMessageRow[]
) => ({
  activeDateId: room.activeDateId ?? undefined,
  id: room.id,
  kind: room.kind,
  matchId: room.matchId ?? undefined,
  messages: messages.map(serializeMessage),
  participants: participants.map(serializeParticipant),
  phase: room.phase,
  title: room.title,
  updatedAt: room.updatedAt.toISOString(),
});

const loadRoomsForUser = async (userId: string) => {
  const roomRows = await db
    .select({ room: chatRoom })
    .from(chatRoom)
    .innerJoin(chatParticipant, eq(chatParticipant.roomId, chatRoom.id))
    .where(eq(chatParticipant.userId, userId))
    .orderBy(desc(chatRoom.updatedAt));

  const rooms = roomRows.map((row) => row.room);

  if (rooms.length === 0) {
    return [];
  }

  const roomIds = rooms.map((room) => room.id);
  const [participants, messages] = await Promise.all([
    db
      .select()
      .from(chatParticipant)
      .where(inArray(chatParticipant.roomId, roomIds)),
    db
      .select()
      .from(chatMessage)
      .where(inArray(chatMessage.roomId, roomIds))
      .orderBy(asc(chatMessage.createdAt)),
  ]);

  return rooms.map((room) =>
    serializeRoom(
      room,
      participants.filter((participant) => participant.roomId === room.id),
      messages.filter((message) => message.roomId === room.id).slice(-50)
    )
  );
};

const createFriendRoom = async (
  sessionUser: Awaited<ReturnType<typeof getSessionUser>>,
  friend: (typeof demoFriends)[number]
) => {
  const roomId = toStreamId(`friend_${sessionUser.id}_${friend.id}`);
  const currentParticipantId = toStreamId(
    `participant_${roomId}_${sessionUser.id}`
  );
  const friendParticipantId = toStreamId(`participant_${roomId}_${friend.id}`);

  await db
    .insert(chatRoom)
    .values({
      id: roomId,
      kind: "friend",
      phase: "continued",
      title: friend.name,
    })
    .onConflictDoNothing();

  await db
    .insert(chatParticipant)
    .values([
      {
        avatarUrl: null,
        displayName: sessionUser.name || sessionUser.email,
        id: currentParticipantId,
        roomId,
        userId: sessionUser.id,
      },
      {
        avatarUrl: friend.image,
        displayName: friend.name,
        id: friendParticipantId,
        roomId,
        userId: null,
      },
    ])
    .onConflictDoNothing();

  return roomId;
};

chatRoute.get("/chat/rooms", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  await ensureUser(sessionUser);

  const rooms = await loadRoomsForUser(sessionUser.id);
  return c.json({
    currentUserId: sessionUser.id,
    realtimeConfigured: isRealtimeConfigured(),
    rooms,
  });
});

chatRoute.post("/chat/rooms/demo-friends", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  await ensureUser(sessionUser);

  for (const friend of demoFriends) {
    await createFriendRoom(sessionUser, friend);
  }

  const rooms = await loadRoomsForUser(sessionUser.id);
  return c.json({
    currentUserId: sessionUser.id,
    realtimeConfigured: isRealtimeConfigured(),
    rooms,
  });
});

chatRoute.post("/chat/matches/:matchId/room", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  await ensureUser(sessionUser);

  const [matchRow] = await db
    .select({
      match: dateMatch,
      requestId: dateRequest.id,
      requesterUserId: dateRequest.userId,
    })
    .from(dateMatch)
    .innerJoin(dateRequest, eq(dateRequest.id, dateMatch.requestId))
    .where(
      and(
        eq(dateMatch.id, c.req.param("matchId")),
        eq(dateRequest.userId, sessionUser.id)
      )
    )
    .limit(1);

  if (!matchRow) {
    throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
      message: "Match not found.",
    });
  }

  const roomId = toStreamId(`date_${matchRow.match.id}`);

  await db
    .insert(chatRoom)
    .values({
      activeDateId: matchRow.requestId,
      id: roomId,
      kind: "date_room",
      matchId: matchRow.match.id,
      phase: "intros",
      title: matchRow.match.displayName,
    })
    .onConflictDoNothing();

  await db
    .insert(chatParticipant)
    .values([
      {
        displayName: sessionUser.name || sessionUser.email,
        id: toStreamId(`participant_${roomId}_${sessionUser.id}`),
        roomId,
        userId: sessionUser.id,
      },
      {
        avatarUrl: matchRow.match.profilePhotoUrl,
        displayName: matchRow.match.displayName,
        id: toStreamId(`participant_${roomId}_${matchRow.match.userId}`),
        roomId,
        userId: null,
      },
    ])
    .onConflictDoNothing();

  const rooms = await loadRoomsForUser(sessionUser.id);
  const room = rooms.find((item) => item.id === roomId);

  return c.json({ room });
});

chatRoute.get("/chat/rooms/:roomId/messages", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  const room = await getOwnedRoom(c.req.param("roomId"), sessionUser.id);

  const messages = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.roomId, room.id))
    .orderBy(asc(chatMessage.createdAt));

  return c.json({ messages: messages.map(serializeMessage) });
});

chatRoute.post("/chat/rooms/:roomId/messages", async (c) => {
  const sessionUser = await getSessionUser(c.req.raw.headers);
  await ensureUser(sessionUser);
  const room = await getOwnedRoom(c.req.param("roomId"), sessionUser.id);
  const body = sendMessageSchema.safeParse(
    await c.req.json().catch(() => ({}))
  );

  if (!body.success) {
    throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
      message: body.error.issues[0]?.message ?? "Invalid message.",
    });
  }

  const id = crypto.randomUUID();
  const [created] = await db
    .insert(chatMessage)
    .values({
      durationSec: body.data.durationSec,
      id,
      kind: body.data.kind,
      mediaThumbUrl: body.data.mediaThumbUrl,
      mediaUrl: body.data.mediaUrl,
      roomId: room.id,
      senderId: sessionUser.id,
      text: body.data.text,
    })
    .returning();

  if (!created) {
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: "Could not create chat message.",
    });
  }

  await db
    .update(chatRoom)
    .set({ updatedAt: new Date() })
    .where(eq(chatRoom.id, room.id));

  await db
    .insert(chatReadState)
    .values({
      roomId: room.id,
      userId: sessionUser.id,
    })
    .onConflictDoUpdate({
      set: { lastReadAt: new Date() },
      target: [chatReadState.roomId, chatReadState.userId],
    });

  const message = serializeMessage(created);
  const realtime = await emitRealtimeEvent({
    channel: chatChannel(room.id),
    data: message,
    event: "chat.message",
  });

  return c.json({ message, realtime });
});

export default chatRoute;
