import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DateWizard } from "./date-wizard";

describe("DateWizard", () => {
  it("keeps social members on solo dates and explains video-first chat", async () => {
    const user = userEvent.setup();

    render(<DateWizard membershipTier="social" />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/social members date solo/i)).toBeVisible();
    expect(screen.getByLabelText(/friend email/i)).toBeDisabled();
  });

  it("lets sugar members choose to cover the date", async () => {
    const user = userEvent.setup();

    render(<DateWizard membershipTier="sugar" />);

    await user.click(screen.getByRole("button", { name: /next/iu }));
    await user.click(screen.getByRole("button", { name: /next/iu }));
    await user.click(screen.getByRole("button", { name: /next/iu }));
    await user.click(screen.getByRole("button", { name: /next/iu }));

    expect(screen.getByRole("button", { name: "Me" })).toBeEnabled();
  });
});
