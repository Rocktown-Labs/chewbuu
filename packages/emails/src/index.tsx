import { render } from "@react-email/render";
import type { ReactElement } from "react";

import type { AuthEmailProps } from "./templates/auth";
import { PasswordResetEmail, VerificationEmail } from "./templates/auth";
import type { LifecycleEmailProps } from "./templates/lifecycle";
import {
  FriendDateInviteEmail,
  MatchesReadyEmail,
  ReviewReminderEmail,
  WelcomeEmail,
} from "./templates/lifecycle";

export type EmailRenderResult = {
  html: string;
  subject: string;
  text: string;
};

const renderEmail = async (
  element: ReactElement,
  subject: string
): Promise<EmailRenderResult> => ({
  html: await render(element),
  subject,
  text: await render(element, { plainText: true }),
});

export const renderVerificationEmail = (props: AuthEmailProps) =>
  renderEmail(<VerificationEmail {...props} />, "Confirm your Chewbuu email");

export const renderPasswordResetEmail = (props: AuthEmailProps) =>
  renderEmail(<PasswordResetEmail {...props} />, "Reset your Chewbuu password");

export const renderWelcomeEmail = (props: LifecycleEmailProps) =>
  renderEmail(<WelcomeEmail {...props} />, "Welcome to Chewbuu");

export const renderMatchesReadyEmail = (props: LifecycleEmailProps) =>
  renderEmail(
    <MatchesReadyEmail {...props} />,
    "Your Chewbuu matches are ready"
  );

export const renderReviewReminderEmail = (props: LifecycleEmailProps) =>
  renderEmail(<ReviewReminderEmail {...props} />, "How did the date go?");

export const renderFriendDateInviteEmail = (props: LifecycleEmailProps) =>
  renderEmail(
    <FriendDateInviteEmail {...props} />,
    "You have a Chewbuu invite"
  );

export type { AuthEmailProps, LifecycleEmailProps };
