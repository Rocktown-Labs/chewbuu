import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import {
  StreamFeeds,
  useCreateFeedsClient,
  useFeedsClient,
} from "@stream-io/feeds-react-sdk";
import {
  CallControls,
  SpeakerLayout,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useStreamVideoClient,
} from "@stream-io/video-react-sdk";
import {
  CheckCircle2,
  MessageCircle,
  Phone,
  Send,
  UserCheck,
  UserMinus,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Channel as StreamChannel } from "stream-chat";

import "stream-chat-react/css/index.css";
import {
  Channel,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
  useChatContext,
  useCreateChatClient,
} from "stream-chat-react";

import { streamApi } from "@/lib/stream-api";
import type {
  StreamMatchConversation,
  StreamTokenResponse,
} from "@/lib/stream-api";

const videoSteps = [
  "Send video reply 1",
  "Send video reply 2",
  "Send video reply 3",
] as const;

export function StreamMatchRoom({ matchId }: { matchId: string }) {
  const [auth, setAuth] = useState<StreamTokenResponse | null>(null);
  const [conversation, setConversation] =
    useState<StreamMatchConversation | null>(null);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    let active = true;

    const loadRoom = async () => {
      try {
        const [tokenResponse, conversationResponse] = await Promise.all([
          streamApi.getToken(),
          streamApi.getMatchConversation(matchId),
        ]);

        if (!active) {
          return;
        }

        setAuth(tokenResponse);
        setConversation(conversationResponse);
      } catch (caughtError) {
        if (!active) {
          return;
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to open this match room."
        );
      }
    };

    void loadRoom();

    return () => {
      active = false;
    };
  }, [matchId]);

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Match room unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!auth || !conversation) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Opening match room</CardTitle>
            <CardDescription>
              Creating the chat, video, and recap spaces for this match.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return <StreamMatchProviders auth={auth} conversation={conversation} />;
}

function StreamMatchProviders({
  auth,
  conversation,
}: {
  auth: StreamTokenResponse;
  conversation: StreamMatchConversation;
}) {
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
  const feedsClient = useCreateFeedsClient({
    apiKey: auth.apiKey,
    tokenOrProvider: async () => {
      const token = await streamApi.getToken();
      return token.feedToken;
    },
    userData: {
      id: auth.userId,
      name: auth.name,
    },
  });
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(
    null
  );

  useEffect(() => {
    const nextClient = new StreamVideoClient({
      apiKey: auth.apiKey,
      tokenProvider: async () => {
        const token = await streamApi.getToken();
        return token.videoToken;
      },
      user: {
        id: auth.userId,
        name: auth.name,
      },
    });

    setVideoClient(nextClient);

    return () => {
      setVideoClient(null);
      void nextClient.disconnectUser();
    };
  }, [auth.apiKey, auth.name, auth.userId]);

  if (!chatClient || !feedsClient || !videoClient) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Connecting Stream</CardTitle>
            <CardDescription>
              Joining realtime chat, video, and recaps.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <Chat client={chatClient}>
      <StreamVideo client={videoClient}>
        <StreamFeeds client={feedsClient}>
          <MatchRoomShell auth={auth} conversation={conversation} />
        </StreamFeeds>
      </StreamVideo>
    </Chat>
  );
}

function MatchRoomShell({
  auth,
  conversation,
}: {
  auth: StreamTokenResponse;
  conversation: StreamMatchConversation;
}) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Badge className="w-fit" variant="secondary">
            {conversation.match.compatibility}% match
          </Badge>
          <h1 className="text-2xl font-semibold">
            {conversation.match.displayName}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Intro videos are exchanged first. Move through three short video
            replies, then decide whether to continue, book, friend, or decline.
          </p>
        </div>
        <Badge variant="outline">{conversation.match.status}</Badge>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-[620px] flex-col gap-4">
          <VideoExchangePanel conversation={conversation} />
          <MatchChat conversation={conversation} />
        </div>
        <aside className="flex flex-col gap-4">
          <VideoCallPanel conversation={conversation} />
          <RecapFeedPanel conversation={conversation} />
        </aside>
      </section>
    </main>
  );
}

