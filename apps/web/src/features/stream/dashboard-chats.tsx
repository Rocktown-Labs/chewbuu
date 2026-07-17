import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { ArrowLeft, MessageCircle, Video } from "lucide-react";
import { useEffect, useState } from "react";
import type { Channel as StreamChannel } from "stream-chat";

import "stream-chat-react/css/index.css";
import {
  Channel,
  ChannelHeader,
  ChannelList,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
  useCreateChatClient,
} from "stream-chat-react";

import { streamApi } from "@/lib/stream-api";
import type { StreamTokenResponse } from "@/lib/stream-api";

export function DashboardChats() {
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
            <CardDescription>Connecting your secure rooms.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <ChatsClient auth={auth} />;
}

function ChatsClient({ auth }: { auth: StreamTokenResponse }) {
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
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(
    null
  );

  if (!chatClient) {
    return (
      <div className="p-5">
        <Card className="rounded-2xl border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-base">Connecting Stream</CardTitle>
            <CardDescription>Joining your chat rooms.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filters = { members: { $in: [auth.userId] }, type: "messaging" };
  const sort = { last_message_at: -1 as const };

  return (
    <Chat client={chatClient}>
      <div className="grid md:grid-cols-[300px_minmax(0,1fr)]">
        <div
          className={`${activeChannel ? "hidden md:block" : "block"} border-r border-border/80`}
        >
          <div className="flex items-start gap-2 border-b border-border/80 px-4 py-3">
            <Video className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Rooms appear after you open them from a match. Three video replies
              unlock text chat.
            </p>
          </div>
          <ChannelList
            filters={filters}
            onSelect={(channel) => setActiveChannel(channel)}
            setActiveChannelOnMount={false}
            sort={sort}
          />
        </div>
        <div className={activeChannel ? "block" : "hidden md:block"}>
          {activeChannel ? (
            <Channel channel={activeChannel}>
              <Window>
                <div className="flex items-center gap-1 border-b border-border/80 px-2 py-1 md:hidden">
                  <button
                    aria-label="Back to chats"
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setActiveChannel(null)}
                    type="button"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                </div>
                <ChannelHeader />
                <div className="flex h-[calc(100dvh-320px)] min-h-[380px] flex-col">
                  <MessageList />
                  <MessageComposer />
                </div>
              </Window>
              <Thread />
            </Channel>
          ) : (
            <div className="flex h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="size-6" />
              </div>
              <p className="font-semibold">Pick a room</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Choose a conversation on the left, or open a room from one of
                your matches first.
              </p>
            </div>
          )}
        </div>
      </div>
    </Chat>
  );
}
