import { DistributedTable } from "@aws-blocks/bb-distributed-table";
import { KVStore } from "@aws-blocks/bb-kv-store";
import type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";
import { ApiNamespace, Realtime, Scope } from "@aws-blocks/blocks";
import { auth } from "@chewbuu/auth";
import { z } from "zod";

import { db } from "./database";
import type {
  ApiChatMessage,
  ApiChatParticipant,
  ApiChatRoom,
  SendChatMessageInput,
} from "./types";

const scope = new Scope("chewbuu-api");

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

const realtime = new Realtime(scope, "chat", {
  namespaces: {
    messages: Realtime.namespace(chatMessageSchema),
    typing: Realtime.namespace(
      z.object({
        isTyping: z.boolean(),
        roomId: z.string(),
        userId: z.string(),
      })
    ),
  },
});

const roomProjectionSchema = z.object({
  kind: z.string(),
  phase: z.string(),
  roomId: z.string(),
  roomKey: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  userId: z.string(),
});

const roomProjection = new DistributedTable(scope, "room-list", {
  indexes: {
    byUpdatedAt: { partitionKey: "userId", sortKey: "updatedAt" },
  },
  key: { partitionKey: "userId", sortKey: "roomKey" },
  schema: roomProjectionSchema,
});

const roomListCache = new KVStore(scope, "room-list-cache", {
  schema: z.object({ expiresAt: z.number(), roomIds: z.array(z.string()) }),
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

const requireSession = async (headers: Headers): Promise<SessionUser> => {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) throw new Error("Authentication required");
  return session.user;
};

const toMessage = (message: {
  created_at: Date;
  duration_sec: number | null;
  id: string;
  kind: string;
  media_thumb_url: string | null;
  media_url: string | null;
  room_id: string;
  sender_id: string;
  system_icon: string | null;
  text: string | null;
}): ApiChatMessage => ({
  createdAt: message.created_at.toISOString(),
  durationSec: message.duration_sec ?? undefined,
  id: message.id,
  kind: chatMessageSchema.shape.kind.parse(message.kind),
  mediaThumbUrl: message.media_thumb_url ?? undefined,
  mediaUrl: message.media_url ?? undefined,
  roomId: message.room_id,
  senderId: message.sender_id,
  systemIcon: message.system_icon
    ? chatMessageSchema.shape.systemIcon.parse(message.system_icon)
    : undefined,
  text: message.text ?? undefined,
});

const toParticipant = (participant: ApiChatParticipant) => participant;

const toRoom = async (
  room: {
    active_date_id: string | null;
    id: string;
    kind: string;
    match_id: string | null;
    phase: string;
    title: string;
    updated_at: Date;
  },
  participants: ApiChatParticipant[],
  messages: ApiChatMessage[]
): Promise<ApiChatRoom> => ({
  activeDateId: room.active_date_id ?? undefined,
  id: room.id,
  kind: room.kind,
  matchId: room.match_id ?? undefined,
  messages,
  participants: participants.map(toParticipant),
  phase: room.phase,
  realtimeChannel: (await realtime.getChannel(
    "messages",
    room.id
  )) as unknown as RealtimeChannelClient<ApiChatMessage>,
  title: room.title,
  updatedAt: room.updated_at.toISOString(),
});

const loadRoomsFromDatabase = async (userId: string, roomIds?: string[]) => {
  let roomQuery = db
    .selectFrom("chat_room as room")
    .innerJoin(
      "chat_participant as membership",
      "membership.room_id",
      "room.id"
    )
    .selectAll("room")
    .where("membership.user_id", "=", userId)
    .orderBy("room.updated_at", "desc");

  if (roomIds?.length) roomQuery = roomQuery.where("room.id", "in", roomIds);

  const rooms = await roomQuery.execute();
  if (rooms.length === 0) return [];
  const ids = rooms.map((room) => room.id);

  const [participants, messages] = await Promise.all([
    db
      .selectFrom("chat_participant")
      .selectAll()
      .where("room_id", "in", ids)
      .execute(),
    db
      .selectFrom("chat_message")
      .selectAll()
      .where("room_id", "in", ids)
      .orderBy("created_at", "asc")
      .execute(),
  ]);

  const result = await Promise.all(
    rooms.map((room) =>
      toRoom(
        room,
        participants
          .filter((participant) => participant.room_id === room.id)
          .map((participant) => ({
            avatarUrl: participant.avatar_url ?? undefined,
            displayName: participant.display_name,
            id: participant.id,
            userId: participant.user_id ?? undefined,
          })),
        messages
          .filter((message) => message.room_id === room.id)
          .slice(-50)
          .map(toMessage)
      )
    )
  );

  await roomProjection.putBatch(
    rooms.map((room) => ({
      kind: room.kind,
      phase: room.phase,
      roomId: room.id,
      roomKey: `${room.updated_at.getTime()}#${room.id}`,
      title: room.title,
      updatedAt: room.updated_at.getTime(),
      userId,
    }))
  );
  await roomListCache.put(userId, {
    expiresAt: Date.now() + 30_000,
    roomIds: rooms.map((room) => room.id),
  });
  return result;
};

const loadRooms = async (userId: string) => {
  const cached = await roomListCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    const rooms = await loadRoomsFromDatabase(userId, cached.roomIds);
    if (rooms.length) return rooms;
  }

  const projected = await Array.fromAsync(
    roomProjection.query({
      where: { userId: { equals: userId } },
      order: "desc",
    })
  );
  return loadRoomsFromDatabase(
    userId,
    projected.length ? projected.map((room) => room.roomId) : undefined
  );
};

