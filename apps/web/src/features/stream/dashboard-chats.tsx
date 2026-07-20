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
  CheckCircle2,
  Mic,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  Video,
  PanelLeft,
} from "lucide-react";
import { useState } from "react";

export interface DemoThread {
  id: string;
  name: string;
  avatar: string;
  isVerified?: boolean;
  time: string;
  lastMessage: string;
  reaction?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
  reaction?: string;
}

const initialThreads: DemoThread[] = [
  {
    id: "thread-1",
    name: "K 🖤",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
    isVerified: true,
    time: "11:12 AM",
    lastMessage: "I'm emailing it all to myself",
    reaction: "❤️",
  },
  {
    id: "thread-2",
    name: "Ilyas",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80",
    isVerified: true,
    time: "5d",
    lastMessage: "Hey man! We use plain terraform tbh for...",
  },
  {
    id: "thread-3",
    name: "Theo - t3.gg",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    isVerified: true,
    time: "17w",
    lastMessage: "You: T3 Code is cool but I saw this projec...",
  },
  {
    id: "thread-4",
    name: "Maya Ellis",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80",
    isVerified: true,
    time: "1d",
    lastMessage: "I am down for coffee, karaoke, or both. Your move.",
    unreadCount: 1,
  },
  {
    id: "thread-5",
    name: "Avery Price",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    isVerified: true,
    time: "2d",
    lastMessage: "Want to try that new taco spot this week?",
  },
  {
    id: "thread-6",
    name: "Lisa",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
    isVerified: false,
    time: "18w",
    lastMessage: "Hi!, Quick favor I'm a finalist to co-host a...",
  },
  {
    id: "thread-7",
    name: "JWillskue",
    avatar:
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=240&q=80",
    isVerified: false,
    time: "30w",
    lastMessage: "Yeah it does. But it'll help kids in a major...",
  },
];

const initialMessages: Record<string, ChatMessage[]> = {
  "thread-1": [
    {
      id: "m1",
      sender: "them",
      text: "to search! I'm going to look more into everything. I need assistance but can't afford one lmao. I have so many thoughts, ideas and plans it's crazy",
      time: "10:59 AM",
    },
    {
      id: "m2",
      sender: "them",
      text: "I'm emailing it all to myself",
      time: "11:12 AM",
    },
    {
      id: "m3",
      sender: "me",
      text: "nah i was just trying to see Hov lol. I'm in AR still, atleast for this year. I can help you with some of the stuff if it's web related too. I can help you get set up with AI tools too, probably ChatGPT. with the $20 plan it can help you with stuff, and also code and stuff like that. It could build on to that website off a prompt lol",
      time: "11:28 AM",
      reaction: "❤️",
    },
    {
      id: "m4",
      sender: "them",
      text: "Thank you! You're greatly appreciated. I'm working on a few things right now but I will reach out before the end of the week.",
      time: "11:35 AM",
    },
    {
      id: "m5",
      sender: "them",
      text: "The website is perfect! Is there a way to be alerted when someone submits an order? Like a phone notification",
      time: "1:06 PM",
    },
    {
      id: "m6",
      sender: "me",
      text: "Yeah phone or email, I didn't set it up cause idk if you'd like it lol. You'd need a real domain for emails, and phone needs an account at this website sent.dm",
      time: "1:30 PM",
      reaction: "❤️",
    },
  ],
  "thread-4": [
    {
      id: "tm1",
      sender: "them",
      text: "Hey! Loved seeing your date request in East Nashville.",
      time: "Yesterday",
    },
    {
      id: "tm2",
      sender: "me",
      text: "Awesome! Are you more of a coffee person or tacos?",
      time: "Yesterday",
    },
    {
      id: "tm3",
      sender: "them",
      text: "I am down for coffee, karaoke, or both. Your move.",
      time: "10:45 AM",
    },
  ],
};

