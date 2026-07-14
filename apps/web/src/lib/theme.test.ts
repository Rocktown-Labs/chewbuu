import { beforeEach, describe, expect, it, vi } from "vitest";

import { useThemeStore } from "./theme";

describe("useThemeStore", () => {
  const matchMediaMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    matchMediaMock.mockReturnValue({ matches: false });
    window.matchMedia = matchMediaMock as unknown as typeof window.matchMedia;
    useThemeStore.setState({ theme: "system" });
  });

  it("persists and applies the dark theme", () => {
    useThemeStore.getState().setTheme("dark");

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("persists and applies the light theme", () => {
    useThemeStore.getState().setTheme("light");

    expect(useThemeStore.getState().theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("resolves the system theme to dark when the OS prefers dark", () => {
    matchMediaMock.mockReturnValue({ matches: true });

    useThemeStore.getState().setTheme("system");

    expect(useThemeStore.getState().theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("resolves the system theme to light when the OS prefers light", () => {
    matchMediaMock.mockReturnValue({ matches: false });

    useThemeStore.getState().setTheme("system");

    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("rehydrates the theme from localStorage on initTheme", () => {
    localStorage.setItem("theme", "light");

    useThemeStore.getState().initTheme();

    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
