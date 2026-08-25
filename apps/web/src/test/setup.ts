import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const createStorage = (): Storage => {
  const values = new Map<string, string>();

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: createStorage(),
});

Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: createStorage(),
});

afterEach(() => {
  cleanup();
});
