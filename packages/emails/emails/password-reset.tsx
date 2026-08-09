import { PasswordResetEmail } from "../src/templates/auth";

const PasswordResetPreview = Object.assign(PasswordResetEmail, {
  PreviewProps: {
    name: "Avery",
    url: "https://chewbuu.com/auth/reset-password?token=preview",
  } satisfies Parameters<typeof PasswordResetEmail>[0],
});

export default PasswordResetPreview;
