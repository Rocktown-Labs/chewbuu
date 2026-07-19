import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Input } from "@chewbuu/ui/components/input";
import {
  CalendarHeart,
  CheckCircle2,
  Clock3,
  Heart,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
  UserPlus,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import "stream-chat-react/css/index.css";
import {
  Channel,
  ChannelHeader,
  ChannelList,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  useChatContext,
  WithComponents,
  Window,
  useCreateChatClient,
} from "stream-chat-react";
import type { ChannelListItemUIProps } from "stream-chat-react";

import { streamApi } from "@/lib/stream-api";
import type { StreamTokenResponse } from "@/lib/stream-api";

const recapStories = [
  {
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
    label: "Avery",
  },
  {
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80",
    label: "Maya",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    label: "Jordan",
  },
  {
    image:
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=240&q=80",
    label: "Riley",
  },
] as const;

const dateRooms = [
  {
    age: 32,
    image:
      "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=640&q=80",
    meta: ["intro videos", "coffee", "karaoke"],
    name: "Maya",
    status: "Waiting on your first message",
    username: "@mayaellis",
  },
  {
    age: 35,
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=640&q=80",
    meta: ["friend option", "tacos", "walk"],
    name: "Jordan",
    status: "Review or decline",
    username: "@jordanp",
  },
] as const;

export function DashboardChats({
  activeChannelId,
}: {
  activeChannelId?: string;
}) {
  const [auth, setAuth] = useState<StreamTokenResponse | null>(null);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const token = await streamApi.getToken();
        if (active) {
          setAuth(token);
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Chat is unavailable right now."
          );
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="p-5">
        <Card className="rounded-2xl border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-base">Chats unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="p-5">
        <Card className="rounded-2xl border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-base">Opening chats</CardTitle>
            <CardDescription>
              Loading friend DMs and date-request match rooms.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <ChatsClient activeChannelId={activeChannelId} auth={auth} />;
}

function ChatsClient({
  activeChannelId,
  auth,
}: {
  activeChannelId?: string;
  auth: StreamTokenResponse;
}) {
  const [listVersion, setListVersion] = useState(0);
  const chatClient = useCreateChatClient({
    apiKey: auth.apiKey,
    tokenOrProvider: async () => {
      const token = await streamApi.getToken();
      return token.chatToken;
    },
    userData: {
      id: auth.userId,
      name: auth.name,
    },
  });

  if (!chatClient) {
    return (
      <div className="p-5">
        <Card className="rounded-2xl border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-base">Connecting chats</CardTitle>
            <CardDescription>
              Joining friend DMs and date-request match rooms.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filters = { members: { $in: [auth.userId] }, type: "messaging" };
  const options = { limit: 20, presence: true, state: true };
  const sort = { last_message_at: -1 as const };

  return (
    <Chat client={chatClient} theme="str-chat__theme-dark">
      <OpenChannelById channelId={activeChannelId} />
      <div className="grid min-h-[calc(100dvh-9rem)] overflow-hidden border-border/80 border-y md:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-border/80 border-r bg-background/70">
          <div className="space-y-4 border-border/80 border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-normal">
                  Inbox
                </p>
                <h2 className="text-xl font-semibold">Chats</h2>
              </div>
              <Badge className="rounded-full bg-primary/15 px-3 text-primary">
                2 new
              </Badge>
            </div>
            <label className="relative block">
              <span className="sr-only">Search chats</span>
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
              <Input
                className="h-10 rounded-full border-border/80 bg-card/55 pl-9 text-sm"
                placeholder="Search friends and date rooms"
                type="search"
              />
            </label>
          </div>

          <RecapStories />
          <DateRoomShelf onSeed={() => setListVersion((value) => value + 1)} />
          <DemoFriendButton
            onSeed={() => setListVersion((value) => value + 1)}
          />

          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="font-semibold text-sm">Friend DMs</p>
            <p className="text-muted-foreground text-xs">Always available</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            <WithComponents
              overrides={{ ChannelListItemUI: ChewbuuChannelListItem }}
            >
              <ChannelList
                EmptyStateIndicator={EmptyChatListState}
                filters={filters}
                key={listVersion}
                options={options}
                setActiveChannelOnMount
                sort={sort}
              />
            </WithComponents>
          </div>
        </aside>
        <section className="min-w-0 bg-background">
          <Channel EmptyPlaceholder={<EmptyChatState />}>
            <Window>
              <div className="border-border/80 border-b bg-background/95">
                <ChannelHeader />
              </div>
              <DateExchangeBanner />
              <div className="flex h-[calc(100dvh-18rem)] min-h-[430px] flex-col">
                <MessageList />
                <div className="border-border/80 border-t bg-background/95 p-3">
                  <MessageComposer
                    additionalTextareaProps={{
                      placeholder: "Message",
                    }}
                  />
                </div>
              </div>
            </Window>
            <Thread />
          </Channel>
        </section>
      </div>
    </Chat>
  );
}

function OpenChannelById({ channelId }: { channelId?: string }) {
  const { client, setActiveChannel } = useChatContext();

  useEffect(() => {
    if (!channelId) return;

    let active = true;

    const openChannel = async () => {
      try {
        const channel = client.channel("messaging", channelId);
        await channel.watch();
        if (active) {
          setActiveChannel(channel);
        }
      } catch (caughtError) {
        toast.error(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not open that chat."
        );
      }
    };

    void openChannel();

    return () => {
      active = false;
    };
  }, [channelId, client, setActiveChannel]);

  return null;
}

function RecapStories() {
  return (
    <div className="border-border/80 border-b px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-sm">Friend recaps</p>
        <Heart className="size-4 text-primary" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recapStories.map((story) => (
          <button
            className="group flex w-16 shrink-0 flex-col items-center gap-2 text-center"
            key={story.label}
            type="button"
          >
            <span className="rounded-full bg-primary/80 p-0.5">
              <Avatar className="size-14 border-2 border-background">
                <AvatarImage alt="" src={story.image} />
                <AvatarFallback>{story.label.slice(0, 1)}</AvatarFallback>
              </Avatar>
            </span>
            <span className="max-w-full truncate text-xs font-medium">
              {story.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DateRoomShelf({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="border-border/80 border-b px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Date exchanges</p>
          <p className="text-muted-foreground text-xs">
            Video-first rooms before a friend DM
          </p>
        </div>
        <CalendarHeart className="size-4 text-primary" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {dateRooms.map((room) => (
          <DateRoomCard key={room.username} onSeed={onSeed} room={room} />
        ))}
      </div>
    </div>
  );
}

function DateRoomCard({
  onSeed,
  room,
}: {
  onSeed: () => void;
  room: (typeof dateRooms)[number];
}) {
  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-card/55">
      <div
        className="aspect-[4/3] bg-cover bg-center"
        style={{ backgroundImage: `url(${room.image})` }}
      />
      <div className="space-y-3 p-3">
        <div>
          <div className="flex items-center gap-1">
            <p className="truncate font-semibold">
              {room.name} {room.age}
            </p>
            <CheckCircle2 className="size-4 shrink-0 text-primary" />
          </div>
          <p className="text-muted-foreground text-xs">{room.username}</p>
        </div>
        <p className="text-xs">{room.status}</p>
        <div className="flex flex-wrap gap-1.5">
          {room.meta.map((item) => (
            <Badge
              className="rounded-full bg-secondary/60 px-2 py-0.5 text-[0.68rem]"
              key={item}
              variant="secondary"
            >
              {item}
            </Badge>
          ))}
        </div>
        <SeedChatsButton
          label="Open exchange"
          onSeed={onSeed}
          size="sm"
          variant="secondary"
        />
      </div>
    </div>
  );
}

function DateExchangeBanner() {
  return (
    <div className="flex items-start gap-3 border-border/80 border-b bg-card/25 px-4 py-3">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Video className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm">
          DMs stay open. Dates have state.
        </p>
        <p className="text-muted-foreground text-xs">
          Match rooms begin with intro videos, then move toward choose, friend,
          or decline. Accepted people become friends you can message any time.
        </p>
      </div>
    </div>
  );
}

function ChewbuuChannelListItem(props: ChannelListItemUIProps) {
  const {
    active,
    displayImage,
    displayTitle,
    lastMessage,
    latestMessagePreview,
    muted,
    onSelect,
    pinned,
    unread,
  } = props;
  const { client } = useChatContext();
  const title = displayTitle ?? "Conversation";
  const initials = title
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const otherMember = Object.values(props.channel.state.members).find(
    (member) => member.user?.id !== client.userID
  );
  const isOnline = Boolean(otherMember?.user?.online);
  const timestamp = formatMessageTime(lastMessage?.created_at);

  return (
    <button
      aria-label={`Open chat with ${title}`}
      className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
        active ? "bg-primary/15" : "hover:bg-card/70"
      }`}
      onClick={onSelect}
      type="button"
    >
      <Avatar className="size-12">
        <AvatarImage alt="" src={displayImage ?? ""} />
        <AvatarFallback>{initials || "DM"}</AvatarFallback>
        {isOnline ? <AvatarBadge className="bg-emerald-500" /> : null}
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-sm">{title}</p>
          {timestamp ? (
            <span className="shrink-0 text-muted-foreground text-[0.68rem]">
              {timestamp}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
            {latestMessagePreview ?? "No messages yet"}
          </p>
          {pinned ? <Sparkles className="size-3 text-primary" /> : null}
          {muted ? <Clock3 className="size-3 text-muted-foreground" /> : null}
          {unread ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[0.68rem] text-primary-foreground">
              {unread}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function formatMessageTime(value?: Date | string) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function DemoFriendButton({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="border-border/80 border-b p-3">
      <SeedChatsButton label="Add test friends" onSeed={onSeed} />
    </div>
  );
}

function SeedChatsButton({
  label,
  onSeed,
  size,
  variant,
}: {
  label: string;
  onSeed: () => void;
  size?: "default" | "sm";
  variant?: "default" | "secondary";
}) {
  const { client, setActiveChannel } = useChatContext();
  const [isSeeding, setIsSeeding] = useState(false);

  const createDemoFriends = async () => {
    setIsSeeding(true);
    try {
      const result = await streamApi.createDemoFriends();
      const [firstChannel] = result.channels;

      if (firstChannel) {
        const channel = client.channel("messaging", firstChannel.id);
        await channel.watch();
        setActiveChannel(channel);
      }

      onSeed();
      toast.success("Friend chats are ready.");
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create friend chats."
      );
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button
      className="w-full rounded-full"
      disabled={isSeeding}
      onClick={createDemoFriends}
      size={size}
      type="button"
      variant={variant}
    >
      {isSeeding ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <UserPlus className="size-4" />
      )}
      {label}
    </Button>
  );
}

function EmptyChatState() {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="size-6" />
      </div>
      <p className="font-semibold">Pick a room</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Choose a friend DM, or open a match room from a date request.
      </p>
    </div>
  );
}

function EmptyChatListState() {
  return (
    <div className="px-4 py-8 text-sm text-muted-foreground">
      No chats yet. Add test friends or open a match from a date request.
    </div>
  );
}
