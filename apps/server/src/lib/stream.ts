import { env } from "@chewbuu/env/server";
import { StreamClient } from "@stream-io/node-sdk";
import { StreamChat } from "stream-chat";

import type { SessionUser } from "./auth-session";

export const toStreamId = (value: string) => {
  const normalized = value.toLowerCase().replaceAll(/[^a-z0-9_-]/g, "_");
  return normalized.slice(0, 64) || "chewbuu_user";
};

const getStreamConfig = () => {
  const apiKey =
    env.STREAM_API_KEY ??
    process.env.NEXT_PUBLIC_STREAM_API_KEY ??
    process.env.VITE_STREAM_API_KEY;
  const apiSecret = env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) {
    return null;
  }

  return { apiKey, apiSecret };
};

export const getStreamClients = () => {
  const config = getStreamConfig();

  if (!config) {
    return null;
  }

  return {
    apiKey: config.apiKey,
    chatClient: StreamChat.getInstance(config.apiKey, config.apiSecret),
    streamClient: new StreamClient(config.apiKey, config.apiSecret),
  };
};

export const upsertStreamUser = async (
  clients: NonNullable<ReturnType<typeof getStreamClients>>,
  user: Pick<SessionUser, "email" | "id" | "name">
) => {
  const streamUser = {
    id: toStreamId(user.id),
    name: user.name || user.email || "Chewbuu User",
  };

  await Promise.all([
    clients.chatClient.upsertUsers([streamUser]),
    clients.streamClient.upsertUsers([streamUser]),
  ]);

  return streamUser;
};

export const upsertSyntheticStreamUser = async (
  clients: NonNullable<ReturnType<typeof getStreamClients>>,
  user: { displayName: string; id: string; image?: null | string }
) => {
  const streamUser = {
    id: toStreamId(user.id),
    image: user.image ?? undefined,
    name: user.displayName,
  };

  await Promise.all([
    clients.chatClient.upsertUsers([streamUser]),
    clients.streamClient.upsertUsers([streamUser]),
  ]);

  return streamUser;
};
