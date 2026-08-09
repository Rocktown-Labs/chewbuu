import { Text } from "@react-email/components";

import { ChewbuuEmail, EmailButton } from "../components/chewbuu-email";

export interface LifecycleEmailProps {
  assetBaseUrl?: string;
  ctaUrl: string;
  name?: string | null;
}

const displayName = (name?: string | null) => name?.trim() || "there";

export const WelcomeEmail = ({
  assetBaseUrl,
  ctaUrl,
  name,
}: LifecycleEmailProps) => (
  <ChewbuuEmail
    assetBaseUrl={assetBaseUrl}
    heading="Meet for the date, not the swipe"
    preview="Create your profile, pick your places, then meet."
  >
    <Text className="mt-0 text-[16px] leading-[26px] text-ink">
      Hi {displayName(name)}, Chewbuu is built around real plans: verified
      profiles, local date spots, warm chats, and recaps after the date happens.
    </Text>
    <EmailButton href={ctaUrl}>Finish My Profile</EmailButton>
  </ChewbuuEmail>
);

export const MatchesReadyEmail = ({
  assetBaseUrl,
  ctaUrl,
  name,
}: LifecycleEmailProps) => (
  <ChewbuuEmail
    assetBaseUrl={assetBaseUrl}
    heading="Your date matches are ready"
    preview="Review your matches and choose who you want to meet."
  >
    <Text className="mt-0 text-[16px] leading-[26px] text-ink">
      Hi {displayName(name)}, your date request has matches ready to review.
      Take a look, compare the profiles, and keep the plan moving.
    </Text>
    <EmailButton href={ctaUrl}>Review Matches</EmailButton>
  </ChewbuuEmail>
);

export const ReviewReminderEmail = ({
  assetBaseUrl,
  ctaUrl,
  name,
}: LifecycleEmailProps) => (
  <ChewbuuEmail
    assetBaseUrl={assetBaseUrl}
    heading="How did the date go?"
    preview="Share a quick recap so Chewbuu stays honest and useful."
  >
    <Text className="mt-0 text-[16px] leading-[26px] text-ink">
      Hi {displayName(name)}, your review helps Chewbuu recommend better people
      and better places. It only takes a minute.
    </Text>
    <EmailButton href={ctaUrl}>Leave My Review</EmailButton>
  </ChewbuuEmail>
);

export const FriendDateInviteEmail = ({
  assetBaseUrl,
  ctaUrl,
  name,
}: LifecycleEmailProps) => (
  <ChewbuuEmail
    assetBaseUrl={assetBaseUrl}
    heading="You have a friend date invite"
    preview="Someone wants to make the plan more social."
  >
    <Text className="mt-0 text-[16px] leading-[26px] text-ink">
      Hi {displayName(name)}, someone invited you into a Chewbuu date plan.
      Check the request, see the spot, and decide if you are in.
    </Text>
    <EmailButton href={ctaUrl}>View Invite</EmailButton>
  </ChewbuuEmail>
);
