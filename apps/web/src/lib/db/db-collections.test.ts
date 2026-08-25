import { describe, expect, it } from "vitest";

import {
  chatMessagesCollection,
  chatRoomsCollection,
  dateBookingsCollection,
  dateSpotsCollection,
  insertRealtimeMessageToDb,
  matchDecisionsCollection,
  matchesCollection,
  notificationsCollection,
  onboardingDraftCollection,
  savedSpotsCollection,
  syncRoomsToDb,
} from "./index";

describe("TanStack DB Collections", () => {
  describe("Chat Collections", () => {
    it("inserts and retrieves chat rooms and messages correctly", () => {
      chatRoomsCollection.insert({
        id: "room-1",
        kind: "friend",
        title: "Alex",
        participants: [
          { id: "user-1", name: "Alex", age: 28, area: "Manhattan" },
          { id: "me", name: "Casey", age: 27, area: "Brooklyn" },
        ],
        lastMessage: "Hey there!",
        lastActivityAt: 1000,
        unreadCount: 1,
        time: "10:00 AM",
        archived: false,
      });

      chatMessagesCollection.insert({
        id: "msg-1",
        roomId: "room-1",
        senderId: "user-1",
        kind: "text",
        text: "Hey there!",
        createdAt: 1000,
        time: "10:00 AM",
        isRead: false,
        status: "sent",
      });

      const room = chatRoomsCollection.get("room-1");
      expect(room).toBeDefined();
      expect(room?.title).toBe("Alex");
      expect(room?.unreadCount).toBe(1);

      const msg = chatMessagesCollection.get("msg-1");
      expect(msg).toBeDefined();
      expect(msg?.text).toBe("Hey there!");
    });

    it("syncs API rooms and maps unread counts and messages", () => {
      syncRoomsToDb(
        [
          {
            id: "room-api-1",
            kind: "date_room",
            title: "Taylor Date Room",
            phase: "intro",
            participants: [
              {
                id: "user-2",
                displayName: "Taylor",
                userId: "user-2",
                avatarUrl: "/taylor.jpg",
              },
              { id: "current-user", displayName: "Me", userId: "current-user" },
            ],
            messages: [
              {
                id: "msg-api-1",
                roomId: "room-api-1",
                senderId: "user-2",
                kind: "video",
                mediaUrl: "https://example.com/video.mp4",
                durationSec: 15,
                createdAt: "2026-08-25T10:00:00Z",
              },
            ],
            unreadCount: 1,
            updatedAt: "2026-08-25T10:00:00Z",
          } as unknown as Parameters<typeof syncRoomsToDb>[0][number],
        ],
        "current-user"
      );

      const room = chatRoomsCollection.get("room-api-1");
      expect(room).toBeDefined();
      expect(room?.kind).toBe("date_room");
      expect(room?.phase).toBe("intro");
      expect(room?.unreadCount).toBe(1);

      const msg = chatMessagesCollection.get("msg-api-1");
      expect(msg).toBeDefined();
      expect(msg?.kind).toBe("video");
    });

    it("handles incoming realtime message and updates room preview", () => {
      insertRealtimeMessageToDb(
        {
          id: "msg-rt-1",
          roomId: "room-api-1",
          senderId: "user-2",
          kind: "text",
          text: "Can't wait for our date!",
          createdAt: new Date().toISOString(),
        },
        "current-user",
        false
      );

      const msg = chatMessagesCollection.get("msg-rt-1");
      expect(msg).toBeDefined();
      expect(msg?.text).toBe("Can't wait for our date!");

      const room = chatRoomsCollection.get("room-api-1");
      expect(room?.lastMessage).toBe("Can't wait for our date!");
      expect(room?.unreadCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Matches & Decisions Collections", () => {
    it("stores match profiles and decisions optimistically", () => {
      matchesCollection.insert({
        id: "match-101",
        name: "Jordan",
        age: 26,
        area: "Downtown",
        bio: "Coffee enthusiast & book lover",
        photos: ["/jordan.jpg"],
        videos: [],
        interests: ["Coffee", "Books", "Art"],
        isVerified: true,
        createdAt: 1000,
      });

      matchDecisionsCollection.insert({
        id: "dec-1",
        matchId: "match-101",
        userId: "current-user",
        decision: "like",
        createdAt: 1100,
        synced: false,
      });

      const profile = matchesCollection.get("match-101");
      expect(profile?.name).toBe("Jordan");
      expect(profile?.isVerified).toBe(true);

      const decision = matchDecisionsCollection.get("dec-1");
      expect(decision?.decision).toBe("like");
      expect(decision?.synced).toBe(false);
    });
  });

  describe("Date Spots Collections", () => {
    it("inserts date spots and tracks saved bookmarks", () => {
      dateSpotsCollection.insert({
        id: "spot-1",
        name: "Blue Dahlia Bistro",
        category: "Eat",
        address: "1115 E 11th St, Austin, TX",
        neighborhood: "East Austin",
        priceTier: "$$",
        rating: 4.8,
        tags: ["Cozy", "Patio", "Wine"],
        isCurated: true,
      });

      savedSpotsCollection.insert({
        id: "saved-1",
        spotId: "spot-1",
        userId: "current-user",
        savedAt: Date.now(),
        notes: "Great brunch spot",
      });

      const spot = dateSpotsCollection.get("spot-1");
      expect(spot?.name).toBe("Blue Dahlia Bistro");
      expect(spot?.category).toBe("Eat");

      const saved = savedSpotsCollection.get("saved-1");
      expect(saved?.spotId).toBe("spot-1");
    });
  });

  describe("Date Bookings & Requests Collections", () => {
    it("tracks date lifecycle states", () => {
      dateBookingsCollection.insert({
        id: "booking-1",
        status: "confirmed",
        dateType: "one_on_one",
        spotName: "Loro",
        spotAddress: "2115 S Lamar Blvd",
        category: "Eat",
        dateTime: "Tonight at 7:00 PM",
        scheduledAt: Date.now() + 3_600_000,
        partnerName: "Taylor",
        createdAt: Date.now(),
      });

      const booking = dateBookingsCollection.get("booking-1");
      expect(booking?.status).toBe("confirmed");
      expect(booking?.partnerName).toBe("Taylor");
    });
  });

  describe("Notifications Collection", () => {
    it("stores notifications and tracks read state", () => {
      notificationsCollection.insert({
        id: "notif-1",
        userId: "current-user",
        title: "New Date Request!",
        body: "Taylor invited you to Loro tonight.",
        category: "date",
        isRead: false,
        createdAt: Date.now(),
        ctaUrl: "/me/dates/booking-1",
        ctaLabel: "View Invite",
      });

      const notif = notificationsCollection.get("notif-1");
      expect(notif?.title).toBe("New Date Request!");
      expect(notif?.isRead).toBe(false);

      notificationsCollection.update("notif-1", (draft) => {
        draft.isRead = true;
      });

      const updated = notificationsCollection.get("notif-1");
      expect(updated?.isRead).toBe(true);
    });
  });

  describe("Onboarding Draft Collection", () => {
    it("persists onboarding step and profile data", () => {
      onboardingDraftCollection.insert({
        id: "current",
        step: 2,
        name: "Alex Smith",
        area: "Austin, TX",
        interests: ["Music", "Coffee"],
        notificationsEnabled: true,
        cameraAllowed: true,
        micAllowed: true,
        locationAllowed: true,
        alertsAllowed: true,
        updatedAt: Date.now(),
      });

      const draft = onboardingDraftCollection.get("current");
      expect(draft?.step).toBe(2);
      expect(draft?.name).toBe("Alex Smith");
      expect(draft?.cameraAllowed).toBe(true);
      expect(draft?.locationAllowed).toBe(true);
    });
  });
});
