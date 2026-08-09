import { Text } from "@react-email/components";

import { ChewbuuEmail, EmailButton } from "../components/chewbuu-email";

export interface AuthEmailProps {
  assetBaseUrl?: string;
  name?: string | null;
  url: string;
}

const displayName = (name?: string | null) => name?.trim() || "there";

export const VerificationEmail = ({
  assetBaseUrl,
  name,
  url,
}: AuthEmailProps) => (
  <ChewbuuEmail
    assetBaseUrl={assetBaseUrl}
    heading="Confirm your Chewbuu email"
    preview="One quick check so your profile stays tied to the right inbox."
  >
    <Text className="mt-0 text-[16px] leading-[26px] text-ink">
      Hi {displayName(name)}, welcome to Chewbuu. Confirm your email so we can
      keep your account, date requests, chats, and safety updates connected to
      you.
    </Text>
    <EmailButton href={url}>Verify Email</EmailButton>
    <Text className="mb-0 mt-6 text-[14px] leading-[22px] text-muted">
      This link expires soon. If you did not create a Chewbuu account, you can
      ignore this message.
    </Text>
  </ChewbuuEmail>
);

export const PasswordResetEmail = ({
  assetBaseUrl,
  name,
  url,
}: AuthEmailProps) => (
  <ChewbuuEmail
    assetBaseUrl={assetBaseUrl}
    heading="Reset your password"
    preview="Use this secure link to choose a new Chewbuu password."
  >
    <Text className="mt-0 text-[16px] leading-[26px] text-ink">
      Hi {displayName(name)}, we received a request to reset your Chewbuu
      password. Use the button below to choose a new one.
    </Text>
    <EmailButton href={url}>Reset Password</EmailButton>
    <Text className="mb-0 mt-6 text-[14px] leading-[22px] text-muted">
      If this was not you, skip this email. Your current password will stay the
      same.
    </Text>
  </ChewbuuEmail>
);
