import type {
  ActiveDateContext,
  ChatMessage,
  ChatPerson,
  ChatThread,
  DateScenario,
} from "./chat-types";

const now = Date.now();
const hours = (h: number) => new Date(now + h * 3_600_000).toISOString();
const days = (d: number) => new Date(now + d * 86_400_000).toISOString();

export const ME_ID = "me" as const;

export const demoPeople = {
  alex: {
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    compatibility: 91,
    id: "person-alex",
    introVideoThumb:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    name: "Alex Rivera",
    note: "Requested coffee + live music in East Nashville.",
    tags: ["Coffee", "Live music", "Low-pressure"],
    verified: true,
  },
  avery: {
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    id: "person-avery",
    name: "Avery Price",
    verified: true,
  },
  jordan: {
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80",
    compatibility: 88,
    id: "person-jordan",
    introVideoThumb:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    name: "Jordan Lee",
    note: "Pool, sports bars, easy conversation.",
    tags: ["Pool", "Sports", "Tacos"],
    verified: true,
  },
  kay: {
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
    id: "person-kay",
    name: "K",
    verified: true,
  },
  maya: {
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80",
    compatibility: 94,
    id: "person-maya",
    introVideoThumb:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    name: "Maya Ellis",
    note: "Down for coffee, karaoke, or both.",
    tags: ["Live music", "Tacos", "Karaoke"],
    verified: true,
  },
  riley: {
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
    compatibility: 83,
    id: "person-riley",
    introVideoThumb:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    name: "Riley Chen",
    note: "Comedy nights and dessert crawls.",
    tags: ["Comedy", "Dessert", "Group hangs"],
    verified: true,
  },
  sam: {
    avatar:
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=240&q=80",
    compatibility: 90,
    id: "person-sam",
    introVideoThumb:
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=400&q=80",
    name: "Sam Okonkwo",
    note: "Great hang energy — better as friends first.",
    tags: ["Brunch", "Arcade", "Friends"],
    verified: true,
  },
} satisfies Record<string, ChatPerson>;

const nashvilleSpots = [
  {
    address: "East Nashville",
    name: "The Golden Booth",
    placeId: "place-golden-booth",
    rating: "4.7",
  },
  {
    address: "Main Street",
    name: "Cue & Co.",
    placeId: "place-cue",
    rating: "4.6",
  },
  {
    address: "Downtown",
    name: "Third Place Coffee",
    placeId: "place-third",
    rating: "4.8",
  },
];

function introPair(
  them: ChatPerson,
  myThumb = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80"
): ChatMessage[] {
  return [
    {
      createdAt: hours(-5),
      durationSec: 42,
      id: `intro-me-${them.id}`,
      kind: "intro_video",
      mediaThumb: myThumb,
      mediaUrl: myThumb,
      senderId: "me",
      text: "Your intro",
    },
    {
      createdAt: hours(-4.9),
      durationSec: 38,
      id: `intro-them-${them.id}`,
      kind: "intro_video",
      mediaThumb: them.introVideoThumb ?? them.avatar,
      mediaUrl: them.introVideoThumb ?? them.avatar,
      senderId: them.id,
      text: `${them.name.split(" ")[0]}'s intro`,
    },
  ];
}

export const demoDateScenarios: DateScenario[] = [
  {
    id: "demo-date-sent",
    kind: "sent",
    matches: [demoPeople.maya, demoPeople.jordan, demoPeople.riley],
    myVideoCount: 0,
    phase: "intros",
    places: nashvilleSpots,
    role: "sender",
    roomMessages: introPair(demoPeople.maya),
    scheduledAt: days(2),
    searchArea: "Nashville, TN",
    status: "Matching",
    theirName: "Maya Ellis",
    theirVideoCount: 0,
    title: "Eat, Play, Talk date",
    what: ["eat", "play", "talk"],
  },
  {
    id: "demo-date-received",
    kind: "received",
    matches: [demoPeople.alex],
    myVideoCount: 0,
    phase: "intros",
    places: [
      {
        address: "12 South",
        name: "Barista Parlor",
        placeId: "place-barista",
        rating: "4.8",
      },
      {
        address: "The Gulch",
        name: "The Basement East",
        placeId: "place-basement",
        rating: "4.5",
      },
      {
        address: "East Nashville",
        name: "Five Points Pizza",
        placeId: "place-pizza",
        rating: "4.6",
      },
    ],
    role: "receiver",
    roomMessages: introPair(demoPeople.alex),
    scheduledAt: days(3),
    searchArea: "Nashville, TN",
    status: "Action needed",
    theirName: "Alex Rivera",
    theirVideoCount: 0,
    title: "Coffee + live music",
    what: ["drink", "play"],
  },
  {
    id: "demo-date-friend",
    kind: "friend",
    matches: [demoPeople.sam],
    myVideoCount: 0,
    phase: "intros",
    places: nashvilleSpots,
    role: "sender",
    roomMessages: introPair(demoPeople.sam),
    scheduledAt: days(4),
    searchArea: "Nashville, TN",
    status: "Matching",
    theirName: "Sam Okonkwo",
    theirVideoCount: 0,
    title: "Brunch + arcade hang",
    what: ["eat", "play"],
  },
];

