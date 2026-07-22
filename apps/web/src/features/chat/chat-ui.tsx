import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import {
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "@chewbuu/ui/components/bubble";
import { Button } from "@chewbuu/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import { Input } from "@chewbuu/ui/components/input";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@chewbuu/ui/components/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@chewbuu/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@chewbuu/ui/components/message-scroller";
import { cn } from "@chewbuu/ui/lib/utils";
import {
  ArrowLeft,
  Ban,
  CalendarHeart,
  Camera,
  CheckCircle2,
  GitBranch,
  Heart,
  ImagePlus,
  Mic,
  MoreHorizontal,
  Send,
  SkipForward,
  Square,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type {
  ActiveDateContext,
  ChatMessage,
  ChatPerson,
  DateRoomPhase,
} from "./chat-types";
import {
  canSendTextOrVoice,
  formatChatTime,
  isDateRoomLockedToVideo,
} from "./chat-types";
import { formatDuration, useMediaRecorder } from "./use-media-recorder";

const urlPattern = /https?:\/\/[^\s<>"']+/i;
const imageUrlPattern = /\.(?:apng|avif|gif|jpe?g|png|webp)(?:\?.*)?$/i;

export function personInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MediaLightbox({
  media,
  onClose,
}: {
  media: null | {
    kind: "photo" | "video" | "voice";
    title?: string;
    url: string;
  };
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(media)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg border-border bg-background p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{media?.title ?? "Media"}</DialogTitle>
        </DialogHeader>
        <div className="relative bg-black">
          <Button
            aria-label="Close"
            className="absolute top-3 right-3 z-10 rounded-full"
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="secondary"
          >
            <X />
          </Button>
          {media?.kind === "video" ? (
            <video
              autoPlay
              className="max-h-[80vh] w-full object-contain"
              controls
              playsInline
              src={media.url}
            >
              <track kind="captions" />
            </video>
          ) : null}
          {media?.kind === "photo" ? (
            <img
              alt={media.title ?? "Photo"}
              className="max-h-[80vh] w-full object-contain"
              src={media.url}
            />
          ) : null}
          {media?.kind === "voice" ? (
            <div className="flex min-h-40 items-center justify-center p-8">
              <audio autoPlay className="w-full" controls src={media.url}>
                <track kind="captions" />
              </audio>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SystemMarker({ message }: { message: ChatMessage }) {
  const Icon =
    message.systemIcon === "heart"
      ? Heart
      : message.systemIcon === "check"
        ? CheckCircle2
        : message.systemIcon === "user"
          ? UserPlus
          : message.systemIcon === "block"
            ? Ban
            : message.systemIcon === "calendar"
              ? CalendarHeart
              : GitBranch;

  return (
    <Marker>
      <MarkerIcon>
        <Icon />
      </MarkerIcon>
      <MarkerContent>{message.text}</MarkerContent>
    </Marker>
  );
}

function MediaAttachmentBubble({
  align,
  durationSec,
  kind,
  mediaUrl,
  thumb,
  title,
}: {
  align: "end" | "start";
  durationSec?: number;
  kind: "photo" | "video" | "voice";
  mediaUrl?: string;
  thumb?: string;
  title?: string;
}) {
  const label =
    kind === "voice"
      ? "Voice note"
      : kind === "video"
        ? (title ?? "Video")
        : (title ?? "Photo");

  return (
    <Bubble align={align} variant="ghost">
      <BubbleContent className="overflow-hidden rounded-2xl p-0">
        {kind === "voice" ? (
          <div className="flex min-w-56 flex-col gap-2 rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-left">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-background/80 text-foreground">
                <Mic className="size-4" />
              </span>
              <span className="flex flex-col">
                <span className="font-bold text-xs">Voice note</span>
                <span className="text-[10px] text-muted-foreground">
                  {durationSec ? formatDuration(durationSec) : "Tap to play"}
                </span>
              </span>
            </div>
            {mediaUrl ? (
              <audio className="h-8 w-full" controls src={mediaUrl}>
                <track kind="captions" />
              </audio>
            ) : null}
          </div>
        ) : kind === "video" ? (
          <div className="relative block max-w-44 overflow-hidden rounded-2xl border border-border/70 bg-black text-left sm:max-w-52">
            {mediaUrl ? (
              <video
                className="aspect-[3/4] w-full object-cover"
                controls
                playsInline
                poster={thumb}
                src={mediaUrl}
              >
                <track kind="captions" />
              </video>
            ) : (
              <span className="block aspect-[3/4] w-40 bg-muted" />
            )}
            {durationSec ? (
              <span className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-black/70 px-1.5 py-0.5 font-semibold text-[10px] text-white">
                {formatDuration(durationSec)}
              </span>
            ) : null}
          </div>
        ) : (
          <a
            aria-label={label}
            className="relative block max-w-52 overflow-hidden rounded-2xl border border-border/70 bg-muted/30 text-left sm:max-w-60"
            href={mediaUrl ?? thumb}
            rel="noreferrer"
            target="_blank"
          >
            {thumb || mediaUrl ? (
              <img
                alt={label}
                className="aspect-[3/4] w-full object-cover"
                src={thumb ?? mediaUrl}
              />
            ) : (
              <span className="block aspect-[3/4] w-40 bg-muted" />
            )}
          </a>
        )}
      </BubbleContent>
    </Bubble>
  );
}

function VoiceWaveformPreview({
  elapsedSec,
  isRecording,
}: {
  elapsedSec: number;
  isRecording: boolean;
}) {
  const bars = [18, 30, 46, 26, 54, 34, 22, 42, 58, 28, 48, 36];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex h-10 items-center gap-1 overflow-hidden rounded-full bg-background/70 px-3">
        {bars.map((height, index) => (
          <span
            className={cn(
              "w-1 shrink-0 rounded-full bg-primary/70",
              isRecording && "animate-pulse"
            )}
            key={`${height}-${index}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <p className="line-clamp-1 text-[11px] text-muted-foreground">
        {isRecording
          ? `Listening... ${formatDuration(elapsedSec)}`
          : "Voice note ready. Playback and transcription will live here."}
      </p>
    </div>
  );
}

function LinkPreviewBubble({
  align,
  text,
}: {
  align: "end" | "start";
  text?: string;
}) {
  const url = text?.match(urlPattern)?.[0];

  if (!url || !imageUrlPattern.test(url)) {
    return null;
  }

  return (
    <Bubble align={align} variant="ghost">
      <BubbleContent className="mt-1 overflow-hidden rounded-2xl border border-border/70 p-0">
        <a href={url} rel="noreferrer" target="_blank">
          <img
            alt="Link preview"
            className="max-h-64 w-52 object-cover sm:w-64"
            src={url}
          />
        </a>
      </BubbleContent>
    </Bubble>
  );
}

export function ChatMessageRow({
  message,
  peopleById,
  showAvatar = true,
}: {
  message: ChatMessage;
  peopleById: Record<string, ChatPerson>;
  showAvatar?: boolean;
}) {
  if (message.kind === "system") {
    return <SystemMarker message={message} />;
  }

  const isMe = message.senderId === "me";
  const person = isMe ? null : peopleById[message.senderId];
  const align = isMe ? "end" : "start";
  const name = isMe ? "You" : (person?.name ?? "Match");

  return (
    <Message align={align}>
      {!isMe && showAvatar ? (
        <MessageAvatar>
          <Avatar className="size-8">
            {person?.avatar ? <AvatarImage src={person.avatar} /> : null}
            <AvatarFallback>{personInitials(name)}</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      ) : null}
      <MessageContent>
        {!isMe && showAvatar ? <MessageHeader>{name}</MessageHeader> : null}
        {message.kind === "text" ? (
          <>
            <Bubble align={align} variant={isMe ? "default" : "muted"}>
              <BubbleContent className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed">
                {message.text}
              </BubbleContent>
              {message.reaction ? (
                <BubbleReactions align={isMe ? "end" : "start"} side="bottom">
                  <span className="text-xs">{message.reaction}</span>
                </BubbleReactions>
              ) : null}
            </Bubble>
            <LinkPreviewBubble align={align} text={message.text} />
          </>
        ) : null}
        {message.kind === "intro_video" ||
        message.kind === "video" ||
        message.kind === "photo" ||
        message.kind === "voice" ? (
          <MediaAttachmentBubble
            align={align}
            durationSec={message.durationSec}
            kind={
              message.kind === "intro_video"
                ? "video"
                : message.kind === "photo"
                  ? "photo"
                  : message.kind === "voice"
                    ? "voice"
                    : "video"
            }
            mediaUrl={message.mediaUrl}
            thumb={message.mediaThumb ?? message.mediaUrl}
            title={
              message.kind === "intro_video"
                ? message.text
                : message.kind === "voice"
                  ? "Voice note"
                  : undefined
            }
          />
        ) : null}
        <MessageFooter>{formatChatTime(message.createdAt)}</MessageFooter>
      </MessageContent>
    </Message>
  );
}

export function ChatThreadBody({
  footer,
  header,
  messages,
  peopleById,
  topSlot,
}: {
  footer?: ReactNode;
  header?: ReactNode;
  messages: ChatMessage[];
  peopleById: Record<string, ChatPerson>;
  topSlot?: ReactNode;
}) {
  const introMessages = messages.filter((m) => m.kind === "intro_video");
  const restMessages = messages.filter((m) => m.kind !== "intro_video");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-4 px-4 py-4">
              {topSlot ? (
                <MessageScrollerItem messageId="top-slot">
                  {topSlot}
                </MessageScrollerItem>
              ) : null}

              {introMessages.length > 0 ? (
                <>
                  <MessageScrollerItem messageId="intro-marker">
                    <Marker variant="separator">
                      <MarkerContent>Intro videos</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                  {introMessages.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                    >
                      <ChatMessageRow
                        message={message}
                        peopleById={peopleById}
                      />
                    </MessageScrollerItem>
                  ))}
                  <MessageScrollerItem messageId="exchange-marker">
                    <Marker variant="separator">
                      <MarkerContent>Video exchange</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                </>
              ) : null}

              {restMessages.map((message, index) => (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={
                    message.senderId === "me" &&
                    index === restMessages.length - 1
                  }
                >
                  <ChatMessageRow message={message} peopleById={peopleById} />
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      {footer}
    </div>
  );
}

export function ChatHeader({
  onBack,
  onMore,
  people,
  subtitle,
  title,
  trailing,
}: {
  onBack?: () => void;
  onMore?: () => void;
  people: ChatPerson[];
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
}) {
  const [primary] = people;
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/90 px-3 py-3 backdrop-blur-md sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack ? (
          <Button
            aria-label="Back"
            className="rounded-full md:hidden"
            onClick={onBack}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeft />
          </Button>
        ) : null}
        {people.length > 1 ? (
          <div className="flex -space-x-2">
            {people.slice(0, 3).map((person) => (
              <Avatar
                className="size-9 border-2 border-background"
                key={person.id}
              >
                <AvatarImage src={person.avatar} />
                <AvatarFallback>{personInitials(person.name)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        ) : (
          <Avatar className="size-10 border border-border">
            {primary?.avatar ? <AvatarImage src={primary.avatar} /> : null}
            <AvatarFallback>
              {personInitials(primary?.name ?? title)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold text-sm">{title}</h3>
            {primary?.verified ? (
              <CheckCircle2 className="size-3.5 shrink-0 fill-sky-500 text-background" />
            ) : null}
          </div>
          {subtitle ? (
            <p className="truncate text-[11px] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        {onMore ? (
          <Button
            aria-label="More"
            className="rounded-full"
            onClick={onMore}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ActiveDateBanner({
  activeDate,
  onCancel,
  onOpenDate,
  onReschedule,
  onShowQr,
}: {
  activeDate: ActiveDateContext;
  onCancel?: () => void;
  onOpenDate: () => void;
  onReschedule?: () => void;
  onShowQr?: () => void;
}) {
  const when = new Date(activeDate.scheduledAt);
  const place = activeDate.places[0]?.name ?? activeDate.searchArea;

  return (
    <div className="border-b border-primary/20 bg-primary/8 px-3 py-2.5 sm:px-4">
      <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-background/70 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <CalendarHeart className="size-3.5 text-primary" />
              <span className="font-bold text-xs">{activeDate.title}</span>
              <Badge className="rounded-full text-[9px]" variant="secondary">
                {activeDate.status}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {when.toLocaleString([], {
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                month: "short",
                weekday: "short",
              })}{" "}
              · {place}
            </p>
          </div>
          <Button
            className="rounded-full text-[11px]"
            onClick={onOpenDate}
            size="sm"
            type="button"
            variant="outline"
          >
            Date page
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {onShowQr ? (
            <Button
              className="rounded-full text-[11px]"
              onClick={onShowQr}
              size="sm"
              type="button"
            >
              Show QR
            </Button>
          ) : null}
          {onReschedule ? (
            <Button
              className="rounded-full text-[11px]"
              onClick={onReschedule}
              size="sm"
              type="button"
              variant="outline"
            >
              Reschedule
            </Button>
          ) : null}
          {onCancel ? (
            <Button
              className="rounded-full text-[11px]"
              onClick={onCancel}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DecisionCtaPanel({
  disabled,
  onBlock,
  onContinue,
  onFriend,
  onPick,
}: {
  disabled?: boolean;
  onBlock: () => void;
  onContinue: () => void;
  onFriend: () => void;
  onPick: () => void;
}) {
  return (
    <div className="mx-3 mb-2 rounded-2xl border border-primary/25 bg-primary/8 p-3 sm:mx-4">
      <p className="font-bold text-xs">Your move</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        3 video replies exchanged. Pick them for the date, add as a friend, keep
        chatting, or block.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          className="rounded-full text-xs"
          disabled={disabled}
          onClick={onPick}
          size="sm"
          type="button"
        >
          <CalendarHeart data-icon="inline-start" />
          Pick for date
        </Button>
        <Button
          className="rounded-full text-xs"
          disabled={disabled}
          onClick={onFriend}
          size="sm"
          type="button"
          variant="outline"
        >
          <UserPlus data-icon="inline-start" />
          Add friend
        </Button>
        <Button
          className="rounded-full text-xs"
          disabled={disabled}
          onClick={onContinue}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Video data-icon="inline-start" />
          Keep chatting
        </Button>
        <Button
          className="rounded-full text-xs"
          disabled={disabled}
          onClick={onBlock}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Ban data-icon="inline-start" />
          Block
        </Button>
      </div>
    </div>
  );
}

export function ChatComposer({
  dateMode = false,
  onSendMedia,
  onSendText,
  onSkipTheirReply,
  phase = "continued",
  threadId,
  videoProgress,
}: {
  dateMode?: boolean;
  onSendMedia: (input: {
    durationSec?: number;
    kind: "photo" | "video" | "voice";
    mediaUrl: string;
    thumbUrl?: string;
  }) => void;
  onSendText: (text: string) => void;
  onSkipTheirReply?: () => void;
  phase?: DateRoomPhase;
  threadId?: string;
  videoProgress?: { mine: number; theirs: number; limit: number };
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "video" | "voice">(
    dateMode && isDateRoomLockedToVideo(phase) ? "video" : "text"
  );
  const [pendingRecorderStart, setPendingRecorderStart] = useState(false);
  const [recorderRequested, setRecorderRequested] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const lockedToVideo = dateMode && isDateRoomLockedToVideo(phase);
  const textUnlocked = !dateMode || canSendTextOrVoice(phase);
  const blocked = phase === "blocked";

  const recorder = useMediaRecorder({
    maxSeconds: 120,
    mode: mode === "voice" ? "voice" : "video",
  });
  const {
    clip: recorderClip,
    cancel: cancelRecorder,
    requestStream,
    reset: resetRecorder,
    start: startRecorder,
    status: recorderStatus,
    stop: stopRecorder,
  } = recorder;

  useEffect(() => {
    if (lockedToVideo) setMode("video");
  }, [lockedToVideo]);

  useEffect(() => {
    setText("");
    setMode(lockedToVideo ? "video" : "text");
    setPendingRecorderStart(false);
    setRecorderRequested(false);
    cancelRecorder();
  }, [cancelRecorder, lockedToVideo, threadId]);

  useEffect(() => {
    if (
      (mode === "video" || mode === "voice") &&
      recorderRequested &&
      recorderStatus === "idle" &&
      !recorderClip
    ) {
      void requestStream();
    }
  }, [mode, recorderClip, recorderRequested, recorderStatus, requestStream]);

  useEffect(() => {
    if (pendingRecorderStart && recorderStatus === "ready") {
      setPendingRecorderStart(false);
      void startRecorder();
    }
  }, [pendingRecorderStart, recorderStatus, startRecorder]);

  useEffect(() => {
    const el = videoPreviewRef.current;
    if (!el) return;
    if (recorder.previewStream) {
      el.srcObject = recorder.previewStream;
      void (async () => {
        try {
          await el.play();
        } catch {
          // Autoplay can fail until the user interacts.
        }
      })();
    } else {
      el.srcObject = null;
    }
  }, [recorder.previewStream]);

  const handleSendText = () => {
    if (!text.trim() || blocked) return;
    onSendText(text.trim());
    setText("");
  };

  const toggleRecorder = (nextMode: "video" | "voice") => {
    if (blocked) return;
    if (mode === nextMode && recorderStatus === "recording") {
      stopRecorder();
      return;
    }
    if (mode !== nextMode) {
      cancelRecorder();
    }
    setMode(nextMode);
    setRecorderRequested(true);
    if (mode === nextMode && recorderStatus === "ready") {
      void startRecorder();
      return;
    }
    setPendingRecorderStart(true);
  };

  const handleSendClip = () => {
    if (!recorder.clip) return;
    onSendMedia({
      durationSec: recorder.clip.durationSec,
      kind: recorder.clip.kind === "voice" ? "voice" : "video",
      mediaUrl: recorder.clip.objectUrl,
      thumbUrl: recorder.clip.thumbUrl,
    });
    resetRecorder();
    if (!lockedToVideo) setMode("text");
  };

  if (blocked) {
    return (
      <div className="border-t border-border/80 px-4 py-3 text-center text-xs text-muted-foreground">
        This conversation is blocked.
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-border/80 bg-background/95 p-3 backdrop-blur-md">
      {dateMode && videoProgress ? (
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] text-muted-foreground">
            Videos {Math.min(videoProgress.mine, videoProgress.limit)}/
            {videoProgress.limit} you ·{" "}
            {Math.min(videoProgress.theirs, videoProgress.limit)}/
            {videoProgress.limit} them
          </p>
          {onSkipTheirReply && lockedToVideo ? (
            <Button
              className="h-7 rounded-full px-2 text-[10px]"
              onClick={onSkipTheirReply}
              size="sm"
              type="button"
              variant="ghost"
            >
              <SkipForward data-icon="inline-start" />
              Skip their reply
            </Button>
          ) : null}
        </div>
      ) : null}

      {(mode === "video" || mode === "voice") &&
      (recorder.status === "ready" ||
        recorder.status === "recording" ||
        recorder.status === "requesting" ||
        recorder.status === "stopped" ||
        recorder.status === "error") ? (
        <div className="mb-3 overflow-hidden rounded-2xl border border-border bg-card">
          {mode === "video" ? (
            <div className="relative mx-auto aspect-[3/4] max-h-[22rem] w-48 max-w-full bg-black sm:w-56">
              {recorder.status === "stopped" && recorder.clip ? (
                <video
                  className="size-full object-cover"
                  controls
                  playsInline
                  src={recorder.clip.objectUrl}
                >
                  <track kind="captions" />
                </video>
              ) : (
                <video
                  autoPlay
                  className="size-full object-cover"
                  muted
                  playsInline
                  ref={videoPreviewRef}
                >
                  <track kind="captions" />
                </video>
              )}
              {recorder.status === "recording" ? (
                <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-destructive/90 px-2.5 py-1 text-[11px] font-bold text-white">
                  <span className="size-2 animate-pulse rounded-full bg-white" />
                  {formatDuration(recorder.elapsedSec)}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mic />
                <span className="sr-only">
                  {recorder.status === "recording"
                    ? `Recording ${formatDuration(recorder.elapsedSec)}`
                    : recorder.clip
                      ? `Voice note ${formatDuration(recorder.clip.durationSec)}`
                      : "Ready to record"}
                </span>
              </div>
              <VoiceWaveformPreview
                elapsedSec={recorder.clip?.durationSec ?? recorder.elapsedSec}
                isRecording={recorder.status === "recording"}
              />
            </div>
          )}

          {recorder.error ? (
            <p className="border-t border-border px-3 py-2 text-[11px] text-destructive">
              {recorder.error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-2">
            <Button
              className="rounded-full"
              onClick={() => {
                cancelRecorder();
                if (!lockedToVideo) setMode("text");
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            {recorder.status === "stopped" && recorder.clip ? (
              <Button
                className="rounded-full"
                onClick={handleSendClip}
                size="sm"
                type="button"
              >
                <Send data-icon="inline-start" />
                Send
              </Button>
            ) : recorder.status === "recording" ? (
              <Button
                className="rounded-full"
                onClick={stopRecorder}
                size="sm"
                type="button"
                variant="destructive"
              >
                <Square data-icon="inline-start" />
                Stop
              </Button>
            ) : (
              <Button
                className="rounded-full"
                onClick={() =>
                  toggleRecorder(mode === "voice" ? "voice" : "video")
                }
                size="sm"
                type="button"
              >
                {mode === "voice" ? (
                  <Mic data-icon="inline-start" />
                ) : (
                  <Camera data-icon="inline-start" />
                )}
                {mode === "voice" ? "Record voice" : "Record video"}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-1.5">
        {!lockedToVideo ? (
          <>
            <Button
              aria-label="Record video"
              className={cn(
                "rounded-full",
                mode === "video" &&
                  recorderStatus === "recording" &&
                  "text-primary"
              )}
              onClick={() => toggleRecorder("video")}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {mode === "video" && recorderStatus === "recording" ? (
                <Square />
              ) : (
                <Camera />
              )}
            </Button>
            <Button
              aria-label="Voice note"
              className={cn(
                "rounded-full",
                mode === "voice" &&
                  recorderStatus === "recording" &&
                  "text-primary"
              )}
              onClick={() => toggleRecorder("voice")}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {mode === "voice" && recorderStatus === "recording" ? (
                <Square />
              ) : (
                <Mic />
              )}
            </Button>
            <Button
              aria-label="Add photo"
              className="rounded-full"
              onClick={() => fileInputRef.current?.click()}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ImagePlus />
            </Button>
            <input
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                const kind = file.type.startsWith("video/") ? "video" : "photo";
                onSendMedia({ kind, mediaUrl: url, thumbUrl: url });
                event.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
          </>
        ) : (
          <Button
            className="rounded-full"
            onClick={() => toggleRecorder("video")}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            {recorderStatus === "recording" ? <Square /> : <Camera />}
          </Button>
        )}

        <Input
          className={cn(
            "h-10 flex-1 rounded-full border-border bg-card/60 px-4 text-sm",
            !textUnlocked && "opacity-60"
          )}
          disabled={!textUnlocked || mode !== "text"}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSendText();
            }
          }}
          onFocus={() => {
            if (textUnlocked && recorderStatus !== "recording") {
              setMode("text");
            }
          }}
          placeholder={
            lockedToVideo
              ? "Send a video reply to continue…"
              : textUnlocked
                ? "Message"
                : "Unlock text after 3 video replies"
          }
          value={text}
        />

        <Button
          className="size-10 rounded-full"
          onClick={() => {
            if (lockedToVideo || mode === "video") {
              toggleRecorder("video");
              return;
            }
            if (text.trim()) {
              handleSendText();
              return;
            }
            toggleRecorder("voice");
          }}
          size="icon-sm"
          type="button"
        >
          {(mode === "voice" || mode === "video") &&
          recorderStatus === "recording" ? (
            <Square />
          ) : text.trim() && textUnlocked ? (
            <Send />
          ) : lockedToVideo ? (
            <Video />
          ) : (
            <Mic />
          )}
        </Button>
      </div>
    </div>
  );
}
