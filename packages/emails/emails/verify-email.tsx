import { VerificationEmail } from "../src/templates/auth";

const VerifyEmailPreview = Object.assign(VerificationEmail, {
  PreviewProps: {
    name: "Avery",
    url: "https://chewbuu.com/api/auth/verify-email?token=preview",
  } satisfies Parameters<typeof VerificationEmail>[0],
});

export default VerifyEmailPreview;
