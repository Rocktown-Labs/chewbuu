import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { cn } from "@chewbuu/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  ChatMessage,
  ChatPerson,
  DateRoomPhase,
  DateScenario,
} from "./chat-types";
import {
  VIDEO_EXCHANGE_LIMIT,
  countVideosBySender,
  derivePhaseFromMessages,
} from "./chat-types";
import {
  ChatComposer,
  ChatHeader,
  ChatThreadBody,
  DecisionCtaPanel,
  personInitials,
} from "./chat-ui";
import {
  createMediaMessage,
  createSystemMessage,
  createTextMessage,
} from "./demo-data";

export interface DateChatProps {
  allCandidates?: ChatPerson[];
  initialMessages: ChatMessage[];
  initialPhase?: DateRoomPhase;
  onBack?: () => void;
  onBlock?: (personId: string) => void;
  onContinue?: (personId: string) => void;
  onFriend?: (personId: string) => void;
  onPick?: (personId: string) => void;
  onSwitchCandidate?: (personId: string) => void;
  person: ChatPerson;
  role?: "sender" | "receiver";
  subtitle?: string;
}

export function applyDateDecision(
  messages: ChatMessage[],
  decision: "pick" | "friend" | "continue" | "block",
  personName: string
): { messages: ChatMessage[]; phase: DateRoomPhase } {
  if (decision === "pick") {
    return {
      messages: [
        ...messages,
        createSystemMessage(
          `You picked ${personName} for the date`,
          "calendar"
        ),
      ],
      phase: "picked",
    };
  }
  if (decision === "friend") {
    return {
      messages: [
        ...messages,
        createSystemMessage(
          `Added ${personName} as a friend — room moved to Chats`,
          "user"
        ),
      ],
      phase: "friended",
    };
  }
  if (decision === "continue") {
    return {
      messages: [
        ...messages,
        createSystemMessage(
          "Keep chatting unlocked — text, voice, and video are open",
          "branch"
        ),
      ],
      phase: "continued",
    };
  }
  return {
    messages: [
      ...messages,
      createSystemMessage(`You blocked ${personName}`, "block"),
    ],
    phase: "blocked",
  };
}

const EMPTY_CANDIDATES: ChatPerson[] = [];

