import Stripe from "stripe";

import { getDb } from "./database";
import type { IdentityVerificationSession } from "./types";

type IdentityStatus = IdentityVerificationSession["status"];

const statusFromStripe = (
  status: Stripe.Identity.VerificationSession.Status
): IdentityStatus => (status === "canceled" ? "failed" : status);

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
): IdentityVerificationSession => ({
  id: session.id,
  status: statusFromStripe(session.status),
  url: session.url ?? "",
  ...(verifiedNameFromStripe(session)
    ? { verifiedName: verifiedNameFromStripe(session) }
    : {}),
});

export const createIdentityVerificationSession = async (
  userId: string,
  email: string,
  stripeSecretKey: string,
  returnUrl: string
) => {
  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.identity.verificationSessions.create({
    client_reference_id: userId,
    metadata: { userId },
    options: {
      document: {
        allowed_types: ["driving_license", "id_card", "passport"],
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    provided_details: { email },
    return_url: returnUrl,
    type: "document",
  });

  const db = await getDb();
  await db
    .updateTable("user")
    .set({
      identity_status: statusFromStripe(session.status),
      identity_verification_session_id: session.id,
      identity_verified_at: null,
      identity_verified_name: null,
    })
    .where("id", "=", userId)
    .execute();

  return toVerificationSession(session);
};

export const getIdentityVerificationStatus = async (
  userId: string,
  stripeSecretKey: string
) => {
  const db = await getDb();
  const user = await db
    .selectFrom("user")
    .select([
      "identity_status",
      "identity_verification_session_id",
      "identity_verified_name",
    ])
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new Error("User not found");
  if (!user.identity_verification_session_id) {
    return {
      id: "",
      status: user.identity_status as IdentityStatus,
      url: "",
      ...(user.identity_verified_name
        ? { verifiedName: user.identity_verified_name }
        : {}),
    };
  }

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.identity.verificationSessions.retrieve(
    user.identity_verification_session_id
  );
  const status = statusFromStripe(session.status);
  const verifiedName = verifiedNameFromStripe(session);
  await db
    .updateTable("user")
    .set({
      identity_status: status,
      ...(status === "verified" ? { identity_verified_at: new Date() } : {}),
      ...(verifiedName ? { identity_verified_name: verifiedName } : {}),
    })
    .where("id", "=", userId)
    .execute();

  return toVerificationSession(session);
};
