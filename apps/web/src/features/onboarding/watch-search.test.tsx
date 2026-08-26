import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WatchAutocomplete, type WatchSearchResult } from "./watch-search";

function WatchSearchHarness({ kind }: { kind: "person" | "show" }) {
  const [selected, setSelected] = useState<string[]>([]);
  const add = (result: WatchSearchResult) =>
    setSelected((current) =>
      current.includes(result.name) ? current : [...current, result.name]
    );
  return (
    <WatchAutocomplete
      kind={kind}
      label={
        kind === "show" ? "Favorite Shows & TV" : "Favorite Actors & People"
      }
      onAdd={add}
      onRemove={(name) =>
        setSelected((current) => current.filter((value) => value !== name))
      }
      selected={selected}
    />
  );
}

describe("WatchAutocomplete", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("debounces show searches and adds a structured result", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json([
        {
          show: {
            genres: ["Drama", "Crime"],
            id: 169,
            image: { medium: "https://example.com/breaking-bad.jpg" },
            name: "Breaking Bad",
            premiered: "2008-01-20",
            url: "https://www.tvmaze.com/shows/169/breaking-bad",
          },
        },
      ])
    );

    render(<WatchSearchHarness kind="show" />);
    await user.type(screen.getByRole("textbox"), "breaking bad");

    const result = await screen.findByRole("option", { name: /breaking bad/i });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    await user.click(result);
    expect(screen.getByText("Breaking Bad")).toBeVisible();
  });

  it("debounces people searches independently", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json([
        {
          person: {
            country: { name: "Chile" },
            id: 1123,
            image: { medium: "https://example.com/pedro.jpg" },
            name: "Pedro Pascal",
            url: "https://www.tvmaze.com/people/1123/pedro-pascal",
          },
        },
      ])
    );

    render(<WatchSearchHarness kind="person" />);
    await user.type(screen.getByRole("textbox"), "pedro pascal");

    expect(
      await screen.findByRole("option", { name: /pedro pascal/i })
    ).toBeVisible();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("search/people"),
      expect.any(Object)
    );
  });

  it("allows broad preferences to be added manually when there is no result", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));

    render(<WatchSearchHarness kind="show" />);
    await user.type(screen.getByRole("textbox"), "wrestling");
    await user.click(
      await screen.findByRole("button", { name: /add.*manually/i })
    );

    expect(screen.getByText("wrestling")).toBeVisible();
  });
});
