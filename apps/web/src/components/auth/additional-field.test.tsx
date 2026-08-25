import type { AdditionalField as AdditionalFieldConfig } from "@better-auth-ui/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdditionalField } from "./additional-field";

const usernameField = {
  inputType: "input",
  label: "Username",
  name: "username",
  placeholder: "Choose a username",
  required: true,
  signUp: "above",
  type: "string",
} satisfies AdditionalFieldConfig;

describe("AdditionalField", () => {
  it("uses the pill input treatment for the username field", () => {
    render(<AdditionalField field={usernameField} name={usernameField.name} />);

    expect(screen.getByRole("textbox", { name: "Username" })).toHaveClass(
      "rounded-full",
      "h-10",
      "bg-background"
    );
  });
});
