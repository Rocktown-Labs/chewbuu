import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import { Input } from "@chewbuu/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@chewbuu/ui/components/tabs";
import { cn } from "@chewbuu/ui/lib/utils";
import { Heart, MessageCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { chatApi, toChatMessage, toChatThread } from "@/lib/chat-api";
import type { ApiChatMessage } from "@/lib/chat-api";
import { useChatRealtime } from "@/lib/realtime-client";

import type {
  ChatMessage,
  ChatPerson,
  ChatThread,
  DateRoomPhase,
} from "./chat-types";
import {
  VIDEO_EXCHANGE_LIMIT,
  countVideosBySender,
  derivePhaseFromMessages,
} from "./chat-types";
import {
  ActiveDateBanner,
  ChatComposer,
  ChatHeader,
  ChatThreadBody,
  DecisionCtaPanel,
  personInitials,
} from "./chat-ui";
import { applyDateDecision } from "./date-chat";
import {
  buildInitialThreads,
  createMediaMessage,
  createTextMessage,
} from "./demo-data";

export function DashboardChats({
  activeChannelId,
  onOpenDate,
}: {
  activeChannelId?: string;
  onOpenDate?: (dateId: string) => void;
}) {
  const [threads, setThreads] = useState<ChatThread[]>(() =>
    buildInitialThreads()
  );
  const [tab, setTab] = useState<"friends" | "date_rooms">("friends");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    activeChannelId ?? null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [realtimeConfigured, setRealtimeConfigured] = useState(false);
  const [realtimeRoomIds, setRealtimeRoomIds] = useState<string[]>([]);
  const [mobileShowThread, setMobileShowThread] = useState(
    Boolean(activeChannelId)
  );

  const visibleThreads = threads.filter(
    (thread) => !thread.archived || thread.id === selectedId
  );
  const friendThreads = visibleThreads.filter(
    (thread) => thread.kind === "friend"
  );
  const dateThreads = visibleThreads.filter(
    (thread) => thread.kind === "date_room"
  );
  const activeList = tab === "friends" ? friendThreads : dateThreads;
  const realtimeChannels = useMemo(
    () => realtimeRoomIds.map((roomId) => `chat:${roomId}`),
    [realtimeRoomIds]
  );

  const selected =
    threads.find((thread) => thread.id === selectedId) ??
    activeList[0] ??
    threads[0];

  useEffect(() => {
    if (!selectedId) return;
    const activeThread = threads.find((thread) => thread.id === selectedId);
    if (activeThread) {
      setTab(activeThread.kind === "friend" ? "friends" : "date_rooms");
    }
  }, [selectedId, threads]);

  const peopleById = useMemo(() => {
    const map: Record<string, ChatPerson> = {};
    for (const thread of threads) {
      for (const person of thread.participants) map[person.id] = person;
    }
    return map;
  }, [threads]);

  const updateThread = (
    threadId: string,
    updater: (thread: ChatThread) => ChatThread
  ) => {
    setThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? updater(thread) : thread))
    );
  };

  const appendMessage = useCallback(
    (threadId: string, message: ChatMessage) => {
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) return thread;
          if (thread.messages.some((item) => item.id === message.id)) {
            return thread;
          }

          const messages = [...thread.messages, message];
          const phase =
            thread.kind === "date_room"
              ? thread.phase === "continued" ||
                thread.phase === "picked" ||
                thread.phase === "friended" ||
                thread.phase === "blocked"
                ? thread.phase
                : derivePhaseFromMessages(messages)
              : thread.phase;
          return {
            ...thread,
            lastMessage:
              message.kind === "text"
                ? (message.text ?? "")
                : message.kind === "video" || message.kind === "intro_video"
                  ? "Video"
                  : message.kind === "voice"
                    ? "Voice note"
                    : message.kind === "photo"
                      ? "Photo"
                      : (message.text ?? thread.lastMessage),
            messages,
            phase,
            time: "Now",
          };
        })
      );
    },
    []
  );

  useEffect(() => {
    let active = true;

    const loadRooms = async () => {
      try {
        const initial = await chatApi.getRooms();
        const response =
          initial.rooms.length > 0
            ? initial
            : await chatApi.bootstrapDemoFriends();

        if (!active || response.rooms.length === 0) {
          return;
        }

        setCurrentUserId(response.currentUserId);
        setRealtimeConfigured(response.realtimeConfigured);
        setRealtimeRoomIds(response.rooms.map((room) => room.id));
        setThreads(
          response.rooms.map((room) =>
            toChatThread(room, response.currentUserId)
          )
        );
        setSelectedId((current) => current ?? response.rooms[0]?.id ?? null);
      } catch {
        if (active) {
          setRealtimeRoomIds([]);
        }
      }
    };

    void loadRooms();

    return () => {
      active = false;
    };
  }, []);

  const handleRealtimeMessage = useCallback(
    ({ data }: { channel: string; data: ApiChatMessage }) => {
      if (!currentUserId) return;
      appendMessage(data.roomId, toChatMessage(data, currentUserId));
    },
    [appendMessage, currentUserId]
  );

  useChatRealtime<ApiChatMessage>({
    channels: realtimeChannels,
    enabled: Boolean(
      realtimeConfigured && currentUserId && realtimeRoomIds.length > 0
    ),
    event: "chat.message",
    onData: handleRealtimeMessage,
  });

  const handleDecision = (
    thread: ChatThread,
    decision: "pick" | "friend" | "continue" | "block"
  ) => {
    const [person] = thread.participants;
    if (!person) return;
    const result = applyDateDecision(thread.messages, decision, person.name);

    if (decision === "friend") {
      setThreads((prev) =>
        prev.map((item) => {
          if (item.id !== thread.id) return item;
          return {
            ...item,
            kind: "friend" as const,
            lastMessage: result.messages.at(-1)?.text ?? item.lastMessage,
            messages: result.messages,
            phase: "friended" as DateRoomPhase,
            time: "Now",
          };
        })
      );
      setTab("friends");
      toast.success(`${person.name} moved to Friends`);
      return;
    }

    if (decision === "pick") {
      const activeDateId = thread.activeDate?.dateId;
      setThreads((prev) =>
        prev.map((item) => {
          if (item.id === thread.id) {
            return {
              ...item,
              activeDate: item.activeDate
                ? { ...item.activeDate, status: "pending_confirm" }
                : item.activeDate,
              lastMessage: result.messages.at(-1)?.text ?? item.lastMessage,
              messages: result.messages,
              phase: result.phase,
              time: "Now",
            };
          }
          if (
            activeDateId &&
            item.kind === "date_room" &&
            item.activeDate?.dateId === activeDateId
          ) {
            return {
              ...item,
              archived: true,
              lastMessage: "Archived after another choice was confirmed.",
              phase: "blocked" as DateRoomPhase,
              unreadCount: 0,
            };
          }
          return item;
        })
      );
      toast.success(`Picked ${person.name} — open the date page to confirm`);
      if (thread.activeDate && onOpenDate) onOpenDate(thread.activeDate.dateId);
      return;
    }

    updateThread(thread.id, (item) => ({
      ...item,
      lastMessage: result.messages.at(-1)?.text ?? item.lastMessage,
      messages: result.messages,
      phase: result.phase,
      time: "Now",
    }));

    if (decision === "continue") {
      toast.success("Text and voice unlocked");
    } else {
      toast.message(`${person.name} blocked`);
    }
  };

  const selectThread = (threadId: string) => {
    setSelectedId(threadId);
    setMobileShowThread(true);
  };

  if (!selected) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] items-center justify-center p-8 text-sm text-muted-foreground">
        No chats yet.
      </div>
    );
  }

  const phase: DateRoomPhase =
    selected.phase ??
    (selected.kind === "date_room"
      ? derivePhaseFromMessages(selected.messages)
      : "continued");
  const myVideos = countVideosBySender(selected.messages, "me");
  const theirVideos = selected.messages.filter(
    (message) =>
      message.senderId !== "me" &&
      (message.kind === "video" || message.kind === "intro_video")
  ).length;

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[520px] w-full overflow-hidden bg-background">
      <aside
        className={cn(
          "w-full shrink-0 flex-col border-r border-border/80 bg-card/20 md:flex md:w-80",
          mobileShowThread ? "hidden md:flex" : "flex"
        )}
      >
        <div className="border-b border-border/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-lg tracking-tight">Chats</h2>
            <Badge className="rounded-full text-[10px]" variant="secondary">
              {dateThreads.reduce(
                (sum, thread) => sum + (thread.unreadCount ?? 0),
                0
              )}{" "}
              open rooms
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Friend DMs and date rooms. Video-first matching, then real plans.
          </p>
          <div className="relative mt-3">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 rounded-full border-border/70 bg-background/80 pl-9 text-xs"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              value={query}
            />
          </div>
        </div>

        <Tabs
          className="flex min-h-0 flex-1 flex-col"
          onValueChange={(value) =>
            setTab(value === "friends" ? "friends" : "date_rooms")
          }
          value={tab}
        >
          <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2 rounded-full">
            <TabsTrigger className="rounded-full text-xs" value="friends">
              <MessageCircle data-icon="inline-start" />
              Friends
            </TabsTrigger>
            <TabsTrigger className="rounded-full text-xs" value="date_rooms">
              <Heart data-icon="inline-start" />
              Date rooms
            </TabsTrigger>
          </TabsList>

          {(["friends", "date_rooms"] as const).map((tabValue) => (
            <TabsContent
              className="mt-0 min-h-0 flex-1 overflow-y-auto p-2"
              key={tabValue}
              value={tabValue}
            >
              <div className="flex flex-col gap-0.5">
                {(tabValue === "friends" ? friendThreads : dateThreads)
                  .filter(
                    (thread) =>
                      thread.title
                        .toLowerCase()
                        .includes(query.toLowerCase()) ||
                      thread.lastMessage
                        .toLowerCase()
                        .includes(query.toLowerCase())
                  )
                  .map((thread) => {
                    const active = thread.id === selected.id;
                    const [person] = thread.participants;
                    return (
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl p-3 text-left transition",
                          active
                            ? "bg-muted/50"
                            : "hover:bg-muted/25 text-muted-foreground"
                        )}
                        key={thread.id}
                        onClick={() => selectThread(thread.id)}
                        type="button"
                      >
                        {thread.participants.length > 1 ? (
                          <div className="flex -space-x-2">
                            {thread.participants.slice(0, 2).map((p) => (
                              <Avatar
                                className="size-10 border-2 border-background"
                                key={p.id}
                              >
                                <AvatarImage src={p.avatar} />
                                <AvatarFallback>
                                  {personInitials(p.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        ) : (
                          <Avatar className="size-11 border border-border/60">
                            {person?.avatar ? (
                              <AvatarImage src={person.avatar} />
                            ) : null}
                            <AvatarFallback>
                              {personInitials(thread.title)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-bold text-xs text-foreground">
                              {thread.title}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {thread.time}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5">
                            {thread.kind === "date_room" ? (
                              <Badge
                                className={cn(
                                  "rounded-full px-1.5 py-0 text-[9px]",
                                  thread.phase === "picked" &&
                                    "border-primary/40 bg-primary/10 text-primary"
                                )}
                                variant={
                                  thread.phase === "picked"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {thread.phase === "picked" ? "Chosen" : "Date"}
                              </Badge>
                            ) : null}
                            <span className="truncate text-[11px] text-muted-foreground">
                              {thread.lastMessage}
                            </span>
                          </span>
                        </span>
                        {thread.unreadCount ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col",
          mobileShowThread ? "flex" : "hidden md:flex"
        )}
      >
        <ChatThreadBody
          footer={
            <>
              {selected.kind === "date_room" && phase === "decision" ? (
                <DecisionCtaPanel
                  onBlock={() => handleDecision(selected, "block")}
                  onContinue={() => handleDecision(selected, "continue")}
                  onFriend={() => handleDecision(selected, "friend")}
                  onPick={() => handleDecision(selected, "pick")}
                />
              ) : null}
              <ChatComposer
                dateMode={selected.kind === "date_room"}
                onSendMedia={async ({
                  durationSec,
                  kind,
                  mediaUrl,
                  text,
                  thumbUrl,
                }) => {
                  if (currentUserId && realtimeRoomIds.includes(selected.id)) {
                    try {
                      const response = await chatApi.sendMessage(selected.id, {
                        durationSec,
                        kind,
                        mediaThumbUrl: thumbUrl,
                        mediaUrl,
                        text,
                      });
                      appendMessage(
                        selected.id,
                        toChatMessage(response.message, currentUserId)
                      );
                      return;
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not send media."
                      );
                    }
                  }

                  appendMessage(
                    selected.id,
                    createMediaMessage({
                      durationSec,
                      kind,
                      mediaThumb: thumbUrl,
                      mediaUrl,
                      text,
                    })
                  );
                }}
                onSendText={async (text) => {
                  if (currentUserId && realtimeRoomIds.includes(selected.id)) {
                    try {
                      const response = await chatApi.sendMessage(selected.id, {
                        kind: "text",
                        text,
                      });
                      appendMessage(
                        selected.id,
                        toChatMessage(response.message, currentUserId)
                      );
                      return;
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not send message."
                      );
                    }
                  }

                  appendMessage(selected.id, createTextMessage(text));
                }}
                onSkipTheirReply={
                  selected.kind === "date_room"
                    ? () => {
                        const [person] = selected.participants;
                        if (!person) return;
                        if (theirVideos >= VIDEO_EXCHANGE_LIMIT) {
                          toast.message("They already sent 3 replies.");
                          return;
                        }
                        appendMessage(
                          selected.id,
                          createMediaMessage({
                            durationSec: 10,
                            kind: "video",
                            mediaUrl: person.introVideoThumb ?? person.avatar,
                            senderId: person.id,
                          })
                        );
                        toast.success(
                          `${person.name.split(" ")[0]} sent a video reply`
                        );
                      }
                    : undefined
                }
                phase={selected.kind === "date_room" ? phase : "continued"}
                threadId={selected.id}
                videoProgress={
                  selected.kind === "date_room"
                    ? {
                        limit: VIDEO_EXCHANGE_LIMIT,
                        mine: myVideos,
                        theirs: theirVideos,
                      }
                    : undefined
                }
              />
            </>
          }
          header={
            <>
              <ChatHeader
                onBack={() => setMobileShowThread(false)}
                people={selected.participants}
                subtitle={
                  selected.kind === "date_room"
                    ? selected.activeDate
                      ? `${selected.activeDate.title} · ${selected.activeDate.status}`
                      : "Date room"
                    : "Friend"
                }
                title={selected.title}
                trailing={
                  selected.activeDate && onOpenDate ? (
                    <Button
                      className="hidden rounded-full text-[11px] sm:inline-flex"
                      onClick={() => {
                        const dateId = selected.activeDate?.dateId;
                        if (dateId) onOpenDate(dateId);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Date page
                    </Button>
                  ) : null
                }
              />
              {selected.activeDate ? (
                <ActiveDateBanner
                  activeDate={selected.activeDate}
                  onCancel={() =>
                    toast.message("Open the date page to cancel with penalty.")
                  }
                  onOpenDate={() => {
                    if (selected.activeDate && onOpenDate) {
                      onOpenDate(selected.activeDate.dateId);
                    }
                  }}
                  onReschedule={() =>
                    toast.message(
                      "Open the date page to reschedule with a token."
                    )
                  }
                  onShowQr={() => {
                    if (selected.activeDate && onOpenDate) {
                      onOpenDate(selected.activeDate.dateId);
                    }
                  }}
                />
              ) : null}
            </>
          }
          messages={selected.messages}
          peopleById={peopleById}
        />
      </section>
    </div>
  );
}