export function DateChat({
  allCandidates = EMPTY_CANDIDATES,
  initialMessages,
  initialPhase,
  onBack,
  onBlock,
  onContinue,
  onFriend,
  onPick,
  onSwitchCandidate,
  person,
  role = "sender",
  subtitle,
}: DateChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [phase, setPhase] = useState<DateRoomPhase>(
    initialPhase ?? derivePhaseFromMessages(initialMessages)
  );

  useEffect(() => {
    setMessages(initialMessages);
    setPhase(initialPhase ?? derivePhaseFromMessages(initialMessages));
  }, [initialMessages, initialPhase, person.id]);

  const peopleById = useMemo(() => {
    const map: Record<string, ChatPerson> = { [person.id]: person };
    for (const candidate of allCandidates) map[candidate.id] = candidate;
    return map;
  }, [allCandidates, person]);

  const myVideos = countVideosBySender(messages, "me");
  const theirVideos = messages.filter(
    (message) =>
      message.senderId !== "me" &&
      (message.kind === "video" || message.kind === "intro_video")
  ).length;

  const showDecision = phase === "decision";

  const recomputePhase = (nextMessages: ChatMessage[]) => {
    if (
      phase === "picked" ||
      phase === "friended" ||
      phase === "blocked" ||
      phase === "continued"
    ) {
      return phase;
    }
    return derivePhaseFromMessages(nextMessages);
  };

  const appendMine = (message: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, message];
      setPhase(recomputePhase(next));
      return next;
    });
  };

  const handleSkipTheirReply = () => {
    if (theirVideos >= VIDEO_EXCHANGE_LIMIT) {
      toast.message("They already sent their 3 video replies.");
      return;
    }
    const reply = createMediaMessage({
      durationSec: 8 + Math.floor(Math.random() * 12),
      kind: "video",
      mediaUrl: person.introVideoThumb ?? person.avatar,
      senderId: person.id,
      text: "Video reply",
    });
    setMessages((prev) => {
      const next = [...prev, reply];
      setPhase(recomputePhase(next));
      return next;
    });
    toast.success(`${person.name.split(" ")[0]} sent a video reply`);
  };

  const handleDecision = (
    decision: "pick" | "friend" | "continue" | "block"
  ) => {
    const result = applyDateDecision(messages, decision, person.name);
    setMessages(result.messages);
    setPhase(result.phase);
    if (decision === "pick") {
      onPick?.(person.id);
      toast.success(`Picked ${person.name} for the date`);
    } else if (decision === "friend") {
      onFriend?.(person.id);
      toast.success(`${person.name} added as a friend`);
    } else if (decision === "continue") {
      onContinue?.(person.id);
      toast.success("Text and voice unlocked");
    } else {
      onBlock?.(person.id);
      toast.message(`${person.name} blocked`);
    }
  };

  const candidates = allCandidates.length > 0 ? allCandidates : [person];

  return (
    <div className="flex h-[min(720px,calc(100dvh-12rem))] min-h-[440px] w-full overflow-hidden bg-background md:min-h-[520px] md:flex-row flex-col">
      {candidates.length > 1 ? (
        <aside className="flex max-h-40 w-full shrink-0 flex-col border-b border-border/80 bg-card/40 md:max-h-none md:w-72 md:border-r md:border-b-0">
          <div className="flex items-center justify-between border-b border-border/80 px-3 py-3">
            <h3 className="font-bold text-sm">Date rooms</h3>
            <Badge className="rounded-full text-[10px]" variant="secondary">
              {candidates.length}
            </Badge>
          </div>
          <div className="flex gap-1 overflow-x-auto p-2 md:flex-1 md:flex-col md:overflow-y-auto">
            {candidates.map((candidate) => {
              const active = candidate.id === person.id;
              return (
                <button
                  className={cn(
                    "flex min-w-[12rem] items-center gap-2.5 rounded-xl border p-2.5 text-left transition md:min-w-0",
                    active
                      ? "border-primary/30 bg-primary/10"
                      : "border-transparent hover:bg-muted/40"
                  )}
                  key={candidate.id}
                  onClick={() => onSwitchCandidate?.(candidate.id)}
                  type="button"
                >
                  <Avatar className="size-9 border border-border">
                    <AvatarImage src={candidate.avatar} />
                    <AvatarFallback>
                      {personInitials(candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-xs">
                      {candidate.name}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {candidate.compatibility
                        ? `${candidate.compatibility}% match`
                        : candidate.note}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatThreadBody
          footer={
            <>
              {showDecision ? (
                <DecisionCtaPanel
                  onBlock={() => handleDecision("block")}
                  onContinue={() => handleDecision("continue")}
                  onFriend={() => handleDecision("friend")}
                  onPick={() => handleDecision("pick")}
                />
              ) : null}
              <ChatComposer
                dateMode
                onSendMedia={({
                  durationSec,
                  kind,
                  mediaUrl,
                  text,
                  thumbUrl,
                }) => {
                  appendMine(
                    createMediaMessage({
                      durationSec,
                      kind,
                      mediaThumb: thumbUrl,
                      mediaUrl,
                      text:
                        text ?? (kind === "video" ? "Video reply" : undefined),
                    })
                  );
                }}
                onSendText={(value) => appendMine(createTextMessage(value))}
                onSkipTheirReply={handleSkipTheirReply}
                phase={phase}
                threadId={person.id}
                videoProgress={{
                  limit: VIDEO_EXCHANGE_LIMIT,
                  mine: myVideos,
                  theirs: theirVideos,
                }}
              />
            </>
          }
          header={
            <ChatHeader
              onBack={onBack}
              people={[person]}
              subtitle={
                subtitle ??
                (role === "receiver"
                  ? "They requested this date"
                  : (person.note ?? `${person.compatibility ?? "—"}% match`))
              }
              title={person.name}
              trailing={
                person.compatibility ? (
                  <Badge className="rounded-full text-[10px]" variant="outline">
                    {person.compatibility}%
                  </Badge>
                ) : null
              }
            />
          }
          messages={messages}
          peopleById={peopleById}
        />
      </div>
    </div>
  );
}

export function DateChatFromScenario({
  onBack,
  onBlock,
  onContinue,
  onFriend,
  onPick,
  onSwitchCandidate,
  scenario,
  selectedMatchId,
}: {
  onBack?: () => void;
  onBlock?: (personId: string) => void;
  onContinue?: (personId: string) => void;
  onFriend?: (personId: string) => void;
  onPick?: (personId: string) => void;
  onSwitchCandidate?: (personId: string) => void;
  scenario: DateScenario;
  selectedMatchId?: string;
}) {
  const person =
    scenario.matches.find((match) => match.id === selectedMatchId) ??
    scenario.matches[0];

  if (!person) return null;

  return (
    <DateChat
      allCandidates={scenario.matches}
      initialMessages={scenario.roomMessages}
      initialPhase={scenario.phase}
      onBack={onBack}
      onBlock={onBlock}
      onContinue={onContinue}
      onFriend={onFriend}
      onPick={onPick}
      onSwitchCandidate={onSwitchCandidate}
      person={person}
      role={scenario.role}
      subtitle={`${scenario.title} · ${scenario.role === "receiver" ? "Incoming request" : "Your request"}`}
    />
  );
}
