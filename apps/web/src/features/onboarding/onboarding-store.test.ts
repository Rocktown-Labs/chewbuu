import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { useOnboardingStore } from "./onboarding-store";

describe("useOnboardingStore", () => {
  beforeEach(() => {
    act(() => {
      useOnboardingStore.getState().clear();
    });
  });

  it("should initialize with default state", () => {
    const state = useOnboardingStore.getState();
    expect(state.step).toBe(0);
    expect(state.profile).toEqual({});
  });

  it("should update the step correctly", () => {
    act(() => {
      useOnboardingStore.getState().setStep(2);
    });
    const state = useOnboardingStore.getState();
    expect(state.step).toBe(2);
  });

  it("should update the profile partial state correctly", () => {
    act(() => {
      useOnboardingStore.getState().setProfile({
        name: "Test User",
        area: "Searcy, AR",
      });
    });

    let state = useOnboardingStore.getState();
    expect(state.profile.name).toBe("Test User");
    expect(state.profile.area).toBe("Searcy, AR");

    act(() => {
      useOnboardingStore.getState().setProfile({
        occupation: "Engineer",
      });
    });

    state = useOnboardingStore.getState();
    expect(state.profile.name).toBe("Test User");
    expect(state.profile.area).toBe("Searcy, AR");
    expect(state.profile.occupation).toBe("Engineer");
  });

  it("should clear the store back to defaults", () => {
    act(() => {
      useOnboardingStore.getState().setStep(3);
      useOnboardingStore.getState().setProfile({
        name: "Test User",
      });
    });

    let state = useOnboardingStore.getState();
    expect(state.step).toBe(3);
    expect(state.profile.name).toBe("Test User");

    act(() => {
      useOnboardingStore.getState().clear();
    });

    state = useOnboardingStore.getState();
    expect(state.step).toBe(0);
    expect(state.profile).toEqual({});
  });
});
