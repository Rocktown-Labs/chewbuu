import { describe, expect, it } from "vitest";

import {
  VIDEO_EXCHANGE_LIMIT,
  countVideosBySender,
  derivePhaseFromMessages,
  type ChatMessage,
} from "./chat-types";
import { applyDateDecision } from "./date-chat";
import { createMediaMessage, createTextMessage } from "./demo-data";

function video(senderId: "me" | string, id: string): ChatMessage {
  return createMediaMessage({
    durationSec: 5,
    kind: "video",
    mediaUrl: "blob:test",
    senderId,
    text: id,
  });
}

describe("date chat rules", () => {
  it("counts only video messages per sender", () => {
    const messages = [
      video("me", "1"),
      createTextMessage("hi"),
      video("person-a", "2"),
      video("me", "3"),
    ];
    expect(countVideosBySender(messages, "me")).toBe(2);
    expect(countVideosBySender(messages, "person-a")).toBe(1);
  });

  it("stays in exchange until both sides hit the limit", () => {
    const messages = [
      video("me", "1"),
      video("them", "2"),
      video("me", "3"),
      video("them", "4"),
    ];
    expect(derivePhaseFromMessages(messages)).toBe("exchange");
  });

  it("opens decision after three videos each", () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < VIDEO_EXCHANGE_LIMIT; i += 1) {
      messages.push(video("me", `me-${i}`), video("them", `them-${i}`));
    }
    expect(derivePhaseFromMessages(messages)).toBe("decision");
  });

  it("applies pick / friend / continue / block decisions", () => {
    const base: ChatMessage[] = [];
    expect(applyDateDecision(base, "pick", "Maya").phase).toBe("picked");
    expect(applyDateDecision(base, "friend", "Maya").phase).toBe("friended");
    expect(applyDateDecision(base, "continue", "Maya").phase).toBe("continued");
    expect(applyDateDecision(base, "block", "Maya").phase).toBe("blocked");
  });
});
