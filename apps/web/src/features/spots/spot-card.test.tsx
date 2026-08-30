import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { SpotCard } from "./spot-card";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    hash,
    params,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    hash?: string;
    params?: { locationId: string };
    to: string;
  }) => (
    <a
      href={`${to}/${params?.locationId ?? ""}${hash ? `#${hash}` : ""}`}
      {...props}
    >
      {children as ReactNode}
    </a>
  ),
}));

vi.mock("@/lib/dating-api", () => ({
  getApiUrl: (url: string) => url,
  spotsApi: { getPhoto: vi.fn() },
}));

describe("SpotCard", () => {
  it("uses compact actions for menu and spot information", () => {
    render(
      <SpotCard
        spot={{
          address: "123 Main Street",
          dataSource: "google",
          name: "Good Company",
          placeId: "places/good-company",
          types: ["restaurant"],
        }}
      />
    );

    expect(screen.getByRole("link", { name: "View menu" })).toHaveAttribute(
      "href",
      "/spots/$locationId/places/good-company#menu"
    );
    expect(screen.getByRole("link", { name: "Get info" })).toHaveAttribute(
      "href",
      "/spots/$locationId/places/good-company"
    );
    expect(screen.getByText("Be first to share")).toBeInTheDocument();
    expect(screen.queryByText("Maps")).not.toBeInTheDocument();
  });
});
