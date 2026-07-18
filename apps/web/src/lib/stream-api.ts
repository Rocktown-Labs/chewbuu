import { apiFetch } from "@/lib/dating-api";
import type { DateMatch } from "@/lib/dating-api";

export interface StreamTokenResponse {
  apiKey: string;
  chatToken: string;
  feedToken: string;
  name: string;
  userId: string;
  videoToken: string;
}

export interface StreamMatchConversation {
  callId: string;
  callType: "default";
  channelCid: string;
  channelId: string;
  channelType: "messaging";
  match: DateMatch;
  matchedUserId: string;
  requesterId: string;
}

export interface StreamDemoFriendsResponse {
  channels: {
    cid: string;
    friendName: string;
    id: string;
  }[];
}

export const streamApi = {
  createDemoFriends: () =>
    apiFetch<StreamDemoFriendsResponse>("/stream/chats/demo-friends", {
      method: "POST",
    }),
  getMatchConversation: (matchId: string) =>
    apiFetch<StreamMatchConversation>(
      `/stream/matches/${matchId}/conversation`,
      { method: "POST" }
    ),
  getToken: () => apiFetch<StreamTokenResponse>("/stream/token"),
};