export function DashboardChats({
  activeChannelId,
}: {
  activeChannelId?: string;
}) {
  const [selectedThreadId, setSelectedThreadId] = useState<string>(
    activeChannelId || "thread-1"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] =
    useState<Record<string, ChatMessage[]>>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const activeThread =
    initialThreads.find((t) => t.id === selectedThreadId) || initialThreads[0];
  const activeMessagesList = messages[selectedThreadId] || [];

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      text: inputText,
      time: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => ({
      ...prev,
      [selectedThreadId]: [...(prev[selectedThreadId] || []), newMsg],
    }));

    setInputText("");
  };

  const filteredThreads = initialThreads.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl">
      {/* Thread Directory (Left Sidebar) */}
      <div
        className={cn(
          "flex flex-col border-r border-border/80 bg-card/40 transition-all duration-200 shrink-0",
          isSidebarCollapsed
            ? "w-0 opacity-0 overflow-hidden"
            : "w-full md:w-80 opacity-100"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 p-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-foreground tracking-tight">
              Chat
            </h2>
            <Badge
              variant="secondary"
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            >
              All
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsSidebarCollapsed(true)}
            className="rounded-full text-muted-foreground hover:text-foreground"
            title="Collapse Sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-full border-border/70 bg-background/80 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filteredThreads.map((thread) => {
            const isSelected = thread.id === selectedThreadId;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-3 text-left transition select-none",
                  isSelected
                    ? "bg-muted/40 font-medium"
                    : "hover:bg-muted/20 text-muted-foreground"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-11 border border-border/60">
                    <AvatarImage src={thread.avatar} />
                    <AvatarFallback>{thread.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-bold text-xs text-foreground truncate">
                        {thread.name}
                      </span>
                      {thread.isVerified && (
                        <CheckCircle2 className="size-3.5 fill-sky-500 text-background shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {thread.time}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">
                    {thread.lastMessage}
                  </p>
                </div>
                {thread.reaction && (
                  <span className="text-xs shrink-0">{thread.reaction}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Active Pane */}
      <div className="flex flex-1 flex-col bg-background/50 min-w-0 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5 bg-card/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsSidebarCollapsed(false)}
                className="rounded-full text-muted-foreground hover:text-foreground mr-1"
                title="Expand Threads"
              >
                <PanelLeft className="size-4" />
              </Button>
            )}
            <Avatar className="size-10 border border-border">
              <AvatarImage src={activeThread.avatar} />
              <AvatarFallback>{activeThread.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-foreground">
                {activeThread.name}
              </h3>
              {activeThread.isVerified && (
                <CheckCircle2 className="size-4 fill-sky-500 text-background" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full hover:text-foreground"
            >
              <Phone className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full hover:text-foreground"
            >
              <Video className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </div>

        {/* Message Bubble Log */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {activeMessagesList.map((msg) => {
            const isMe = msg.sender === "me";
            return (
              <div
                key={msg.id}
                className={cn(
                  "group relative flex flex-col max-w-[75%] md:max-w-[65%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm",
                  isMe
                    ? "self-end bg-sky-500 text-white rounded-br-none"
                    : "self-start bg-muted/60 text-foreground border border-border/60 rounded-bl-none"
                )}
              >
                <p>{msg.text}</p>
                <div className="mt-1 flex items-center justify-between gap-3 text-[9px] opacity-70">
                  <span className="ml-auto font-mono">{msg.time}</span>
                </div>
                {msg.reaction && (
                  <span className="absolute -bottom-2 -right-1 flex size-5 items-center justify-center rounded-full bg-background border border-border shadow-sm text-[10px]">
                    {msg.reaction}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Message Input Bar */}
        <div className="border-t border-border/80 p-4 bg-card/30 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground hover:text-foreground shrink-0"
            >
              <Plus className="size-4.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full px-2 h-8 text-[11px] font-bold text-muted-foreground hover:text-foreground shrink-0"
            >
              GIF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground hover:text-foreground shrink-0"
            >
              <Smile className="size-4.5" />
            </Button>

            <Input
              placeholder="Message"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="flex-1 rounded-full h-10 border-border bg-background/80 px-4 text-xs"
            />

            <Button
              type="button"
              size="icon-sm"
              onClick={handleSendMessage}
              className="rounded-full size-10 bg-sky-500 hover:bg-sky-600 text-white shrink-0 shadow-sm"
            >
              {inputText.trim() ? (
                <Send className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
