import type { ChatMessage } from "./chat-types";

export function createSystemMessage(
  text: string,
  systemIcon: ChatMessage["systemIcon"] = "branch"
): ChatMessage {
  return {
    createdAt: new Date().toISOString(),
    id: `sys-${crypto.randomUUID()}`,
    kind: "system",
    senderId: "me",
    systemIcon,
    text,
  };
}

export function createTextMessage(
  text: string,
  senderId: "me" | string = "me"
): ChatMessage {
  return {
    createdAt: new Date().toISOString(),
    id: `msg-${crypto.randomUUID()}`,
    kind: "text",
    senderId,
    text,
  };
}

export function createMediaMessage(input: {
  durationSec?: number;
  kind: "video" | "voice" | "photo";
  mediaThumb?: string;
  mediaUrl: string;
  senderId?: "me" | string;
  text?: string;
}): ChatMessage {
  return {
    createdAt: new Date().toISOString(),
    durationSec: input.durationSec,
    id: `msg-${crypto.randomUUID()}`,
    kind: input.kind,
    mediaThumb: input.mediaThumb ?? input.mediaUrl,
    mediaUrl: input.mediaUrl,
    senderId: input.senderId ?? "me",
    text: input.text,
  };
}
