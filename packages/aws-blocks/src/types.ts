import type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";

export type ChatMessageKind = "photo" | "system" | "text" | "video" | "voice";

export interface ApiChatMessage {
  createdAt: string;
  durationSec?: number;
  id: string;
  kind: ChatMessageKind;
  mediaThumbUrl?: string;
  mediaUrl?: string;
  roomId: string;
  senderId: string;
  systemIcon?: "user" | "check" | "calendar" | "branch" | "heart" | "block";
  text?: string;
}

export interface ApiChatParticipant {
  avatarUrl?: string;
  displayName: string;
  id: string;
  userId?: string;
}

export interface ApiChatRoom {
  activeDateId?: string;
  id: string;
  kind: string;
  matchId?: string;
  messages: ApiChatMessage[];
  participants: ApiChatParticipant[];
  phase: string;
  realtimeChannel: RealtimeChannelClient<ApiChatMessage>;
  title: string;
  updatedAt: string;
}

export interface ChatRoomsResponse {
  currentUserId: string;
  rooms: ApiChatRoom[];
}

export interface SendChatMessageInput {
  durationSec?: number;
  kind?: Exclude<ChatMessageKind, "system">;
  mediaThumbUrl?: string;
  mediaUrl?: string;
  text?: string;
}

export interface SendChatMessageResponse {
  message: ApiChatMessage;
  published: boolean;
}

export interface AwsBlocksApi {
  [method: string]: (...args: any[]) => Promise<unknown>;
  bootstrapDemoFriends: () => Promise<ChatRoomsResponse>;
  getRooms: () => Promise<ChatRoomsResponse>;
  getMessages: (roomId: string) => Promise<{ messages: ApiChatMessage[] }>;
  sendMessage: (
    roomId: string,
    input: SendChatMessageInput
  ) => Promise<SendChatMessageResponse>;
}