const kayMessages: ChatMessage[] = [
  {
    createdAt: hours(-6),
    id: "kay-1",
    kind: "text",
    senderId: demoPeople.kay.id,
    text: "to search! I'm going to look more into everything. I need assistance but can't afford one lmao. I have so many thoughts, ideas and plans it's crazy",
  },
  {
    createdAt: hours(-5.5),
    id: "kay-2",
    kind: "text",
    senderId: demoPeople.kay.id,
    text: "I'm emailing it all to myself",
  },
  {
    createdAt: hours(-5),
    id: "kay-3",
    kind: "text",
    reaction: "❤️",
    senderId: "me",
    text: "nah i was just trying to see Hov lol. I'm in AR still, at least for this year. I can help you with some of the stuff if it's web related too.",
  },
  {
    createdAt: hours(-4.5),
    id: "kay-4",
    kind: "text",
    senderId: demoPeople.kay.id,
    text: "Thank you! You're greatly appreciated. I'm working on a few things right now but I will reach out before the end of the week.",
  },
];

const averyMessages: ChatMessage[] = [
  {
    createdAt: hours(-48),
    id: "avery-1",
    kind: "text",
    senderId: demoPeople.avery.id,
    text: "Want to try that new taco spot this week?",
  },
  {
    createdAt: hours(-47),
    id: "avery-2",
    kind: "text",
    senderId: "me",
    text: "I'm down. Thursday after work?",
  },
];

const mayaActiveDate: ActiveDateContext = {
  dateId: "demo-date-sent",
  places: nashvilleSpots.map(({ address, name, placeId }) => ({
    address,
    name,
    placeId,
  })),
  role: "sender",
  scheduledAt: days(2),
  searchArea: "Nashville, TN",
  status: "matching",
  title: "Eat, Play, Talk date",
};

export function buildInitialThreads(): ChatThread[] {
  return [
    {
      id: "thread-kay",
      kind: "friend",
      lastMessage: "Thank you! You're greatly appreciated...",
      messages: kayMessages,
      participants: [demoPeople.kay],
      time: "11:35 AM",
      title: "K",
    },
    {
      id: "thread-avery",
      kind: "friend",
      lastMessage: "I'm down. Thursday after work?",
      messages: averyMessages,
      participants: [demoPeople.avery],
      time: "2d",
      title: "Avery Price",
      unreadCount: 0,
    },
    {
      activeDate: mayaActiveDate,
      id: "room-maya",
      kind: "date_room",
      lastMessage: "Intro videos ready — send your first video reply",
      messages: introPair(demoPeople.maya),
      participants: [demoPeople.maya],
      phase: "intros",
      time: "Now",
      title: "Maya Ellis",
      unreadCount: 1,
    },
    {
      activeDate: {
        dateId: "demo-date-received",
        places: demoDateScenarios[1].places.map(
          ({ address, name, placeId }) => ({
            address,
            name,
            placeId,
          })
        ),
        role: "receiver",
        scheduledAt: days(3),
        searchArea: "Nashville, TN",
        status: "matching",
        title: "Coffee + live music",
      },
      id: "room-alex",
      kind: "date_room",
      lastMessage: "Alex sent a date request — exchange intros",
      messages: introPair(demoPeople.alex),
      participants: [demoPeople.alex],
      phase: "intros",
      time: "1h",
      title: "Alex Rivera",
      unreadCount: 1,
    },
    {
      activeDate: {
        dateId: "demo-date-friend",
        places: nashvilleSpots.map(({ address, name, placeId }) => ({
          address,
          name,
          placeId,
        })),
        role: "sender",
        scheduledAt: days(4),
        searchArea: "Nashville, TN",
        status: "matching",
        title: "Brunch + arcade hang",
      },
      id: "room-sam",
      kind: "date_room",
      lastMessage: "Start with intro videos",
      messages: introPair(demoPeople.sam),
      participants: [demoPeople.sam],
      phase: "intros",
      time: "3h",
      title: "Sam Okonkwo",
    },
  ];
}

export function createSystemMessage(
  text: string,
  systemIcon: ChatMessage["systemIcon"] = "branch"
): ChatMessage {
  return {
    createdAt: new Date().toISOString(),
    id: `sys-${crypto.randomUUID()}`,
    kind: "system",
    senderId: "me",
    systemIcon,
    text,
  };
}

export function createTextMessage(
  text: string,
  senderId: "me" | string = "me"
): ChatMessage {
  return {
    createdAt: new Date().toISOString(),
    id: `msg-${crypto.randomUUID()}`,
    kind: "text",
    senderId,
    text,
  };
}

export function createMediaMessage(input: {
  durationSec?: number;
  kind: "video" | "voice" | "photo";
  mediaThumb?: string;
  mediaUrl: string;
  senderId?: "me" | string;
  text?: string;
}): ChatMessage {
  return {
    createdAt: new Date().toISOString(),
    durationSec: input.durationSec,
    id: `msg-${crypto.randomUUID()}`,
    kind: input.kind,
    mediaThumb: input.mediaThumb ?? input.mediaUrl,
    mediaUrl: input.mediaUrl,
    senderId: input.senderId ?? "me",
    text: input.text,
  };
}
