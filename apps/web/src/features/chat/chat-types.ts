export type ChatMessageKind =
  | "text"
  | "video"
  | "voice"
  | "photo"
  | "system"
  | "intro_video";

export type DateRoomPhase =
  | "intros"
  | "exchange"
  | "decision"
  | "continued"
  | "picked"
  | "friended"
  | "blocked";

export type DateScenarioRole = "sender" | "receiver";

export type DateScenarioKind = "sent" | "received" | "friend";

export type ChatThreadKind = "friend" | "date_room";

export interface ChatPerson {
  avatar: string;
  compatibility?: number;
  id: string;
  introVideoThumb?: string;
  name: string;
  note?: string;
  tags?: string[];
  verified?: boolean;
}

export interface ChatMessage {
  createdAt: string;
  durationSec?: number;
  id: string;
  kind: ChatMessageKind;
  mediaThumb?: string;
  mediaUrl?: string;
  reaction?: string;
  senderId: "me" | string;
  systemIcon?: "branch" | "check" | "heart" | "user" | "block" | "calendar";
  text?: string;
}

export interface ActiveDateContext {
  dateId: string;
  places: { address: string; name: string; placeId: string }[];
  role: DateScenarioRole;
  scheduledAt: string;
  searchArea: string;
  status: "confirmed" | "pending_confirm" | "matching" | "live";
  title: string;
}

export interface ChatThread {
  activeDate?: ActiveDateContext;
  id: string;
  kind: ChatThreadKind;
  lastMessage: string;
  messages: ChatMessage[];
  participants: ChatPerson[];
  phase?: DateRoomPhase;
  time: string;
  title: string;
  unreadCount?: number;
}

export interface DateScenario {
  acceptedMatchId?: string;
  id: string;
  kind: DateScenarioKind;
  matches: ChatPerson[];
  myVideoCount: number;
  theirVideoCount: number;
  phase: DateRoomPhase;
  places: {
    address: string;
    name: string;
    placeId: string;
    rating?: string;
  }[];
  role: DateScenarioRole;
  roomMessages: ChatMessage[];
  scheduledAt: string;
  searchArea: string;
  status: string;
  theirName: string;
  title: string;
  what: string[];
}

export const VIDEO_EXCHANGE_LIMIT = 3;

export function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function countVideosBySender(
  messages: ChatMessage[],
  senderId: "me" | string
): number {
  return messages.filter(
    (message) =>
      message.senderId === senderId &&
      (message.kind === "video" || message.kind === "intro_video")
  ).length;
}

export function derivePhaseFromMessages(
  messages: ChatMessage[],
  myId: "me" | string = "me"
): DateRoomPhase {
  const decision = messages.find(
    (message) =>
      message.kind === "system" &&
      (message.text?.includes("picked") ||
        message.text?.includes("friend") ||
        message.text?.includes("blocked") ||
        message.text?.includes("Keep chatting"))
  );
  if (decision?.text?.toLowerCase().includes("block")) return "blocked";
  if (decision?.text?.toLowerCase().includes("picked")) return "picked";
  if (decision?.text?.toLowerCase().includes("friend")) return "friended";
  if (decision?.text?.toLowerCase().includes("keep chatting"))
    return "continued";

  const myVideos = countVideosBySender(messages, myId);
  const theirVideos = messages.filter(
    (message) =>
      message.senderId !== myId &&
      (message.kind === "video" || message.kind === "intro_video")
  ).length;

  if (myVideos >= VIDEO_EXCHANGE_LIMIT && theirVideos >= VIDEO_EXCHANGE_LIMIT) {
    return "decision";
  }
  if (myVideos > 0 || theirVideos > 0) return "exchange";
  return "intros";
}

export function canSendTextOrVoice(phase: DateRoomPhase): boolean {
  return (
    phase === "continued" ||
    phase === "picked" ||
    phase === "friended" ||
    phase === "decision"
  );
}

export function isDateRoomLockedToVideo(phase: DateRoomPhase): boolean {
  return phase === "intros" || phase === "exchange";
}
