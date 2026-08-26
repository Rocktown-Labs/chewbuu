import { describe, expect, it } from "vitest";

import { isReservedBrandHandle } from "./brand-handles";

describe("Chewbuu branded handles", () => {
  it("reserves the Chewbuu user and Sync brand handles", () => {
    expect(isReservedBrandHandle("@chewbuu")).toBe(true);
    expect(isReservedBrandHandle("chewbuusync")).toBe(true);
  });

  it("does not reserve ordinary community handles", () => {
    expect(isReservedBrandHandle("southern-foodies")).toBe(false);
  });
});
