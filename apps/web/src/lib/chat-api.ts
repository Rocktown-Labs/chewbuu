import type {
  ChatMessage,
  ChatMessageKind,
  ChatPerson,
  ChatThread,
  DateRoomPhase,
} from "@/features/chat/chat-types";
import { apiFetch } from "@/lib/dating-api";

export interface ApiChatMessage {
  createdAt: string;
  durationSec?: number;
  id: string;
  kind: "photo" | "system" | "text" | "video" | "voice";
  mediaThumbUrl?: string;
  mediaUrl?: string;
  roomId: string;
  senderId: string;
  systemIcon?: ChatMessage["systemIcon"];
  text?: string;
}

interface ApiChatParticipant {
  avatarUrl?: string;
  displayName: string;
  id: string;
  userId?: string;
}

interface ApiChatRoom {
  activeDateId?: string;
  id: string;
  kind: "date_room" | "friend" | string;
  matchId?: string;
  messages: ApiChatMessage[];
  participants: ApiChatParticipant[];
  phase: DateRoomPhase | string;
  title: string;
  updatedAt: string;
}

export interface ChatRoomsResponse {
  currentUserId: string;
  realtimeConfigured: boolean;
  rooms: ApiChatRoom[];
}

export interface SendChatMessageInput {
  durationSec?: number;
  kind?: Exclude<ChatMessageKind, "intro_video">;
  mediaThumbUrl?: string;
  mediaUrl?: string;
  text?: string;
}

export interface SendChatMessageResponse {
  message: ApiChatMessage;
  realtime: { delivered: boolean };
}

const toMessageKind = (kind: ApiChatMessage["kind"]): ChatMessageKind => kind;

export const toChatMessage = (
  message: ApiChatMessage,
  currentUserId: string
): ChatMessage => ({
  createdAt: message.createdAt,
  durationSec: message.durationSec,
  id: message.id,
  kind: toMessageKind(message.kind),
  mediaThumb: message.mediaThumbUrl,
  mediaUrl: message.mediaUrl,
  senderId: message.senderId === currentUserId ? "me" : message.senderId,
  systemIcon: message.systemIcon,
  text: message.text,
});

const toChatPerson = (participant: ApiChatParticipant): ChatPerson => ({
  avatar: participant.avatarUrl ?? "",
  id: participant.userId ?? participant.id,
  name: participant.displayName,
});

const formatThreadTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Now";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const toChatThread = (
  room: ApiChatRoom,
  currentUserId: string
): ChatThread => {
  const messages = room.messages.map((message) =>
    toChatMessage(message, currentUserId)
  );
  const lastMessage = messages.at(-1);

  return {
    id: room.id,
    kind: room.kind === "date_room" ? "date_room" : "friend",
    lastMessage:
      lastMessage?.kind === "text"
        ? (lastMessage.text ?? "")
        : lastMessage?.kind === "video"
          ? "Video"
          : lastMessage?.kind === "voice"
            ? "Voice note"
            : lastMessage?.kind === "photo"
              ? "Photo"
              : (lastMessage?.text ?? "Start the conversation"),
    messages,
    participants: room.participants
      .filter((participant) => participant.userId !== currentUserId)
      .map(toChatPerson),
    phase: room.phase as DateRoomPhase,
    time: formatThreadTime(room.updatedAt),
    title: room.title,
  };
};

export const chatApi = {
  bootstrapDemoFriends: () =>
    apiFetch<ChatRoomsResponse>("/chat/rooms/demo-friends", {
      method: "POST",
    }),
  getRooms: () => apiFetch<ChatRoomsResponse>("/chat/rooms"),
  sendMessage: (roomId: string, body: SendChatMessageInput) =>
    apiFetch<SendChatMessageResponse>(`/chat/rooms/${roomId}/messages`, {
      body,
      method: "POST",
    }),
};