const createFriendRoom = async (
  sessionUser: SessionUser,
  friend: (typeof demoFriends)[number]
) => {
  const roomId = `friend_${sessionUser.id}_${friend.id}`;
  const now = new Date();
  await db
    .insertInto("chat_room")
    .values({
      id: roomId,
      kind: "friend",
      phase: "continued",
      title: friend.name,
      created_at: now,
      updated_at: now,
      active_date_id: null,
      match_id: null,
    })
    .onConflict((conflict) => conflict.column("id").doNothing())
    .execute();
  await db
    .insertInto("chat_participant")
    .values([
      {
        avatar_url: null,
        display_name: sessionUser.name || sessionUser.email,
        id: `participant_${roomId}_${sessionUser.id}`,
        room_id: roomId,
        user_id: sessionUser.id,
      },
      {
        avatar_url: friend.image,
        display_name: friend.name,
        id: `participant_${roomId}_${friend.id}`,
        room_id: roomId,
        user_id: null,
      },
    ])
    .onConflict((conflict) => conflict.column("id").doNothing())
    .execute();
};

const getOwnedRoom = async (roomId: string, userId: string) => {
  const room = await db
    .selectFrom("chat_room as room")
    .innerJoin(
      "chat_participant as membership",
      "membership.room_id",
      "room.id"
    )
    .selectAll("room")
    .where("room.id", "=", roomId)
    .where("membership.user_id", "=", userId)
    .executeTakeFirst();
  if (!room) throw new Error("Chat room not found");
  return room;
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
    return {
      currentUserId: sessionUser.id,
      rooms: await loadRooms(sessionUser.id),
    };
  },

  async bootstrapDemoFriends() {
    const sessionUser = await requireSession(context.request.headers);
    for (const friend of demoFriends)
      await createFriendRoom(sessionUser, friend);
    return {
      currentUserId: sessionUser.id,
      rooms: await loadRooms(sessionUser.id),
    };
  },

  async getMessages(roomId: string) {
    const sessionUser = await requireSession(context.request.headers);
    const room = await getOwnedRoom(roomId, sessionUser.id);
    const messages = await db
      .selectFrom("chat_message")
      .selectAll()
      .where("room_id", "=", room.id)
      .orderBy("created_at", "asc")
      .execute();
    return { messages: messages.map(toMessage) };
  },

  async sendMessage(roomId: string, input: SendChatMessageInput) {
    const sessionUser = await requireSession(context.request.headers);
    const room = await getOwnedRoom(roomId, sessionUser.id);
    const body = sendMessageSchema.parse(input);
    const now = new Date();
    const [created] = await db
      .insertInto("chat_message")
      .values({
        id: crypto.randomUUID(),
        kind: body.kind,
        room_id: room.id,
        sender_id: sessionUser.id,
        text: body.text ?? null,
        duration_sec: body.durationSec ?? null,
        media_thumb_url: body.mediaThumbUrl ?? null,
        media_url: body.mediaUrl ?? null,
        system_icon: null,
        created_at: now,
      })
      .returningAll()
      .execute();
    if (!created) throw new Error("Could not create chat message");

    await Promise.all([
      db
        .updateTable("chat_room")
        .set({ updated_at: now })
        .where("id", "=", room.id)
        .execute(),
      db
        .insertInto("chat_read_state")
        .values({
          last_read_at: now,
          room_id: room.id,
          user_id: sessionUser.id,
        })
        .onConflict((conflict) =>
          conflict
            .columns(["room_id", "user_id"])
            .doUpdateSet({ last_read_at: now })
        )
        .execute(),
      roomListCache.delete(sessionUser.id),
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
