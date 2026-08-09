import {
  renderPasswordResetEmail,
  renderVerificationEmail,
} from "@chewbuu/emails";
import { env } from "@chewbuu/env/server";
import { Resend } from "resend";

type AuthEmailUser = {
  email: string;
  name?: string | null;
};

type AuthEmailInput = {
  token: string;
  url: string;
  user: AuthEmailUser;
};

type SendRenderedEmailInput = {
  html: string;
  idempotencyKey: string;
  subject: string;
  text: string;
  to: string;
};

let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
};

const sendRenderedEmail = async ({
  html,
  idempotencyKey,
  subject,
  text,
  to,
}: SendRenderedEmailInput) => {
  const resend = getResendClient();
  if (!resend) {
    return;
  }

  const { error } = await resend.emails.send(
    {
      from: env.RESEND_FROM_EMAIL,
      html,
      subject,
      text,
      to,
    },
    { idempotencyKey }
  );

  if (error) {
    throw new Error(`Resend failed to send "${subject}": ${error.message}`);
  }
};

export const sendVerificationEmail = async ({
  token,
  url,
  user,
}: AuthEmailInput) => {
  const email = await renderVerificationEmail({
    assetBaseUrl: env.CORS_ORIGIN,
    name: user.name,
    url,
  });

  await sendRenderedEmail({
    ...email,
    idempotencyKey: `auth-verification/${token}`,
    to: user.email,
  });
};

export const sendPasswordResetEmail = async ({
  token,
  url,
  user,
}: AuthEmailInput) => {
  const email = await renderPasswordResetEmail({
    assetBaseUrl: env.CORS_ORIGIN,
    name: user.name,
    url,
  });

  await sendRenderedEmail({
    ...email,
    idempotencyKey: `auth-password-reset/${token}`,
    to: user.email,
  });
};
