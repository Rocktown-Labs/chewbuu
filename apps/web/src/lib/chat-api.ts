import { api } from "@chewbuu/aws-blocks";
import type {
  ApiChatMessage,
  ApiChatRoom,
  ChatRoomsResponse,
  SendChatMessageInput,
  SendChatMessageResponse,
} from "@chewbuu/aws-blocks";

import type {
  ChatMessage,
  ChatMessageKind,
  ChatPerson,
  ChatThread,
  DateRoomPhase,
} from "@/features/chat/chat-types";

export type {
  ApiChatMessage,
  ApiChatRoom,
  ChatRoomsResponse,
  SendChatMessageInput,
  SendChatMessageResponse,
} from "@chewbuu/aws-blocks";

type ApiChatParticipant = ApiChatRoom["participants"][number];

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
    lastActivityAt: new Date(room.updatedAt).getTime(),
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
    unreadCount: room.unreadCount,
  };
};

export const chatApi = {
  getRooms: (): Promise<ChatRoomsResponse> => api.getRooms(),
  sendMessage: (
    roomId: string,
    body: SendChatMessageInput
  ): Promise<SendChatMessageResponse> => api.sendMessage(roomId, body),
  markChatRead: (roomId: string): Promise<{ ok: true }> =>
    api.markChatRead(roomId),
  publishTyping: (roomId: string, isTyping: boolean): Promise<{ ok: true }> =>
    api.publishTyping(roomId, isTyping),
};
