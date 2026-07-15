import { env } from "@chewbuu/env/server";

import type { SessionUser } from "./auth-session";

type InviteRecipient = {
  email?: string;
  name?: string;
  phone?: string;
  relationship: "friend" | "spouse";
};

type NotificationResult = {
  skipped: boolean;
  type: "email" | "sms";
};

const appOrigin = () => env.CORS_ORIGIN.replace(/\/$/, "");

const recipientName = (recipient: InviteRecipient) =>
  recipient.name?.trim() ||
  (recipient.relationship === "spouse" ? "there" : "friend");

const inviteText = (recipient: InviteRecipient, sessionUser: SessionUser) => {
  const inviter = sessionUser.name || "Someone";
  const inviteLabel =
    recipient.relationship === "spouse"
      ? "join them as their spouse or partner"
      : "join their Chewbuu circle";

  return `Hi ${recipientName(recipient)}, ${inviter} invited you to ${inviteLabel} on Chewbuu. Chewbuu uses verified profiles, live intro videos, and date safety check-ins to make real dates safer. Start here: ${appOrigin()}/auth/sign-up`;
};

const inviteHtml = (recipient: InviteRecipient, sessionUser: SessionUser) => {
  const inviter = sessionUser.name || "Someone";
  const inviteLabel =
    recipient.relationship === "spouse"
      ? "join them as their spouse or partner"
      : "join their Chewbuu circle";

  return `<p>Hi ${recipientName(recipient)},</p><p>${inviter} invited you to ${inviteLabel} on Chewbuu.</p><p>Chewbuu uses verified profiles, live intro videos, and date safety check-ins to make real dates safer.</p><p><a href="${appOrigin()}/auth/sign-up">Join Chewbuu</a></p>`;
};

export const sendInviteEmail = async (
  recipient: InviteRecipient,
  sessionUser: SessionUser
): Promise<NotificationResult> => {
  if (!recipient.email || !env.RESEND_API_KEY) {
    return { skipped: true, type: "email" };
  }

  const relationshipLabel =
    recipient.relationship === "spouse" ? "spouse invite" : "circle invite";

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      html: inviteHtml(recipient, sessionUser),
      subject: `${sessionUser.name || "Someone"} sent you a Chewbuu ${relationshipLabel}`,
      text: inviteText(recipient, sessionUser),
      to: [recipient.email],
    }),
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": `chewbuu-${sessionUser.id}-${recipient.relationship}-${recipient.email}`,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with status ${response.status}`);
  }

  return { skipped: false, type: "email" };
};

export const sendInviteSms = async (
  recipient: InviteRecipient,
  sessionUser: SessionUser
): Promise<NotificationResult> => {
  if (!recipient.phone || !env.SENT_DM_API_KEY) {
    return { skipped: true, type: "sms" };
  }

  const baseUrl = env.SENT_DM_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/messages`, {
    body: JSON.stringify({
      body: inviteText(recipient, sessionUser),
      channel: "sms",
      from: env.SENT_DM_FROM,
      to: recipient.phone,
    }),
    headers: {
      authorization: `Bearer ${env.SENT_DM_API_KEY}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Sent.dm message failed with status ${response.status}`);
  }

  return { skipped: false, type: "sms" };
};

export const sendInviteNotifications = async (
  recipients: InviteRecipient[],
  sessionUser: SessionUser
) => {
  const sends = recipients.map(async (recipient) => {
    const emailResult = await sendInviteEmail(recipient, sessionUser);
    const smsResult = await sendInviteSms(recipient, sessionUser);

    return [emailResult, smsResult];
  });
  const results = await Promise.all(sends);

  return results.flat();
};
