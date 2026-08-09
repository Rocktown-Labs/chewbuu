import { WelcomeEmail } from "../src/templates/lifecycle";

const WelcomePreview = Object.assign(WelcomeEmail, {
  PreviewProps: {
    ctaUrl: "https://chewbuu.com/me/profile",
    name: "Avery",
  } satisfies Parameters<typeof WelcomeEmail>[0],
});

export default WelcomePreview;
