import {
  createCollection,
  localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";

import type { ApiChatMessage, ApiChatRoom } from "@/lib/chat-api";

export const chatParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  initials: z.string().optional(),
  age: z.number().optional(),
  area: z.string().optional(),
  isHost: z.boolean().optional(),
  videoUrl: z.string().optional(),
});

export const chatRoomSchema = z.object({
  id: z.string(),
  kind: z.enum(["friend", "date_room"]),
  title: z.string(),
  phase: z
    .enum([
      "intro",
      "video",
      "unlocked",
      "continued",
      "friended",
      "picked",
      "blocked",
    ])
    .optional(),
  avatarUrl: z.string().optional(),
  participants: z.array(chatParticipantSchema),
  lastMessage: z.string().default(""),
  lastActivityAt: z.number(),
  time: z.string().default("Now"),
  archived: z.boolean().default(false),
  unreadCount: z.number().default(0),
  icebreakers: z.array(z.string()).optional(),
  targetDateId: z.string().optional(),
});

export type DbChatRoom = z.infer<typeof chatRoomSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderId: z.string(),
  kind: z.enum([
    "text",
    "video",
    "voice",
    "photo",
    "system",
    "intro_video",
    "video_call",
  ]),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  durationSec: z.number().optional(),
  systemIcon: z.string().optional(),
  createdAt: z.number(),
  time: z.string().default("Just now"),
  isRead: z.boolean().default(false),
  status: z.enum(["pending", "sent", "error"]).default("sent"),
});

export type DbChatMessage = z.infer<typeof chatMessageSchema>;

export const chatReadStateSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  lastReadAt: z.number(),
  lastReadMessageId: z.string().optional(),
});

export type DbChatReadState = z.infer<typeof chatReadStateSchema>;

/**
 * Normalized TanStack DB collection for Chat Rooms / Threads
 */
export const chatRoomsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "chat-rooms",
    schema: chatRoomSchema,
    getKey: (room) => room.id,
  })
);

/**
 * Normalized TanStack DB collection for Chat Messages
 */
export const chatMessagesCollection = createCollection(
  localOnlyCollectionOptions({
    id: "chat-messages",
    schema: chatMessageSchema,
    getKey: (msg) => msg.id,
  })
);

/**
 * Normalized TanStack DB collection for Read States
 */
export const chatReadStatesCollection = createCollection(
  localOnlyCollectionOptions({
    id: "chat-read-states",
    schema: chatReadStateSchema,
    getKey: (item) => item.id,
  })
);

/**
 * Helper to sync API chat rooms into TanStack DB
 */
export function syncRoomsToDb(
  rooms: ApiChatRoom[],
  currentUserId: string
): void {
  for (const room of rooms) {
    const participants: z.infer<typeof chatParticipantSchema>[] =
      room.participants.map((p) => {
        const name = p.displayName || "Member";
        return {
          id: p.userId || p.id,
          name,
          avatarUrl: p.avatarUrl ?? undefined,
          initials: name
            .split(" ")
            .map((part: string) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        };
      });

    const lastMessageObj = room.messages.at(-1);
    const lastActivity = lastMessageObj
      ? new Date(lastMessageObj.createdAt).getTime()
      : new Date(room.updatedAt).getTime();

    // Map messages
    for (const msg of room.messages) {
      const msgData: DbChatMessage = {
        id: msg.id,
        roomId: room.id,
        senderId: msg.senderId === currentUserId ? "me" : msg.senderId,
        kind: msg.kind as DbChatMessage["kind"],
        text: msg.text ?? undefined,
        mediaUrl: msg.mediaUrl ?? undefined,
        durationSec: msg.durationSec ?? undefined,
        systemIcon: msg.systemIcon ?? undefined,
        createdAt: new Date(msg.createdAt).getTime(),
        time: new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        isRead: msg.senderId === currentUserId,
        status: "sent",
      };

      const existingMsg = chatMessagesCollection.get(msg.id);
      if (existingMsg) {
        chatMessagesCollection.update(msg.id, (draft) => {
          Object.assign(draft, msgData);
        });
      } else {
        chatMessagesCollection.insert(msgData);
      }
    }

    const roomData: DbChatRoom = {
      id: room.id,
      kind: room.kind === "date_room" ? "date_room" : "friend",
      title:
        room.title ||
        participants.find((p) => p.id !== currentUserId)?.name ||
        "Conversation",
      phase: (room.phase as DbChatRoom["phase"]) ?? "intro",
      participants,
      lastMessage:
        lastMessageObj?.text ??
        (lastMessageObj?.kind === "video" ? "Video" : ""),
      lastActivityAt: lastActivity,
      time: lastMessageObj
        ? new Date(lastMessageObj.createdAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "Now",
      archived: false,
      unreadCount: room.unreadCount ?? 0,
    };

    const existingRoom = chatRoomsCollection.get(room.id);
    if (existingRoom) {
      chatRoomsCollection.update(room.id, (draft) => {
        Object.assign(draft, roomData);
      });
    } else {
      chatRoomsCollection.insert(roomData);
    }
  }
}

/**
 * Helper to record incoming realtime message into TanStack DB
 */
export function insertRealtimeMessageToDb(
  data: ApiChatMessage,
  currentUserId: string,
  isCurrentRoomOpen: boolean
): void {
  const isMe = data.senderId === currentUserId;
  const createdAt = new Date(data.createdAt).getTime();

  const msgData: DbChatMessage = {
    id: data.id,
    roomId: data.roomId,
    senderId: isMe ? "me" : data.senderId,
    kind: data.kind as DbChatMessage["kind"],
    text: data.text ?? undefined,
    mediaUrl: data.mediaUrl ?? undefined,
    durationSec: data.durationSec ?? undefined,
    systemIcon: data.systemIcon ?? undefined,
    createdAt,
    time: new Date(data.createdAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    isRead: isCurrentRoomOpen || isMe,
    status: "sent",
  };

  const existingMsg = chatMessagesCollection.get(data.id);
  if (existingMsg) {
    chatMessagesCollection.update(data.id, (draft) => {
      Object.assign(draft, msgData);
    });
  } else {
    chatMessagesCollection.insert(msgData);
  }

  const existingRoom = chatRoomsCollection.get(data.roomId);
  if (existingRoom) {
    chatRoomsCollection.update(data.roomId, (draft) => {
      draft.lastMessage =
        data.text ?? (data.kind === "video" ? "Video" : "Media");
      draft.lastActivityAt = createdAt;
      draft.time = "Just now";
      if (!isMe && !isCurrentRoomOpen) {
        draft.unreadCount = (draft.unreadCount ?? 0) + 1;
      }
    });
  }
}
