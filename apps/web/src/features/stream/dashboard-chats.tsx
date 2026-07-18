import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Loader2, MessageCircle, UserPlus, Video } from "lucide-react";
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
  Window,
  useCreateChatClient,
} from "stream-chat-react";

import { streamApi } from "@/lib/stream-api";
import type { StreamTokenResponse } from "@/lib/stream-api";

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
    <Chat client={chatClient}>
      <OpenChannelById channelId={activeChannelId} />
      <div className="grid min-h-[620px] md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-r border-border/80">
          <div className="flex items-start gap-2 border-b border-border/80 px-4 py-3">
            <Video className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Friend DMs are always available. Date-request rooms start with two
              intro videos and wait for your first message before you choose,
              friend, or decline.
            </p>
          </div>
          <DemoFriendButton
            onSeed={() => setListVersion((value) => value + 1)}
          />
          <ChannelList
            EmptyStateIndicator={EmptyChatListState}
            filters={filters}
            key={listVersion}
            options={options}
            setActiveChannelOnMount
            sort={sort}
          />
        </div>
        <div className="min-w-0">
          <Channel EmptyPlaceholder={<EmptyChatState />}>
            <Window>
              <ChannelHeader />
              <div className="flex h-[calc(100dvh-300px)] min-h-[430px] flex-col">
                <MessageList />
                <MessageComposer />
              </div>
            </Window>
            <Thread />
          </Channel>
        </div>
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

function DemoFriendButton({ onSeed }: { onSeed: () => void }) {
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
    <div className="border-b border-border/80 p-3">
      <Button
        className="w-full rounded-full"
        disabled={isSeeding}
        onClick={createDemoFriends}
        type="button"
      >
        {isSeeding ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        Add test friends
      </Button>
    </div>
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
