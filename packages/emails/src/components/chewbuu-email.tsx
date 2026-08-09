import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "@react-email/components";
import type { PropsWithChildren } from "react";

import { CHEWBUU_TAGLINE, EMAIL_BRAND } from "../brand";

const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: EMAIL_BRAND.primary,
        card: EMAIL_BRAND.card,
        ink: EMAIL_BRAND.text,
        muted: EMAIL_BRAND.muted,
        night: EMAIL_BRAND.background,
        stroke: EMAIL_BRAND.border,
      },
    },
  },
};

export interface ChewbuuEmailProps extends PropsWithChildren {
  assetBaseUrl?: string;
  heading: string;
  preview: string;
}

export interface EmailButtonProps extends PropsWithChildren {
  href: string;
}

export const EmailButton = ({ children, href }: EmailButtonProps) => (
  <Button
    className="box-border rounded-full bg-brand px-7 py-3 text-center font-bold text-ink no-underline"
    href={href}
  >
    {children}
  </Button>
);

export const ChewbuuEmail = ({
  assetBaseUrl = "https://chewbuu.com",
  children,
  heading,
  preview,
}: ChewbuuEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind config={tailwindConfig}>
      <Body className="m-0 bg-night px-0 py-8 font-sans">
        <Container className="mx-auto max-w-[600px] rounded-[8px] bg-card p-0">
          <Section className="px-8 pt-8 text-center">
            <Img
              alt="Chewbuu"
              className="mx-auto"
              height="64"
              src={`${assetBaseUrl}${EMAIL_BRAND.logoPath}`}
              width="64"
            />
            <Text className="mb-0 mt-4 font-bold text-[12px] text-muted uppercase tracking-[0.08em]">
              {CHEWBUU_TAGLINE}
            </Text>
            <Heading className="mb-0 mt-3 text-[30px] leading-[36px] font-extrabold text-ink">
              {heading}
            </Heading>
          </Section>
          <Section className="px-8 py-6">{children}</Section>
          <Hr className="m-0 border-solid border-stroke" />
          <Section className="px-8 py-6">
            <Text className="m-0 text-[13px] leading-[20px] text-muted">
              Chewbuu helps verified people request dates, choose nearby spots,
              chat when there is a plan, and recap what happened after.
            </Text>
            <Text className="mb-0 mt-4 text-[12px] leading-[18px] text-muted">
              Need help? Reply to this email or visit{" "}
              <Link
                className="font-bold text-ink underline"
                href={assetBaseUrl}
              >
                chewbuu.com
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
