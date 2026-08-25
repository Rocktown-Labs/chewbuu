import type { DatePlace, DatingSummary } from "@/lib/dating-api";

import {
  type DbDateBooking,
  type DbDateRequest,
  dateBookingsCollection,
  dateRequestsCollection,
} from "./dates-collections";
import { type DbMatchProfile, matchesCollection } from "./matches-collections";
import {
  type DbNotification,
  notificationsCollection,
} from "./notifications-collections";
import { type DbDateSpot, dateSpotsCollection } from "./spots-collections";

/**
 * Synchronizes a DatingSummary payload from the backend into TanStack DB normalized collections.
 */
export function syncDatingSummaryToDb(summary: DatingSummary): void {
  if (Array.isArray(summary.requests)) {
    for (const req of summary.requests) {
      const createdAt = Date.now();

      // Sync request
      const reqData: DbDateRequest = {
        id: req.id,
        proposerUserId: req.partyMembers?.[0]?.name || "Match",
        proposerName: req.partyMembers?.[0]?.name || "Match",
        targetUserId: "me",
        spotName: req.places?.[0]?.name || "Venue",
        spotCategory: req.filters?.[0] || "Eat",
        proposedTime: req.scheduledAt || "Tonight",
        status:
          (req.status as "pending" | "accepted" | "declined" | "expired") ||
          "pending",
        createdAt,
      };

      const existingReq = dateRequestsCollection.get(req.id);
      if (existingReq) {
        dateRequestsCollection.update(req.id, (draft) => {
          Object.assign(draft, reqData);
        });
      } else {
        dateRequestsCollection.insert(reqData);
      }

      // Sync notification for request
      const notifId = `notif-req-${req.id}`;
      const notifData: DbNotification = {
        id: notifId,
        userId: "me",
        title: "Date request is matching",
        body: `Date request around ${req.places?.[0]?.address || "your area"}`,
        category: "date",
        isRead: false,
        createdAt,
        time: "Just now",
        ctaUrl: `/me/dates/${req.id}`,
        ctaLabel: "View Date Request",
      };

      const existingNotif = notificationsCollection.get(notifId);
      if (existingNotif) {
        notificationsCollection.update(notifId, (draft) => {
          Object.assign(draft, notifData);
        });
      } else {
        notificationsCollection.insert(notifData);
      }

      // Sync matches inside request if present
      if (Array.isArray(req.matches)) {
        for (const match of req.matches) {
          const matchId = match.id || match.userId;
          const matchData: DbMatchProfile = {
            id: matchId,
            name: match.displayName,
            age: 25,
            area: "Local area",
            bio: match.profileSummary,
            compatibilityScore: match.compatibility,
            photos: match.profilePhotoUrl ? [match.profilePhotoUrl] : [],
            videos: match.introVideoUrl ? [match.introVideoUrl] : [],
            interests: [],
            isVerified: true,
            createdAt: Date.now(),
          };

          const existingMatch = matchesCollection.get(matchId);
          if (existingMatch) {
            matchesCollection.update(matchId, (draft) => {
              Object.assign(draft, matchData);
            });
          } else {
            matchesCollection.insert(matchData);
          }

          // If match is accepted, also track as confirmed date booking
          if (match.status === "accepted" || match.status === "confirmed") {
            const bookingId = `booking-${req.id}-${match.id}`;
            const bookingData: DbDateBooking = {
              id: bookingId,
              status: "confirmed",
              dateType: "one_on_one",
              spotName: req.places?.[0]?.name || "Date Spot",
              spotAddress: req.places?.[0]?.address,
              category: req.filters?.[0] || "Eat",
              dateTime: req.scheduledAt || "Tonight",
              scheduledAt: new Date(req.scheduledAt).getTime() || Date.now(),
              partnerUserId: match.userId,
              partnerName: match.displayName,
              partnerAvatarUrl: match.profilePhotoUrl,
              createdAt: Date.now(),
            };

            const existingBooking = dateBookingsCollection.get(bookingId);
            if (existingBooking) {
              dateBookingsCollection.update(bookingId, (draft) => {
                Object.assign(draft, bookingData);
              });
            } else {
              dateBookingsCollection.insert(bookingData);
            }
          }
        }
      }
    }
  }
}

/**
 * Synchronizes suggested date places into TanStack DB dateSpotsCollection.
 */
export function syncPlacesToDb(places: DatePlace[], category: string): void {
  for (const place of places) {
    const parsedCategory = (
      ["Eat", "Drink", "Play", "Move", "Watch", "Talk"].includes(category)
        ? category
        : "Eat"
    ) as "Eat" | "Drink" | "Play" | "Move" | "Watch" | "Talk";

    const spotData: DbDateSpot = {
      id: place.placeId,
      name: place.name,
      category: parsedCategory,
      address: place.address || "",
      rating: place.rating ? Number(place.rating) : undefined,
      reviewCount: place.userRatingCount,
      photoUrl: place.photoUrl,
      tags: place.types || [],
      latitude: place.latitude,
      longitude: place.longitude,
      websiteUrl: place.websiteUri,
      isCurated: true,
    };

    const existing = dateSpotsCollection.get(place.placeId);
    if (existing) {
      dateSpotsCollection.update(place.placeId, (draft) => {
        Object.assign(draft, spotData);
      });
    } else {
      dateSpotsCollection.insert(spotData);
    }
  }
}
