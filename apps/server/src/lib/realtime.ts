import { env } from "@chewbuu/env/server";
import { Realtime } from "@upstash/realtime";
import { Redis } from "@upstash/redis";
import { z } from "zod";

export const chatRealtimeSchema = {
  chat: {
    message: z.object({
      createdAt: z.string(),
      durationSec: z.number().optional(),
      id: z.string(),
      kind: z.enum(["photo", "system", "text", "video", "voice"]),
      mediaThumbUrl: z.string().optional(),
      mediaUrl: z.string().optional(),
      roomId: z.string(),
      senderId: z.string(),
      systemIcon: z.string().optional(),
      text: z.string().optional(),
    }),
    typing: z.object({
      isTyping: z.boolean(),
      roomId: z.string(),
      userId: z.string(),
    }),
  },
};

export type ChatRealtimeEvent =
  | {
      channel: string;
      data: {
        createdAt: string;
        durationSec?: number;
        id: string;
        kind: "photo" | "system" | "text" | "video" | "voice";
        mediaThumbUrl?: string;
        mediaUrl?: string;
        roomId: string;
        senderId: string;
        systemIcon?: string;
        text?: string;
      };
      event: "chat.message";
    }
  | {
      channel: string;
      data: {
        isTyping: boolean;
        roomId: string;
        userId: string;
      };
      event: "chat.typing";
    };

const HISTORY_LIMIT = 1000;

let redis: Redis | null | undefined;

const getRedis = () => {
  if (redis !== undefined) {
    return redis;
  }

  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;

  if (!(url && token)) {
    redis = null;
    return redis;
  }

  redis = new Redis({
    token,
    url,
  });
  return redis;
};

export const isRealtimeConfigured = () => getRedis() !== null;

export const chatChannel = (roomId: string) => `chat:${roomId}`;

export const realtime = new Realtime({
  history: {
    maxLength: HISTORY_LIMIT,
  },
  redis: getRedis() ?? undefined,
  schema: chatRealtimeSchema,
});

export const emitRealtimeEvent = async (event: ChatRealtimeEvent) => {
  if (!isRealtimeConfigured()) {
    return { delivered: false };
  }

  await realtime.channel(event.channel).emit(event.event, event.data);

  return { delivered: true };
};
