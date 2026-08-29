import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Sync Operations Daily Code & Kiosk Attendance", () => {
  const computeDailyCode = (
    locationId: string,
    date: Date,
    secret = "test-secret"
  ) => {
    const dateKey = date.toISOString().slice(0, 10);
    const digest = createHmac("sha256", secret)
      .update(`${locationId}:${dateKey}`)
      .digest("hex");
    return String(Number.parseInt(digest.slice(0, 8), 16) % 1000).padStart(
      3,
      "0"
    );
  };

  const clockInSchema = z.object({
    code: z.string().regex(/^\d{3,6}$/),
    latitude: z.number().min(-90).max(90).optional(),
    locationId: z.string().min(1),
    longitude: z.number().min(-180).max(180).optional(),
    shiftId: z.string().min(1),
    targetUserId: z.string().min(1).optional(),
  });

  it("generates a memorable 3-digit daily code", () => {
    const code = computeDailyCode("loc-123", new Date("2026-08-27T12:00:00Z"));
    expect(code).toHaveLength(3);
    expect(/^\d{3}$/.test(code)).toBe(true);
  });

  it("produces deterministic 3-digit codes for the same location and date", () => {
    const dateA = new Date("2026-08-27T08:00:00Z");
    const dateB = new Date("2026-08-27T23:59:59Z");
    const codeA = computeDailyCode("venue-arkansas", dateA);
    const codeB = computeDailyCode("venue-arkansas", dateB);
    expect(codeA).toBe(codeB);
  });

  it("produces different codes for different locations on the same date", () => {
    const date = new Date("2026-08-27T12:00:00Z");
    const code1 = computeDailyCode("venue-1", date);
    const code2 = computeDailyCode("venue-2", date);
    expect(code1).not.toBe(code2);
  });

  it("validates clock-in input with 3-digit code and optional targetUserId for tablet kiosk", () => {
    const directInput = clockInSchema.parse({
      code: "258",
      locationId: "loc-1",
      shiftId: "shift-1",
    });
    expect(directInput.code).toBe("258");
    expect(directInput.targetUserId).toBeUndefined();

    const kioskInput = clockInSchema.parse({
      code: "101",
      locationId: "loc-1",
      shiftId: "shift-1",
      targetUserId: "staff-sans-phone-42",
    });
    expect(kioskInput.code).toBe("101");
    expect(kioskInput.targetUserId).toBe("staff-sans-phone-42");
  });

  it("rejects non-digit or invalid length codes", () => {
    expect(() =>
      clockInSchema.parse({
        code: "ab",
        locationId: "loc-1",
        shiftId: "shift-1",
      })
    ).toThrow();

    expect(() =>
      clockInSchema.parse({
        code: "1234567",
        locationId: "loc-1",
        shiftId: "shift-1",
      })
    ).toThrow();
  });
});
