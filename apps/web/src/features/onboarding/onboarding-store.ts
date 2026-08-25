import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DatingProfilePayload } from "@/lib/dating-api";
import { onboardingDraftCollection, upsertOnboardingDraft } from "@/lib/db";

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
      setStep: (step) => {
        set({ step });
        upsertOnboardingDraft({
          id: "current",
          step,
        });
      },
      setProfile: (profile) =>
        set((state) => {
          const merged = { ...state.profile, ...profile };
          upsertOnboardingDraft({
            id: "current",
            step: state.step,
            name: merged.name ?? "",
            birthday: merged.birthday ?? "",
            gender: merged.sex ?? "",
            area: merged.area ?? "",
            headline: merged.favoriteThings?.[0] ?? "",
            bio: merged.bio ?? "",
            occupation: merged.occupation ?? "",
            intent: merged.lookingFor?.[0] ?? "dating",
            interests: merged.interests ?? [],
            photos:
              merged.media
                ?.filter(
                  (m) => m.kind === "profile_photo" || m.kind === "photo"
                )
                .map((m) => m.url) ?? [],
            videos:
              merged.media
                ?.filter((m) => m.kind === "intro_video")
                .map((m) => m.url) ?? [],
          });
          return { profile: merged };
        }),
      clear: () => {
        set({ step: 0, profile: {} });
        if (onboardingDraftCollection.get("current")) {
          onboardingDraftCollection.delete("current");
        }
      },
    }),
    {
      name: "chewbuu-onboarding-store-v2",
    }
  )
);
