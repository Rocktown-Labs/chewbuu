import type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";
import { ApiNamespace, Realtime, Scope } from "@aws-blocks/blocks";
import { auth } from "@chewbuu/auth";
import { db } from "@chewbuu/db";
import { and, asc, desc, eq, inArray } from "@chewbuu/db/orm";
import { user } from "@chewbuu/db/schema/auth";
import {
  chatMessage,
  chatParticipant,
  chatReadState,
  chatRoom,
} from "@chewbuu/db/schema/dating";
import { z } from "zod";

import type {
  ApiChatMessage,
  ApiChatParticipant,
  ApiChatRoom,
  SendChatMessageInput,
} from "./types";

const scope = new Scope("chewbuu");

const chatMessageSchema = z.object({
  createdAt: z.string(),
  durationSec: z.number().optional(),
  id: z.string(),
  kind: z.enum(["photo", "system", "text", "video", "voice"]),
  mediaThumbUrl: z.string().optional(),
  mediaUrl: z.string().optional(),
  roomId: z.string(),
  senderId: z.string(),
  systemIcon: z
    .enum(["user", "check", "calendar", "branch", "heart", "block"])
    .optional(),
  text: z.string().optional(),
});

const systemIconSchema = z.enum([
  "user",
  "check",
  "calendar",
  "branch",
  "heart",
  "block",
]);

const realtime = new Realtime(scope, "chat", {
  namespaces: {
    messages: Realtime.namespace(chatMessageSchema),
  },
});

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

type SessionUser = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["user"];
type ChatMessageRow = typeof chatMessage.$inferSelect;
type ChatParticipantRow = typeof chatParticipant.$inferSelect;
type ChatRoomRow = typeof chatRoom.$inferSelect;

const requireSession = async (headers: Headers): Promise<SessionUser> => {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new Error("Authentication required");
  }
  return session.user;
};

const toMessage = (message: ChatMessageRow): ApiChatMessage => ({
  createdAt: message.createdAt.toISOString(),
  durationSec: message.durationSec ?? undefined,
  id: message.id,
  kind: chatMessageSchema.shape.kind.parse(message.kind),
  mediaThumbUrl: message.mediaThumbUrl ?? undefined,
  mediaUrl: message.mediaUrl ?? undefined,
  roomId: message.roomId,
  senderId: message.senderId,
  systemIcon: message.systemIcon
    ? systemIconSchema.parse(message.systemIcon)
    : undefined,
  text: message.text ?? undefined,
});

const toParticipant = (
  participant: ChatParticipantRow
): ApiChatParticipant => ({
  avatarUrl: participant.avatarUrl ?? undefined,
  displayName: participant.displayName,
  id: participant.id,
  userId: participant.userId ?? undefined,
});

const toRoom = async (
  room: ChatRoomRow,
  participants: ChatParticipantRow[],
  messages: ChatMessageRow[]
): Promise<ApiChatRoom> => ({
  activeDateId: room.activeDateId ?? undefined,
  id: room.id,
  kind: room.kind,
  matchId: room.matchId ?? undefined,
  messages: messages.map(toMessage),
  participants: participants.map(toParticipant),
  phase: room.phase,
  realtimeChannel: (await realtime.getChannel(
    "messages",
    room.id
  )) as unknown as RealtimeChannelClient<ApiChatMessage>,
  title: room.title,
  updatedAt: room.updatedAt.toISOString(),
});

const loadRooms = async (userId: string) => {
  const roomRows = await db
    .select({ room: chatRoom })
    .from(chatRoom)
    .innerJoin(chatParticipant, eq(chatParticipant.roomId, chatRoom.id))
    .where(eq(chatParticipant.userId, userId))
    .orderBy(desc(chatRoom.updatedAt));
  const rooms = roomRows.map(({ room }) => room);
  if (rooms.length === 0) return [];

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

  return Promise.all(
    rooms.map((room) =>
      toRoom(
        room,
        participants.filter((participant) => participant.roomId === room.id),
        messages.filter((message) => message.roomId === room.id).slice(-50)
      )
    )
  );
};

