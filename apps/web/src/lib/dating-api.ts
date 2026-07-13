import { env } from "@chewbuu/env/web";

interface ApiOptions {
  body?: unknown;
  method?: "GET" | "POST" | "PUT";
}

export type MembershipTier = "social" | "mingle" | "sugar";
export type DateWhat = "eat" | "drink" | "play";
export type PaymentMode = "dutch" | "requester_covers";

export interface DatingMedia {
  isPrimary?: boolean;
  kind: "profile_photo" | "photo" | "intro_video";
  sortOrder?: number;
  url: string;
}

export interface DatingProfilePayload {
  area: string;
  birthday: string;
  bio?: string;
  datingModes: string[];
  favoriteThings: string[];
  friendInvites: Array<{ email?: string; phone?: string }>;
  height?: string;
  interestDetails: Record<string, string[]>;
  interestedIn: string[];
  interests: string[];
  media: DatingMedia[];
  safetyOptIn: boolean;
  sex: string;
  sexuality: string;
  trustedContacts: Array<{ email?: string; name: string; phone?: string }>;
  weight?: string;
}

export interface DatePlace {
  address?: string;
  name: string;
  placeId: string;
  rating?: string;
  types: string[];
}

export interface DateRequestPayload {
  filters: string[];
  partyMembers: Array<{
    displayName?: string;
    email?: string;
    name?: string;
    phone?: string;
  }>;
  paymentMode: PaymentMode;
  places: DatePlace[];
  scheduledAt: string;
  searchArea: string;
  what: DateWhat[];
}

export interface DateMatch {
  compatibility: number;
  displayName: string;
  id: string;
  introVideoUrl: string;
  profilePhotoUrl?: string;
  profileSummary: string;
  status: string;
  userId: string;
  videoRepliesRequired: number;
}

export interface DatingSummary {
  membershipTier: MembershipTier;
  readiness: {
    canDate: boolean;
    onboarded: boolean;
    pendingReviews: number;
  };
  requests: Array<
    DateRequestPayload & { id: string; partySize: number; status: string }
  >;
}

const getServerUrl = (url: string) => {
  const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  return `http://localhost:3000${normalized}`;
};

const apiFetch = async <T>(path: string, options: ApiOptions = {}) => {
  const response = await fetch(
    new URL(path, getServerUrl(env.VITE_SERVER_URL)),
    {
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
      headers: options.body
        ? { "content-type": "application/json" }
        : undefined,
      method: options.method ?? "GET",
    }
  );

  const data = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : undefined;
    throw new Error(message || "Request failed.");
  }

  return data as T;
};

export const datingApi = {
  createRequest: (body: DateRequestPayload) =>
    apiFetch<{
      matches: DateMatch[];
      request: DatingSummary["requests"][number];
    }>("/dating/requests", { body, method: "POST" }),
  getProfile: () =>
    apiFetch<{ profile: DatingProfilePayload | null }>("/dating/profile"),
  getSummary: () => apiFetch<DatingSummary>("/dating/summary"),
  saveProfile: (body: DatingProfilePayload) =>
    apiFetch<{
      profile: DatingProfilePayload;
      readiness: DatingSummary["readiness"];
    }>("/dating/profile", { body, method: "PUT" }),
  suggestPlaces: (body: {
    area: string;
    filters: string[];
    what: DateWhat[];
  }) =>
    apiFetch<{ places: DatePlace[] }>("/dating/places/suggest", {
      body,
      method: "POST",
    }),
};
