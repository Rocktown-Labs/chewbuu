import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import { Input } from "@chewbuu/ui/components/input";
import { cn } from "@chewbuu/ui/lib/utils";
import {
  Camera,
  ArrowLeft,
  Play,
  Send,
  MoreVertical,
  UserCheck,
  UserX,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  sender: "me" | "them";
  text?: string;
  videoUrl?: string;
  videoDuration?: string;
  timestamp: string;
}

export interface MatchCandidate {
  id: string;
  displayName: string;
  compatibility: number;
  note: string;
  photoUrl?: string;
  profilePhotoUrl?: string;
  status: string;
  tags: string[];
}

export function DateRoomChat({
  candidate,
  allCandidates,
  onBack,
  onChoosePartner,
  onDeclinePartner,
  onSwitchCandidate,
}: {
  candidate: MatchCandidate;
  allCandidates: MatchCandidate[];
  onBack: () => void;
  onChoosePartner: (id: string) => void;
  onDeclinePartner: (id: string) => void;
  onSwitchCandidate: (id: string) => void;
}) {
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    "demo-match-maya": [
      {
        id: "1",
        sender: "them",
        text: "Hey! Really excited about the Eat, Play, Talk plan. The Golden Booth is one of my favorite spots in East Nashville!",
        timestamp: "6:12 PM",
      },
      {
        id: "2",
        sender: "me",
        text: "Same here! I've been wanting to try Cue & Co. too. Do you play pool?",
        timestamp: "6:15 PM",
      },
      {
        id: "3",
        sender: "them",
        text: "I'm okay, but super competitive! Be prepared to lose haha.",
        timestamp: "6:18 PM",
      },
    ],
    "demo-match-jordan": [
      {
        id: "1",
        sender: "them",
        text: "Hi! I saw your date request. I love tacos and sports. Pool sounds great too.",
        timestamp: "Yesterday",
      },
      {
        id: "2",
        sender: "me",
        text: "Nice! Jordan, do you have any favorite spot in Nashville?",
        timestamp: "Yesterday",
      },
    ],
    "demo-match-riley": [
      {
        id: "1",
        sender: "them",
        text: "Hey there! I saw you chose Comedy and Dessert. Sounds like a fun date.",
        timestamp: "2 days ago",
      },
    ],
  });

  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  const activeMessages = messages[candidate.id] || [];

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => ({
      ...prev,
      [candidate.id]: [...(prev[candidate.id] || []), newMsg],
    }));
    setInputText("");
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordTime(0);
    timerRef.current = window.setInterval(() => {
      setRecordTime((prev) => {
        if (prev >= 120) {
          handleStopRecording(true);
          return 120;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecording = (send = true) => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    if (send && recordTime > 0) {
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: "me",
        videoUrl: "#",
        videoDuration: `${Math.floor(recordTime / 60)}:${(recordTime % 60).toString().padStart(2, "0")}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => ({
        ...prev,
        [candidate.id]: [...(prev[candidate.id] || []), newMsg],
      }));
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row rounded-2xl border border-border/80 bg-card/30 overflow-hidden shadow-xl min-h-[600px] h-[700px] w-full backdrop-blur-md">
      {/* Sidebar: Nested Conversations list */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border/85 bg-muted/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/85 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="md:hidden rounded-full"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h3 className="font-bold text-sm text-foreground">Date Rooms</h3>
          <Badge className="ml-auto rounded-full bg-primary/10 text-primary border-0 text-[10px]">
            {allCandidates.length} Active
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {allCandidates.map((c) => {
            const isActive = c.id === candidate.id;
            const lastMsg = messages[c.id]?.at(-1);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSwitchCandidate(c.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl flex items-center gap-3 transition select-none",
                  isActive
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/30 border border-transparent"
                )}
              >
                <Avatar className="size-10 border border-border/80">
                  <AvatarImage src={c.photoUrl || c.profilePhotoUrl} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {c.displayName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground truncate">
                      {c.displayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.compatibility}% match
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {lastMsg
                      ? lastMsg.videoUrl
                        ? "🎥 Video Message"
                        : lastMsg.text
                      : c.note}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Conversation Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-card/20 relative">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border/80 flex items-center justify-between bg-card/40 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 border border-border">
              <AvatarImage
                src={candidate.photoUrl || candidate.profilePhotoUrl}
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {candidate.displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-foreground">
                  {candidate.displayName}
                </h4>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary rounded-full bg-primary/5"
                >
                  {candidate.compatibility}% match
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate max-w-xs">
                {candidate.note}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" className="rounded-full">
              <MoreVertical className="size-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Intro Videos Row (Side by Side) at the top of the chat */}
        <div className="px-5 py-3 border-b border-border/60 bg-muted/5 flex flex-col gap-2 shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Intro Videos (2 min max)
          </span>
          <div className="grid grid-cols-2 gap-3">
            {/* Requester's Intro */}
            <div className="relative rounded-xl overflow-hidden border border-border/80 aspect-video bg-black/40 flex items-center justify-center group shadow-sm">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-70"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=70')",
                }}
              />
              <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition duration-150" />
              <Button
                size="icon-sm"
                variant="secondary"
                className="size-8 rounded-full z-10 bg-white/90 text-black hover:scale-105 transition"
              >
                <Play className="size-3 fill-black text-black ml-0.5" />
              </Button>
              <span className="absolute bottom-1.5 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                Your Intro
              </span>
            </div>

            {/* Candidate's Intro */}
            <div className="relative rounded-xl overflow-hidden border border-border/80 aspect-video bg-black/40 flex items-center justify-center group shadow-sm">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-70"
                style={{
                  backgroundImage: `url('${candidate.photoUrl || candidate.profilePhotoUrl}')`,
                }}
              />
              <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition duration-150" />
              <Button
                size="icon-sm"
                variant="secondary"
                className="size-8 rounded-full z-10 bg-white/90 text-black hover:scale-105 transition"
              >
                <Play className="size-3 fill-black text-black ml-0.5" />
              </Button>
              <span className="absolute bottom-1.5 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                {candidate.displayName}&apos;s Intro
              </span>
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {activeMessages.map((msg) => {
            const isMe = msg.sender === "me";
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[70%] rounded-2xl p-3.5 text-xs shadow-sm",
                  isMe
                    ? "self-end bg-primary text-primary-foreground rounded-tr-none"
                    : "self-start bg-card/75 border border-border/80 text-foreground rounded-tl-none"
                )}
              >
                {msg.videoUrl ? (
                  // Video Message Bubble
                  <div className="flex flex-col gap-2">
                    <div className="relative rounded-lg overflow-hidden border border-border bg-black/40 aspect-video flex items-center justify-center w-[160px] group shadow-inner">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-60"
                        style={{
                          backgroundImage: `url('${isMe ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200" : candidate.photoUrl}')`,
                        }}
                      />
                      <Play className="size-6 text-white opacity-90 group-hover:scale-110 transition duration-200" />
                      <span className="absolute bottom-1 right-1 text-[8px] font-semibold text-white bg-black/70 px-1 rounded">
                        {msg.videoDuration}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-80 flex items-center gap-1 font-medium">
                      🎥 Video Response
                    </span>
                  </div>
                ) : (
                  // Text Message
                  <p className="leading-relaxed">{msg.text}</p>
                )}
                <span className="text-[9px] opacity-60 mt-1.5 self-end font-medium">
                  {msg.timestamp}
                </span>
              </div>
            );
          })}
        </div>

        {/* Decision prompts inside Chat Room */}
        {candidate.status !== "declined" && candidate.status !== "friended" && (
          <div className="mx-5 mb-1 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-left">
              <span className="text-xs font-bold text-foreground">
                Action Room
              </span>
              <p className="text-[10px] text-muted-foreground">
                Confirm as your date partner or decline to continue matching.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="default"
                size="sm"
                onClick={() => onChoosePartner(candidate.id)}
                className="text-xs font-semibold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 w-full md:w-auto shadow-sm animate-none"
              >
                <UserCheck className="size-3.5" />
                Choose
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeclinePartner(candidate.id)}
                className="text-xs font-semibold rounded-full border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/10 flex items-center gap-1 w-full md:w-auto animate-none"
              >
                <UserX className="size-3.5" />
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* Input Controls */}
        <div className="p-4 border-t border-border/80 bg-card/35 flex items-center gap-2.5 shrink-0">
          {isRecording ? (
            // Recording State controls
            <div className="flex-1 bg-destructive/10 border border-destructive/20 rounded-full py-1.5 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <span className="size-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Recording Response...
                </span>
                <span className="text-xs font-mono font-bold">
                  {Math.floor(recordTime / 60)}:
                  {(recordTime % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStopRecording(false)}
                  className="text-xs font-semibold h-7 text-muted-foreground hover:text-foreground rounded-full px-3 hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleStopRecording(true)}
                  className="text-xs font-bold h-7 rounded-full px-4 shadow-sm animate-none"
                >
                  Send Video
                </Button>
              </div>
            </div>
          ) : (
            // Standard Input Controls
            <>
              {/* Record Video Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleStartRecording}
                className="shrink-0 rounded-full h-10 w-10 p-0 border-destructive/30 text-destructive hover:bg-destructive/10 shadow-sm relative group flex items-center justify-center animate-none"
              >
                <Camera className="size-4.5" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[9px] font-bold text-white bg-black rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                  Record Video Response
                </span>
              </Button>

              {/* Text Input */}
              <Input
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                className="flex-1 rounded-full h-10 border-border bg-background/50 px-4 text-xs"
              />

              {/* Send Button */}
              <Button
                type="button"
                size="icon-sm"
                onClick={handleSendMessage}
                className="shrink-0 rounded-full h-10 w-10 p-0 bg-primary text-primary-foreground shadow-sm flex items-center justify-center animate-none"
              >
                <Send className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
