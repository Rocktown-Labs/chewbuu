/**
 * Haptic feedback utility wrapper for mobile devices.
 * Uses navigator.vibrate when supported and safely falls back in unsupported environments.
 */

export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | number
  | number[];

const PRESET_PATTERNS: Record<string, number | number[]> = {
  error: [100, 50, 100, 50, 150],
  heavy: 200,
  light: 50,
  medium: 100,
  success: [100, 50, 100],
  warning: [150, 50, 100],
};

export const isHapticsSupported = (): boolean => {
  return (
    typeof navigator !== "undefined" &&
    "vibrate" in navigator &&
    typeof navigator.vibrate === "function"
  );
};

export const triggerHaptic = (pattern: HapticPattern = "medium"): boolean => {
  if (!isHapticsSupported()) {
    return false;
  }

  try {
    const resolvedPattern =
      typeof pattern === "string" ? (PRESET_PATTERNS[pattern] ?? 100) : pattern;
    return navigator.vibrate(resolvedPattern);
  } catch {
    return false;
  }
};
