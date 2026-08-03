import { ApiNamespaceClient } from "@aws-blocks/blocks/client";
import "@aws-blocks/bb-realtime/mock-middleware";

import type { AwsBlocksApi } from "./types";

export type {
  ApiChatMessage,
  ApiChatParticipant,
  ApiChatRoom,
  AwsBlocksApi,
  ChatMessageKind,
  ChatRoomsResponse,
  SendChatMessageInput,
  SendChatMessageResponse,
} from "./types";

export type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";

const apiUrl = (
  import.meta as ImportMeta & {
    env?: { VITE_BLOCKS_API_URL?: string };
  }
).env?.VITE_BLOCKS_API_URL;

export const api = ApiNamespaceClient<AwsBlocksApi>("api", {
  url: apiUrl,
});
