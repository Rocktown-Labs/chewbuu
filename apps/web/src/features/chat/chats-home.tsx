import { api as blocksApi } from "@chewbuu/aws-blocks";
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
import { Heart, MessageCircle, Search, UserPlus } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { chatApi, toChatMessage, toChatThread } from "@/lib/chat-api";
import type { ApiChatMessage, ApiChatRoom } from "@/lib/chat-api";
import { useChatRealtime } from "@/lib/realtime-client";

import {
  createMediaMessage,
  createTextMessage,
} from "./chat-message-factories";
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
  personInitials,
} from "./chat-ui";

export function DashboardChats({
  activeChannelId,
  onGoToMatches,
  onOpenDate,
}: {
  activeChannelId?: string;
  onGoToMatches?: () => void;
  onOpenDate?: (dateId: string) => void;
}) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [tab, setTab] = useState<"friends" | "date_rooms">("friends");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    activeChannelId ?? null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [realtimeConfigured, setRealtimeConfigured] = useState(false);
  const [realtimeRoomIds, setRealtimeRoomIds] = useState<string[]>([]);
  const [realtimeChannels, setRealtimeChannels] = useState<
    ApiChatRoom["realtimeChannel"][]
  >([]);
  const [mobileShowThread, setMobileShowThread] = useState(
    Boolean(activeChannelId)
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteValue, setInviteValue] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const mountedRef = useRef(true);

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

  const loadRooms = useCallback(async () => {
    try {
      const initial = await chatApi.getRooms();
      if (!mountedRef.current) {
        return;
      }

      setLoadError(null);
      setCurrentUserId(initial.currentUserId);
      setRealtimeConfigured(true);
      setRealtimeRoomIds(initial.rooms.map((room) => room.id));
      setRealtimeChannels(initial.rooms.map((room) => room.realtimeChannel));
      setThreads(
        initial.rooms.map((room) => toChatThread(room, initial.currentUserId))
      );
      setSelectedId((current) => current ?? initial.rooms[0]?.id ?? null);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load your chats. Please try again."
      );
      setRealtimeRoomIds([]);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadRooms();
    return () => {
      mountedRef.current = false;
    };
  }, [loadRooms]);

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
    onData: handleRealtimeMessage,
  });

  const selectThread = (threadId: string) => {
    setSelectedId(threadId);
    setMobileShowThread(true);
  };

  const inviteFriend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = inviteValue.trim();
    if (!value) return;
    setIsInviting(true);
    try {
      await blocksApi.createFriendInvite(
        value.includes("@") ? { email: value } : { phone: value }
      );
      setInviteValue("");
      toast.success(
        "Friend invite saved. We will use it when invitations are sent."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save invite."
      );
    } finally {
      setIsInviting(false);
    }
  };

  const selectedPhase: DateRoomPhase = selected
    ? (selected.phase ??
      (selected.kind === "date_room"
        ? derivePhaseFromMessages(selected.messages)
        : "continued"))
    : "continued";
  const selectedMyVideos = selected
    ? countVideosBySender(selected.messages, "me")
    : 0;
  const selectedTheirVideos = selected
    ? selected.messages.filter(
        (message) =>
          message.senderId !== "me" &&
          (message.kind === "video" || message.kind === "intro_video")
      ).length
    : 0;

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

          {(["friends", "date_rooms"] as const).map((tabValue) => {
            const tabThreads =
              tabValue === "friends" ? friendThreads : dateThreads;
            const filteredThreads = tabThreads.filter(
              (thread) =>
                thread.title.toLowerCase().includes(query.toLowerCase()) ||
                thread.lastMessage.toLowerCase().includes(query.toLowerCase())
            );
            return (
              <TabsContent
                className="mt-0 min-h-0 flex-1 overflow-y-auto p-2"
                key={tabValue}
                value={tabValue}
              >
                {filteredThreads.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {filteredThreads.map((thread) => {
                      const active = thread.id === selected?.id;
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
                                  {thread.phase === "picked"
                                    ? "Chosen"
                                    : "Date"}
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
                ) : tabThreads.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                    <MessageCircle className="size-5 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">
                      {tabValue === "friends"
                        ? "No friend chats yet. Match with someone to start a conversation."
                        : "No date rooms yet. Send a date request to open a room."}
                    </p>
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No chats match “{query}”.
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col",
          mobileShowThread ? "flex" : "hidden md:flex"
        )}
      >
        {loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <MessageCircle className="size-7 text-destructive" />
            </div>
            <div>
              <h3 className="text-base font-bold">Couldn't load your chats</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {loadError}
              </p>
            </div>
            <Button
              className="mt-1 rounded-full"
              onClick={() => void loadRooms()}
              type="button"
              variant="outline"
            >
              Try again
            </Button>
          </div>
        ) : selected ? (
          <ChatThreadBody
            footer={
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
                phase={
                  selected.kind === "date_room" ? selectedPhase : "continued"
                }
                threadId={selected.id}
                videoProgress={
                  selected.kind === "date_room"
                    ? {
                        limit: VIDEO_EXCHANGE_LIMIT,
                        mine: selectedMyVideos,
                        theirs: selectedTheirVideos,
                      }
                    : undefined
                }
              />
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
                      toast.message(
                        "Open the date page to cancel with penalty."
                      )
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
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="size-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                Your conversations start here
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Match with someone, exchange intro videos, and get a private
                room to make real plans.
              </p>
            </div>
            {onGoToMatches ? (
              <Button
                className="mt-1 rounded-full"
                onClick={onGoToMatches}
                type="button"
              >
                <Heart data-icon="inline-start" />
                Browse matches
              </Button>
            ) : null}
            <form
              className="mt-2 flex w-full max-w-sm gap-2"
              onSubmit={inviteFriend}
            >
              <Input
                aria-label="Friend email or phone"
                className="rounded-full"
                onChange={(event) => setInviteValue(event.target.value)}
                placeholder="Friend email or phone"
                value={inviteValue}
              />
              <Button
                aria-label="Invite friend"
                className="shrink-0 rounded-full"
                disabled={isInviting || !inviteValue.trim()}
                size="icon"
                type="submit"
              >
                <UserPlus />
              </Button>
            </form>
            <p className="max-w-sm text-[11px] text-muted-foreground">
              Add a friend or invite someone to start a conversation outside of
              the date flow.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
