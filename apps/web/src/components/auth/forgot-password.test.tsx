import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ForgotPassword } from "./forgot-password";

const requestPasswordReset = vi.hoisted(() => vi.fn());

vi.mock("@better-auth-ui/react", () => ({
  useAuth: () => ({
    authClient: {},
    basePaths: { auth: "/auth" },
    baseURL: "https://chewbuu.com",
    localization: {
      auth: {
        email: "Email",
        emailPlaceholder: "you@example.com",
        fieldRequired: "This field is required",
        forgotPassword: "Forgot password",
        invalidEmail: "Enter a valid email",
        passwordResetEmailSent: "Reset email sent",
        rememberYourPassword: "Remember your password?",
        sendResetLink: "Send reset link",
        signIn: "Sign in",
      },
    },
    Link: ({ children, href }: { children: ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
    plugins: [],
    viewPaths: { auth: { resetPassword: "reset-password", signIn: "sign-in" } },
  }),
  useFetchOptions: () => ({ fetchOptions: {}, resetFetchOptions: vi.fn() }),
  useRequestPasswordReset: () => ({
    isPending: false,
    mutate: requestPasswordReset,
  }),
}));

describe("ForgotPassword", () => {
  it("uses the pill input treatment for the email field", () => {
    render(<ForgotPassword />);

    expect(screen.getByRole("textbox", { name: "Email" })).toHaveClass(
      "rounded-full",
      "h-10",
      "bg-background"
    );
  });
});
