import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DatingProfilePayload } from "@/lib/dating-api";

interface OnboardingState {
  step: number;
  profile: Partial<DatingProfilePayload>;
  setStep: (step: number) => void;
  setProfile: (profile: Partial<DatingProfilePayload>) => void;
  clear: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      step: 0,
      profile: {},
      setStep: (step) => set({ step }),
      setProfile: (profile) =>
        set((state) => ({ profile: { ...state.profile, ...profile } })),
      clear: () => set({ step: 0, profile: {} }),
    }),
    {
      name: "chewbuu-onboarding-store-v2",
    }
  )
);
