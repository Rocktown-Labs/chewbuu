import {
  TextDecoderStream as StardazedTextDecoderStream,
  TextEncoderStream as StardazedTextEncoderStream,
} from "@stardazed/streams-text-encoding";
// @ts-expect-error - no types for @ungap/structured-clone
import structuredClonePolyfill from "@ungap/structured-clone";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) return array;
  if (typeof Crypto.getRandomValues === "function") {
    Crypto.getRandomValues(
      array as unknown as Parameters<typeof Crypto.getRandomValues>[0]
    );
    return array;
  }
  return array;
}

function randomUUID(): string {
  if (typeof Crypto.randomUUID === "function") {
    return Crypto.randomUUID();
  }
  throw new Error("crypto.randomUUID is not available");
}

const g =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof global !== "undefined"
      ? global
      : typeof window !== "undefined"
        ? window
        : ({} as typeof globalThis);

// Polyfill crypto synchronously
if (typeof g.crypto !== "object" || g.crypto === null) {
  (g as unknown as { crypto: unknown }).crypto = {};
}

if (typeof g.crypto.getRandomValues !== "function") {
  (g.crypto as unknown as { getRandomValues: unknown }).getRandomValues =
    getRandomValues;
}

if (typeof g.crypto.randomUUID !== "function") {
  (g.crypto as unknown as { randomUUID: unknown }).randomUUID = randomUUID;
}

if (typeof global !== "undefined" && (global as unknown) !== g) {
  if (
    typeof (global as unknown as { crypto: unknown }).crypto !== "object" ||
    (global as unknown as { crypto: unknown }).crypto === null
  ) {
    (global as unknown as { crypto: unknown }).crypto = g.crypto;
  } else {
    if (
      typeof (global as unknown as { crypto: { getRandomValues?: unknown } })
        .crypto.getRandomValues !== "function"
    ) {
      (
        global as unknown as { crypto: { getRandomValues: unknown } }
      ).crypto.getRandomValues = getRandomValues;
    }
    if (
      typeof (global as unknown as { crypto: { randomUUID?: unknown } }).crypto
        .randomUUID !== "function"
    ) {
      (
        global as unknown as { crypto: { randomUUID: unknown } }
      ).crypto.randomUUID = randomUUID;
    }
  }
}

// Polyfill structuredClone synchronously
if (typeof g.structuredClone !== "function") {
  (g as unknown as { structuredClone: unknown }).structuredClone =
    structuredClonePolyfill;
}
if (
  typeof global !== "undefined" &&
  typeof (global as unknown as { structuredClone?: unknown })
    .structuredClone !== "function"
) {
  (global as unknown as { structuredClone: unknown }).structuredClone =
    structuredClonePolyfill;
}

// Polyfill Streams
if (Platform.OS !== "web") {
  if (typeof g.TextEncoderStream !== "function") {
    (g as unknown as { TextEncoderStream: unknown }).TextEncoderStream =
      StardazedTextEncoderStream;
  }
  if (
    typeof global !== "undefined" &&
    typeof (global as unknown as { TextEncoderStream?: unknown })
      .TextEncoderStream !== "function"
  ) {
    (global as unknown as { TextEncoderStream: unknown }).TextEncoderStream =
      StardazedTextEncoderStream;
  }

  if (typeof g.TextDecoderStream !== "function") {
    (g as unknown as { TextDecoderStream: unknown }).TextDecoderStream =
      StardazedTextDecoderStream;
  }
  if (
    typeof global !== "undefined" &&
    typeof (global as unknown as { TextDecoderStream?: unknown })
      .TextDecoderStream !== "function"
  ) {
    (global as unknown as { TextDecoderStream: unknown }).TextDecoderStream =
      StardazedTextDecoderStream;
  }
}
