import { createRealtime } from "@upstash/realtime/client";
import type { ZodType } from "zod";

import type { ApiChatMessage } from "@/lib/chat-api";

type ChatTypingEvent = {
  isTyping: boolean;
  roomId: string;
  userId: string;
};

type ChatRealtimeEvents = {
  chat: {
    message: ZodType<ApiChatMessage>;
    typing: ZodType<ChatTypingEvent>;
  };
};

const realtime = createRealtime<ChatRealtimeEvents>();

export const useChatRealtime = <T>({
  channels,
  enabled = true,
  event,
  onData,
}: {
  channels: string[];
  enabled?: boolean;
  event: string;
  onData: (payload: { channel: string; data: T }) => void;
}) => {
  return realtime.useRealtime({
    channels,
    enabled,
    events: [event as "chat.message" | "chat.typing"],
    onData: (payload) => {
      onData({
        channel: payload.channel,
        data: payload.data as T,
      });
    },
  });
};
