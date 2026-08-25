import { normalizeConnectionString } from "@chewbuu/db/connection-string";
import { describe, expect, it } from "vitest";

describe("normalizeConnectionString", () => {
  it("removes matching shell quotes from a database URL", () => {
    expect(
      normalizeConnectionString(
        "'postgresql://user:password@db.example.com:6432/postgres'"
      )
    ).toBe("postgresql://user:password@db.example.com:6432/postgres");
  });

  it("trims whitespace without changing an unquoted URL", () => {
    expect(
      normalizeConnectionString("  postgresql://db.example.com:6432/postgres  ")
    ).toBe("postgresql://db.example.com:6432/postgres");
  });

  it("leaves mismatched quotes unchanged", () => {
    expect(
      normalizeConnectionString("'postgresql://db.example.com:6432/postgres\"")
    ).toBe("'postgresql://db.example.com:6432/postgres\"");
  });
});
