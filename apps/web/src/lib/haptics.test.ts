import { describe, expect, it, vi } from "vitest";

import { isHapticsSupported, triggerHaptic } from "./haptics";
import { isPushSupported, urlBase64ToUint8Array } from "./push-notifications";

describe("haptics utility", () => {
  it("detects whether vibration is supported", () => {
    const supported = isHapticsSupported();
    expect(typeof supported).toBe("boolean");
  });

  it("calls navigator.vibrate with preset patterns when supported", () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis.navigator, "vibrate", {
      configurable: true,
      value: vibrateMock,
      writable: true,
    });

    const result = triggerHaptic("success");
    expect(result).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith([100, 50, 100]);
  });

  it("gracefully falls back when navigator.vibrate is not available", () => {
    Object.defineProperty(globalThis.navigator, "vibrate", {
      configurable: true,
      value: undefined,
      writable: true,
    });

    const result = triggerHaptic("medium");
    expect(result).toBe(false);
  });
});

describe("push-notifications utility", () => {
  it("converts base64 VAPID keys to Uint8Array correctly", () => {
    const base64Key =
      "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1Xbjhazdg";
    const uint8Array = urlBase64ToUint8Array(base64Key);
    expect(uint8Array).toBeInstanceOf(Uint8Array);
    expect(uint8Array.length).toBeGreaterThan(0);
  });

  it("checks push support in the environment", () => {
    const supported = isPushSupported();
    expect(typeof supported).toBe("boolean");
  });
});
