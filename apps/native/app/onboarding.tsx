import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Camera,
  CheckCircle2,
  Compass,
  Film,
  Flame,
  Heart,
  Info,
  MapPin,
  Mic,
  Plus,
  ShieldCheck,
  Sparkles,
  Tv,
  Users,
  Video,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassView } from "@/components/ui/glass-view";
import { Input } from "@/components/ui/input";
import { useAppTheme } from "@/contexts/app-theme-context";
import {
  calculateCompletionPercentage,
  DEFAULT_ONBOARDING_DATA,
  loadOnboardingDraft,
  type OnboardingData,
  saveOnboardingDraft,
} from "@/lib/onboarding-storage";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Permissions" },
  { id: 3, label: "Media" },
  { id: 4, label: "Preferences" },
  { id: 5, label: "Interests" },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [activeInterestCat, setActiveInterestCat] = useState<
    "eat" | "drink" | "play" | "move" | "watch" | "talk"
  >("eat");
  const [newTagInput, setNewTagInput] = useState("");

  useEffect(() => {
    async function init() {
      const draft = await loadOnboardingDraft();
      setData(draft);
      setCurrentStep(draft.step || 1);
      setLoading(false);
    }
    void init();
  }, []);

  const handleUpdate = (updater: (prev: OnboardingData) => OnboardingData) => {
    setData((prev) => {
      const next = updater(prev);
      void saveOnboardingDraft(next);
      return next;
    });
  };

  const handleSaveForLater = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    await saveOnboardingDraft({
      ...data,
      step: currentStep,
      isComplete: false,
    });
    setSaving(false);
    // Skip to main tabs
    router.replace("/(drawer)/(tabs)");
  };

  const handleNextStep = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentStep < STEPS.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await saveOnboardingDraft({ ...data, step: nextStep });
    } else {
      // Final submit
      setSaving(true);
      await saveOnboardingDraft({ ...data, isComplete: true });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaving(false);
      router.replace("/(drawer)/(tabs)");
    }
  };

  const handlePrevStep = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const progressPercent = calculateCompletionPercentage(data);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Top App Bar with Step Stepper & Save for Later */}
      <View
        className="px-5 pb-3 pt-2 flex-col gap-3 border-b border-border/40"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            {currentStep > 1 ? (
              <Pressable
                onPress={handlePrevStep}
                className="size-8 rounded-full bg-card border border-border/80 items-center justify-center active:scale-95"
              >
                <ArrowLeft size={16} color={isDark ? "#ffffff" : "#000000"} />
              </Pressable>
            ) : (
              <View className="size-8 rounded-full bg-amber-500/20 border border-amber-400/40 items-center justify-center">
                <Flame size={16} color="#f59e0b" />
              </View>
            )}
            <Text className="text-base font-extrabold text-foreground tracking-tight">
              Chewbuu Profile Setup
            </Text>
          </View>

          {/* Explicit Save for Later Skip CTA */}
          <Button
            size="sm"
            variant="glass"
            className="h-8 px-3 gap-1.5"
            onPress={handleSaveForLater}
            disabled={saving}
          >
            <Bookmark size={13} color="#f59e0b" />
            <Text className="text-xs font-bold text-amber-400">
              Save for Later
            </Text>
          </Button>
        </View>

        {/* Step Progression Pills */}
        <View className="flex-row items-center justify-between gap-1.5 pt-1">
          {STEPS.map((step) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <Pressable
                key={step.id}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCurrentStep(step.id);
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-full items-center justify-center border transition-all",
                  isCurrent
                    ? "bg-amber-500/20 border-amber-400 shadow-xs"
                    : isCompleted
                      ? "bg-emerald-500/15 border-emerald-500/40"
                      : "bg-card/40 border-border/60"
                )}
              >
                <Text
                  className={cn(
                    "text-[10px] font-bold",
                    isCurrent
                      ? "text-amber-400"
                      : isCompleted
                        ? "text-emerald-400"
                        : "text-muted-foreground"
                  )}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <View className="flex-col gap-4">
            <View className="flex-col gap-1">
              <Text className="text-xl font-extrabold text-foreground">
                Tell us about you
              </Text>
              <Text className="text-xs text-muted-foreground">
                Your first name, age, and neighborhood will be visible on your
                date cards.
              </Text>
            </View>

            <Card className="p-4 flex-col gap-4 border-border/80">
              <View className="flex-col gap-1.5">
                <Text className="text-xs font-bold text-foreground">
                  First Name
                </Text>
                <Input
                  placeholder="e.g. Elena"
                  value={data.basics.name}
                  onChangeText={(name) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      basics: { ...prev.basics, name },
                    }))
                  }
                />
              </View>

              <View className="flex-col gap-1.5">
                <Text className="text-xs font-bold text-foreground">
                  Username / Handle
                </Text>
                <Input
                  placeholder="@elena.r"
                  value={data.basics.handle}
                  onChangeText={(handle) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      basics: { ...prev.basics, handle },
                    }))
                  }
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 flex-col gap-1.5">
                  <Text className="text-xs font-bold text-foreground">Age</Text>
                  <Input
                    keyboardType="number-pad"
                    placeholder="26"
                    value={data.basics.age.toString()}
                    onChangeText={(text) => {
                      const age = Math.trunc(Number(text)) || 18;
                      handleUpdate((prev) => ({
                        ...prev,
                        basics: { ...prev.basics, age },
                      }));
                    }}
                  />
                </View>

                <View className="flex-1 flex-col gap-1.5">
                  <Text className="text-xs font-bold text-foreground">
                    Gender
                  </Text>
                  <Input
                    placeholder="Woman"
                    value={data.basics.gender}
                    onChangeText={(gender) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        basics: { ...prev.basics, gender },
                      }))
                    }
                  />
                </View>
              </View>

              <View className="flex-col gap-1.5">
                <Text className="text-xs font-bold text-foreground">
                  City / Neighborhood
                </Text>
                <Input
                  placeholder="Washington, DC • Dupont Circle"
                  value={data.basics.city}
                  onChangeText={(city) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      basics: { ...prev.basics, city },
                    }))
                  }
                  startIcon={<MapPin size={15} color="#888888" />}
                />
              </View>

              <View className="flex-col gap-1.5">
                <Text className="text-xs font-bold text-foreground">
                  One-Line Date Vibe (Bio)
                </Text>
                <Input
                  placeholder="Video first, real dinner dates second. Speakeasies & late-night ramen."
                  value={data.basics.bio}
                  onChangeText={(bio) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      basics: { ...prev.basics, bio },
                    }))
                  }
                  multiline
                  className="h-20 py-2"
                />
              </View>
            </Card>
          </View>
        )}

        {/* Step 2: Permissions */}
        {currentStep === 2 && (
          <View className="flex-col gap-4">
            <View className="flex-col gap-1">
              <Text className="text-xl font-extrabold text-foreground">
                Device Permissions & Safety Alerts
              </Text>
              <Text className="text-xs text-muted-foreground">
                Chewbuu uses live verification, background safety beacons, and
                push alerts.
              </Text>
            </View>

            <View className="flex-col gap-3">
              {/* Camera & Mic */}
              <Card className="p-4 flex-row items-center justify-between border-border/80">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View className="size-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 items-center justify-center">
                    <Camera size={18} color="#f59e0b" />
                  </View>
                  <View className="flex-col">
                    <Text className="text-sm font-bold text-foreground">
                      Camera & Live Capture
                    </Text>
                    <Text className="text-[11px] text-muted-foreground">
                      Required for 60s intro and selfie verification
                    </Text>
                  </View>
                </View>

                <Button
                  size="sm"
                  variant={data.permissions.camera ? "success" : "outline"}
                  className="h-8 px-3"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleUpdate((prev) => ({
                      ...prev,
                      permissions: {
                        ...prev.permissions,
                        camera: !prev.permissions.camera,
                        microphone: !prev.permissions.camera,
                      },
                    }));
                  }}
                >
                  <Text className="text-xs font-bold">
                    {data.permissions.camera ? "Enabled" : "Allow"}
                  </Text>
                </Button>
              </Card>

              {/* Location & GPS Radar */}
              <Card className="p-4 flex-row items-center justify-between border-border/80">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View className="size-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 items-center justify-center">
                    <MapPin size={18} color="#10b981" />
                  </View>
                  <View className="flex-col">
                    <Text className="text-sm font-bold text-foreground">
                      Location & Spot Radar
                    </Text>
                    <Text className="text-[11px] text-muted-foreground">
                      Find date spots and match with singles nearby
                    </Text>
                  </View>
                </View>

                <Button
                  size="sm"
                  variant={data.permissions.location ? "success" : "outline"}
                  className="h-8 px-3"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleUpdate((prev) => ({
                      ...prev,
                      permissions: {
                        ...prev.permissions,
                        location: !prev.permissions.location,
                      },
                    }));
                  }}
                >
                  <Text className="text-xs font-bold">
                    {data.permissions.location ? "Enabled" : "Allow"}
                  </Text>
                </Button>
              </Card>

              {/* Safety Beacon & Push Alerts */}
              <Card className="p-4 flex-row items-center justify-between border-border/80">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View className="size-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 items-center justify-center">
                    <ShieldCheck size={18} color="#f59e0b" />
                  </View>
                  <View className="flex-col">
                    <Text className="text-sm font-bold text-foreground">
                      Push & Safety Beacon Alerts
                    </Text>
                    <Text className="text-[11px] text-muted-foreground">
                      Receive real-time match invites and date check-in
                      notifications
                    </Text>
                  </View>
                </View>

                <Button
                  size="sm"
                  variant={data.permissions.push ? "success" : "outline"}
                  className="h-8 px-3"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleUpdate((prev) => ({
                      ...prev,
                      permissions: {
                        ...prev.permissions,
                        push: !prev.permissions.push,
                      },
                    }));
                  }}
                >
                  <Text className="text-xs font-bold">
                    {data.permissions.push ? "Enabled" : "Allow"}
                  </Text>
                </Button>
              </Card>
            </View>
          </View>
        )}

        {/* Step 3: Media Verification */}
        {currentStep === 3 && (
          <View className="flex-col gap-4">
            <View className="flex-col gap-1">
              <Text className="text-xl font-extrabold text-foreground">
                Media & Video Verification
              </Text>
              <Text className="text-xs text-muted-foreground">
                Chewbuu profiles require live selfie verification and an
                optional 60s intro video.
              </Text>
            </View>

            {/* Selfie Verification Card */}
            <Card className="p-4 border-border/80 flex-col gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Camera size={16} color="#f59e0b" />
                  <Text className="text-sm font-bold text-foreground">
                    Live Selfie Check
                  </Text>
                </View>
                {data.media.selfieVerified ? (
                  <Badge variant="success" className="px-2.5 py-0.5">
                    <Text className="text-[10px] font-bold text-emerald-400">
                      Verified
                    </Text>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="px-2 py-0.5">
                    <Text className="text-[10px] text-muted-foreground">
                      Pending
                    </Text>
                  </Badge>
                )}
              </View>

              <Text className="text-xs text-muted-foreground">
                Take a quick live photo to unlock the verified checkmark on your
                profile.
              </Text>

              <Button
                variant={data.media.selfieVerified ? "outline" : "sugar"}
                size="sm"
                className="gap-1.5"
                onPress={() => {
                  void Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  handleUpdate((prev) => ({
                    ...prev,
                    media: { ...prev.media, selfieVerified: true },
                  }));
                }}
              >
                <Camera
                  size={14}
                  color={data.media.selfieVerified ? "#ffffff" : "#000000"}
                />
                <Text
                  className={cn(
                    "text-xs font-bold",
                    data.media.selfieVerified ? "text-foreground" : "text-black"
                  )}
                >
                  {data.media.selfieVerified
                    ? "Retake Verification Selfie"
                    : "Capture Verification Selfie"}
                </Text>
              </Button>
            </Card>

            {/* 60s Video Intro */}
            <Card className="p-4 border-border/80 flex-col gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Video size={16} color="#f59e0b" />
                  <Text className="text-sm font-bold text-foreground">
                    60-Second Video Intro
                  </Text>
                </View>
                <Badge variant="sugar" className="px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-amber-300">
                    Boosts Matches 3x
                  </Text>
                </Badge>
              </View>

              <Text className="text-xs text-muted-foreground">
                Record a short clip introducing yourself, your favorite date
                spot, or humor.
              </Text>

              <Button
                variant="glass"
                size="sm"
                className="gap-1.5"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleUpdate((prev) => ({
                    ...prev,
                    media: {
                      ...prev.media,
                      videoIntroDurationSeconds: 45,
                      videoIntroUrl: "mock://intro.mp4",
                    },
                  }));
                }}
              >
                <Video size={14} color="#f59e0b" />
                <Text className="text-xs font-bold text-amber-400">
                  {data.media.videoIntroDurationSeconds > 0
                    ? "Recorded (45s Video Intro)"
                    : "Record 60s Video Intro"}
                </Text>
              </Button>
            </Card>
          </View>
        )}

        {/* Step 4: Preferences */}
        {currentStep === 4 && (
          <View className="flex-col gap-4">
            <View className="flex-col gap-1">
              <Text className="text-xl font-extrabold text-foreground">
                Dating Preferences
              </Text>
              <Text className="text-xs text-muted-foreground">
                Filter who you want to meet for dinner dates, cocktails, and
                activities.
              </Text>
            </View>

            <Card className="p-4 flex-col gap-4 border-border/80">
              <View className="flex-col gap-2">
                <Text className="text-xs font-bold text-foreground">
                  I'm Interested In
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {["Men", "Women", "Non-binary", "Everyone"].map((opt) => {
                    const isSelected =
                      data.preferences.interestedIn.includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => {
                          void Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          handleUpdate((prev) => {
                            const list = prev.preferences.interestedIn.includes(
                              opt
                            )
                              ? prev.preferences.interestedIn.filter(
                                  (i) => i !== opt
                                )
                              : [...prev.preferences.interestedIn, opt];
                            return {
                              ...prev,
                              preferences: {
                                ...prev.preferences,
                                interestedIn: list.length > 0 ? list : [opt],
                              },
                            };
                          });
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full border transition-all",
                          isSelected
                            ? "bg-amber-500 border-amber-400"
                            : "bg-card border-border/80"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-xs font-bold",
                            isSelected ? "text-black" : "text-muted-foreground"
                          )}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="flex-row gap-3 pt-2 border-t border-border/40">
                <View className="flex-1 flex-col gap-1.5">
                  <Text className="text-xs font-bold text-foreground">
                    Min Age: {data.preferences.minAge}
                  </Text>
                  <Input
                    keyboardType="number-pad"
                    value={data.preferences.minAge.toString()}
                    onChangeText={(text) => {
                      const minAge = Math.trunc(Number(text)) || 18;
                      handleUpdate((prev) => ({
                        ...prev,
                        preferences: { ...prev.preferences, minAge },
                      }));
                    }}
                  />
                </View>

                <View className="flex-1 flex-col gap-1.5">
                  <Text className="text-xs font-bold text-foreground">
                    Max Age: {data.preferences.maxAge}
                  </Text>
                  <Input
                    keyboardType="number-pad"
                    value={data.preferences.maxAge.toString()}
                    onChangeText={(text) => {
                      const maxAge = Math.trunc(Number(text)) || 40;
                      handleUpdate((prev) => ({
                        ...prev,
                        preferences: { ...prev.preferences, maxAge },
                      }));
                    }}
                  />
                </View>
              </View>

              <View className="flex-col gap-1.5 pt-2 border-t border-border/40">
                <Text className="text-xs font-bold text-foreground">
                  Max Distance: {data.preferences.maxDistanceMiles} miles
                </Text>
                <Input
                  keyboardType="number-pad"
                  placeholder="25"
                  value={data.preferences.maxDistanceMiles.toString()}
                  onChangeText={(text) => {
                    const maxDistanceMiles = Math.trunc(Number(text)) || 10;
                    handleUpdate((prev) => ({
                      ...prev,
                      preferences: { ...prev.preferences, maxDistanceMiles },
                    }));
                  }}
                  endIcon={
                    <Text className="text-xs font-semibold text-muted-foreground">
                      miles
                    </Text>
                  }
                />
              </View>
            </Card>
          </View>
        )}

        {/* Step 5: Interests & Category Spots */}
        {currentStep === 5 && (
          <View className="flex-col gap-4">
            <View className="flex-col gap-1">
              <Text className="text-xl font-extrabold text-foreground">
                Favorite Spots & Interests
              </Text>
              <Text className="text-xs text-muted-foreground">
                We'll match you with singles who love the same places and
                activities.
              </Text>
            </View>

            {/* Category Selector Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                { key: "eat", label: "Eat 🍜" },
                { key: "drink", label: "Drink 🍸" },
                { key: "play", label: "Play 🎯" },
                { key: "move", label: "Move 🧗" },
                { key: "watch", label: "Watch 🎬" },
                { key: "talk", label: "Talk 🎙️" },
              ].map((cat) => {
                const isSelected = activeInterestCat === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      );
                      setActiveInterestCat(cat.key as any);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full border transition-all",
                      isSelected
                        ? "bg-amber-500 border-amber-400"
                        : "bg-card border-border/80"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-bold",
                        isSelected ? "text-black" : "text-muted-foreground"
                      )}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Category Items List & Add Input */}
            <Card className="p-4 flex-col gap-3 border-border/80">
              <Text className="text-xs font-bold text-foreground">
                Saved {activeInterestCat.toUpperCase()} Favorites
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {(activeInterestCat === "eat"
                  ? data.interests.eatSpots
                  : activeInterestCat === "drink"
                    ? data.interests.drinkSpots
                    : activeInterestCat === "play"
                      ? data.interests.playActivities
                      : activeInterestCat === "move"
                        ? data.interests.moveActivities
                        : activeInterestCat === "watch"
                          ? data.interests.watchFavorites
                          : data.interests.talkTopics
                ).map((item) => (
                  <Badge
                    key={item}
                    variant="sugar"
                    className="px-3 py-1 flex-row items-center gap-1.5"
                  >
                    <Text className="text-xs font-bold text-amber-300">
                      {item}
                    </Text>
                    <Pressable
                      onPress={() => {
                        void Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light
                        );
                        handleUpdate((prev) => {
                          const field =
                            activeInterestCat === "eat"
                              ? "eatSpots"
                              : activeInterestCat === "drink"
                                ? "drinkSpots"
                                : activeInterestCat === "play"
                                  ? "playActivities"
                                  : activeInterestCat === "move"
                                    ? "moveActivities"
                                    : activeInterestCat === "watch"
                                      ? "watchFavorites"
                                      : "talkTopics";
                          return {
                            ...prev,
                            interests: {
                              ...prev.interests,
                              [field]: prev.interests[field].filter(
                                (i) => i !== item
                              ),
                            },
                          };
                        });
                      }}
                    >
                      <X size={12} color="#f59e0b" />
                    </Pressable>
                  </Badge>
                ))}
              </View>

              {/* Add New Custom Spot/Interest Input */}
              <View className="flex-row gap-2 mt-2">
                <Input
                  placeholder={`Add a favorite ${activeInterestCat} spot...`}
                  value={newTagInput}
                  onChangeText={setNewTagInput}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="sugar"
                  className="h-12 px-4 gap-1"
                  onPress={() => {
                    if (!newTagInput.trim()) return;
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleUpdate((prev) => {
                      const field =
                        activeInterestCat === "eat"
                          ? "eatSpots"
                          : activeInterestCat === "drink"
                            ? "drinkSpots"
                            : activeInterestCat === "play"
                              ? "playActivities"
                              : activeInterestCat === "move"
                                ? "moveActivities"
                                : activeInterestCat === "watch"
                                  ? "watchFavorites"
                                  : "talkTopics";
                      return {
                        ...prev,
                        interests: {
                          ...prev.interests,
                          [field]: [
                            ...prev.interests[field],
                            newTagInput.trim(),
                          ],
                        },
                      };
                    });
                    setNewTagInput("");
                  }}
                >
                  <Plus size={14} color="#000000" />
                  <Text className="text-xs font-bold text-black">Add</Text>
                </Button>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        className="absolute bottom-0 inset-x-0 bg-background/95 border-t border-border/40 px-5 py-4 flex-row items-center justify-between shadow-2xl"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 6 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onPress={handleSaveForLater}
          className="gap-1.5"
        >
          <Bookmark size={14} color="#888888" />
          <Text className="text-xs font-semibold text-muted-foreground">
            Skip & Save Draft
          </Text>
        </Button>

        <Button
          variant="sugar"
          className="px-6 h-12 gap-2 shadow-lg"
          onPress={handleNextStep}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <Text className="text-sm font-black text-black">
                {currentStep === STEPS.length
                  ? "Complete & Start Dating"
                  : "Continue"}
              </Text>
              <ArrowRight size={16} color="#000000" />
            </>
          )}
        </Button>
      </View>
    </View>
  );
}
