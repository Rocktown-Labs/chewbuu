import Stripe from "stripe";

import { getDb } from "./database";
import type { VenueIdentityVerificationSession } from "./types";
import { venueAccess } from "./venue-platform";

const statusFromStripe = (
  status: Stripe.Identity.VerificationSession.Status
): VenueIdentityVerificationSession["status"] =>
  status === "canceled" ? "failed" : status;

const verifiedNameFromStripe = (
  session: Stripe.Identity.VerificationSession
) => {
  const firstName = session.verified_outputs?.first_name?.trim();
  const lastName = session.verified_outputs?.last_name?.trim();
  const name = [firstName, lastName].filter(Boolean).join(" ");
  return name || undefined;
};

const toVerificationSession = (
  session: Stripe.Identity.VerificationSession
): VenueIdentityVerificationSession => ({
  id: session.id,
  status: statusFromStripe(session.status),
  url: session.url ?? "",
  ...(verifiedNameFromStripe(session)
    ? { verifiedName: verifiedNameFromStripe(session) }
    : {}),
});

export const createVenueIdentityVerificationSession = async (
  userId: string,
  locationId: string,
  isAdmin: boolean,
  stripeSecretKey: string,
  returnUrl: string,
  email?: string
) => {
  if (!(await venueAccess(userId, locationId, isAdmin))) {
    throw new Error("Venue access required");
  }

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.identity.verificationSessions.create({
    client_reference_id: `${locationId}:${userId}`,
    metadata: {
      locationId,
      userId,
    },
    options: {
      document: {
        allowed_types: ["driving_license", "id_card", "passport"],
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    ...(email ? { provided_details: { email } } : {}),
    return_url: returnUrl,
    type: "document",
  });

  const db = await getDb();
  await db
    .updateTable("venue_location")
    .set({
      stripe_identity_status: statusFromStripe(session.status),
      stripe_identity_verification_session_id: session.id,
      stripe_identity_verified_at: null,
      stripe_identity_verified_name: null,
      updated_at: new Date(),
    })
    .where("id", "=", locationId)
    .execute();

  return toVerificationSession(session);
};

export const getVenueIdentityVerificationStatus = async (
  userId: string,
  locationId: string,
  isAdmin: boolean,
  stripeSecretKey: string
) => {
  if (!(await venueAccess(userId, locationId, isAdmin))) {
    throw new Error("Venue access required");
  }

  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select([
      "stripe_identity_status",
      "stripe_identity_verification_session_id",
      "stripe_identity_verified_at",
      "stripe_identity_verified_name",
    ])
    .where("id", "=", locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found");
  if (!location.stripe_identity_verification_session_id) {
    return {
      id: "",
      status:
        location.stripe_identity_status as VenueIdentityVerificationSession["status"],
      url: "",
      ...(location.stripe_identity_verified_name
        ? { verifiedName: location.stripe_identity_verified_name }
        : {}),
    };
  }

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.identity.verificationSessions.retrieve(
    location.stripe_identity_verification_session_id
  );
  const verifiedName = verifiedNameFromStripe(session);
  const status = statusFromStripe(session.status);
  await db
    .updateTable("venue_location")
    .set({
      stripe_identity_status: status,
      ...(status === "verified"
        ? { stripe_identity_verified_at: new Date() }
        : {}),
      ...(verifiedName ? { stripe_identity_verified_name: verifiedName } : {}),
      updated_at: new Date(),
    })
    .where("id", "=", locationId)
    .execute();

  return toVerificationSession(session);
};