function VideoExchangePanel({
  conversation,
}: {
  conversation: StreamMatchConversation;
}) {
  const { client } = useChatContext();
  const [isSending, setIsSending] = useState(false);

  const sendStageMessage = async (step: number, label: string) => {
    setIsSending(true);
    try {
      const channel = client.channel(
        conversation.channelType,
        conversation.channelId
      );
      await channel.sendMessage({
        chewbuuStage: `video_${step}`,
        text: `${label}. Attach or record the clip in this room so the next response unlocks in order.`,
      } as never);
      toast.success(`${label} queued in the room.`);
    } catch {
      toast.error("Could not send the video step.");
    } finally {
      setIsSending(false);
    }
  };

  const sendDecision = async (decision: string) => {
    setIsSending(true);
    try {
      const channel = client.channel(
        conversation.channelType,
        conversation.channelId
      );
      await channel.sendMessage({
        chewbuuDecision: decision,
        text: decision,
      } as never);
      toast.success(decision);
    } catch {
      toast.error("Could not send that decision.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video exchange</CardTitle>
        <CardDescription>
          Intro to intro, then three video replies before text and voice become
          the main flow.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-sm border border-border bg-muted/30 p-3">
            <CheckCircle2 className="mb-2 size-4 text-primary" />
            <p className="text-sm font-medium">Intros exchanged</p>
            <p className="text-xs text-muted-foreground">
              Both profile videos are available in the room context.
            </p>
          </div>
          {videoSteps.map((label, index) => (
            <Button
              disabled={isSending}
              key={label}
              onClick={() => sendStageMessage(index + 1, label)}
              type="button"
              variant="outline"
            >
              <Video data-icon="inline-start" />
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isSending}
            onClick={() => sendDecision("Continue: unlock text and voice")}
            type="button"
          >
            <MessageCircle data-icon="inline-start" />
            Continue
          </Button>
          <Button
            disabled={isSending}
            onClick={() => sendDecision("Book this date")}
            type="button"
            variant="outline"
          >
            <Send data-icon="inline-start" />
            Book
          </Button>
          <Button
            disabled={isSending}
            onClick={() => sendDecision("Add to circle")}
            type="button"
            variant="outline"
          >
            <UserCheck data-icon="inline-start" />
            Friend
          </Button>
          <Button
            disabled={isSending}
            onClick={() => sendDecision("Decline this match")}
            type="button"
            variant="outline"
          >
            <UserMinus data-icon="inline-start" />
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchChat({
  conversation,
}: {
  conversation: StreamMatchConversation;
}) {
  const { client } = useChatContext();
  const [channel, setChannel] = useState<StreamChannel | null>(null);

  useEffect(() => {
    let active = true;
    const nextChannel = client.channel(
      conversation.channelType,
      conversation.channelId
    );

    const watchChannel = async () => {
      await nextChannel.watch();
      if (active) {
        setChannel(nextChannel);
      }
    };

    void watchChannel();

    return () => {
      active = false;
      setChannel(null);
      void nextChannel.stopWatching();
    };
  }, [client, conversation.channelId, conversation.channelType]);

  if (!channel) {
    return (
      <Card className="min-h-[420px]">
        <CardHeader>
          <CardTitle>Loading chat</CardTitle>
          <CardDescription>Opening the Stream channel.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="min-h-[560px] overflow-hidden">
      <Channel channel={channel}>
        <Window>
          <MessageList />
          <MessageComposer />
        </Window>
        <Thread />
      </Channel>
    </Card>
  );
}

function VideoCallPanel({
  conversation,
}: {
  conversation: StreamMatchConversation;
}) {
  const videoClient = useStreamVideoClient();
  const [call, setCall] = useState<ReturnType<
    StreamVideoClient["call"]
  > | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const startCall = useCallback(async () => {
    setIsJoining(true);
    try {
      if (!videoClient) {
        throw new Error("Video client is not ready.");
      }

      const nextCall = videoClient.call(
        conversation.callType,
        conversation.callId
      );
      await nextCall.join({ create: true });
      setCall(nextCall);
      toast.success("Voice and video room is live.");
    } catch {
      toast.error("Could not start the voice/video room.");
    } finally {
      setIsJoining(false);
    }
  }, [conversation.callId, conversation.callType, videoClient]);

  useEffect(
    () => () => {
      if (call) {
        void call.leave();
      }
    },
    [call]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice/video</CardTitle>
        <CardDescription>
          Use this once the three-reply video exchange feels good.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!call ? (
          <Button disabled={isJoining} onClick={startCall} type="button">
            <Phone data-icon="inline-start" />
            Start room
          </Button>
        ) : (
          <StreamCall call={call}>
            <div className="overflow-hidden rounded-sm border border-border">
              <SpeakerLayout />
              <CallControls />
            </div>
          </StreamCall>
        )}
      </CardContent>
    </Card>
  );
}

function RecapFeedPanel({
  conversation,
}: {
  conversation: StreamMatchConversation;
}) {
  const feedsClient = useFeedsClient();
  const [isPosting, setIsPosting] = useState(false);

  const postRecapSeed = async () => {
    if (!feedsClient) {
      return;
    }

    setIsPosting(true);
    try {
      const feed = feedsClient.feed("user", conversation.requesterId);
      await feed.getOrCreate({ watch: true });
      await feed.addActivity({
        custom: {
          matchId: conversation.match.id,
          recapStatus: "draft",
        },
        text: `Draft recap started for ${conversation.match.displayName}.`,
        type: "post",
      } as never);
      toast.success("Draft recap posted to your Stream feed.");
    } catch {
      toast.error("Could not post the recap draft.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recaps</CardTitle>
        <CardDescription>
          Start a date recap draft after the date. Editing can become its own
          Chewbuu editor later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled={isPosting || !feedsClient} onClick={postRecapSeed}>
          <Send data-icon="inline-start" />
          Post recap draft
        </Button>
      </CardContent>
    </Card>
  );
}