const ensureUser = async (sessionUser: SessionUser) => {
  await db
    .insert(user)
    .values({
      email: sessionUser.email,
      id: sessionUser.id,
      name: sessionUser.name || sessionUser.email,
    })
    .onConflictDoNothing();
};

const createFriendRoom = async (
  sessionUser: SessionUser,
  friend: (typeof demoFriends)[number]
) => {
  const roomId = `friend_${sessionUser.id}_${friend.id}`;
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
        id: `participant_${roomId}_${sessionUser.id}`,
        roomId,
        userId: sessionUser.id,
      },
      {
        avatarUrl: friend.image,
        displayName: friend.name,
        id: `participant_${roomId}_${friend.id}`,
        roomId,
        userId: null,
      },
    ])
    .onConflictDoNothing();
};

const getOwnedRoom = async (roomId: string, userId: string) => {
  const [row] = await db
    .select({ room: chatRoom })
    .from(chatRoom)
    .innerJoin(chatParticipant, eq(chatParticipant.roomId, chatRoom.id))
    .where(and(eq(chatRoom.id, roomId), eq(chatParticipant.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Chat room not found");
  return row.room;
};

const sendMessageSchema = z
  .object({
    durationSec: z.number().int().positive().optional(),
    kind: z.enum(["photo", "text", "video", "voice"]).default("text"),
    mediaThumbUrl: z.string().url().optional(),
    mediaUrl: z.string().url().optional(),
    text: z.string().trim().max(4000).optional(),
  })
  .refine((value) => Boolean(value.text || value.mediaUrl), {
    message: "Message text or media is required.",
  });

export const api = new ApiNamespace(scope, "api", (context) => ({
  async getRooms() {
    const sessionUser = await requireSession(context.request.headers);
    await ensureUser(sessionUser);
    return {
      currentUserId: sessionUser.id,
      rooms: await loadRooms(sessionUser.id),
    };
  },

  async bootstrapDemoFriends() {
    const sessionUser = await requireSession(context.request.headers);
    await ensureUser(sessionUser);
    for (const friend of demoFriends) {
      await createFriendRoom(sessionUser, friend);
    }
    return {
      currentUserId: sessionUser.id,
      rooms: await loadRooms(sessionUser.id),
    };
  },

  async getMessages(roomId: string) {
    const sessionUser = await requireSession(context.request.headers);
    const room = await getOwnedRoom(roomId, sessionUser.id);
    const messages = await db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.roomId, room.id))
      .orderBy(asc(chatMessage.createdAt));
    return { messages: messages.map(toMessage) };
  },

  async sendMessage(roomId: string, input: SendChatMessageInput) {
    const sessionUser = await requireSession(context.request.headers);
    await ensureUser(sessionUser);
    const room = await getOwnedRoom(roomId, sessionUser.id);
    const body = sendMessageSchema.parse(input);
    const [created] = await db
      .insert(chatMessage)
      .values({
        durationSec: body.durationSec,
        id: crypto.randomUUID(),
        kind: body.kind,
        mediaThumbUrl: body.mediaThumbUrl,
        mediaUrl: body.mediaUrl,
        roomId: room.id,
        senderId: sessionUser.id,
        text: body.text,
      })
      .returning();
    if (!created) throw new Error("Could not create chat message");

    const now = new Date();
    await Promise.all([
      db
        .update(chatRoom)
        .set({ updatedAt: now })
        .where(eq(chatRoom.id, room.id)),
      db
        .insert(chatReadState)
        .values({ roomId: room.id, userId: sessionUser.id })
        .onConflictDoUpdate({
          set: { lastReadAt: now },
          target: [chatReadState.roomId, chatReadState.userId],
        }),
    ]);

    const message = toMessage(created);
    try {
      await realtime.publish("messages", room.id, message);
      return { message, published: true };
    } catch (error) {
      console.error("AWS Blocks realtime publish failed", error);
      return { message, published: false };
    }
  },
}));
