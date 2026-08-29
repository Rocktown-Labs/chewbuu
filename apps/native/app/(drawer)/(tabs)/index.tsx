import { useLiveQuery } from "@tanstack/react-db";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassView } from "@/components/ui/glass-view";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { getUpcomingRequests } from "@/lib/dating-utils";
import {
  dateRequestsCollection,
  recapsCollection,
  refreshDatingData,
} from "@/lib/db/collections";
import {
  calculateCompletionPercentage,
  DEFAULT_ONBOARDING_DATA,
  loadOnboardingDraft,
  type OnboardingData,
} from "@/lib/onboarding-storage";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingData>(
    DEFAULT_ONBOARDING_DATA
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    data: requests,
    isError,
    isLoading,
  } = useLiveQuery({
    query: (q) =>
      session?.user
        ? q
            .from({ request: dateRequestsCollection })
            .orderBy(({ request }) => request.scheduledAt, "asc")
        : undefined,
  });
  const { data: recaps } = useLiveQuery({
    query: (q) =>
      session?.user
        ? q
            .from({ recap: recapsCollection })
            .orderBy(({ recap }) => recap.createdAt, "desc")
            .limit(1)
        : undefined,
  });

  useEffect(() => {
    const loadDraft = async () => {
      const draft = await loadOnboardingDraft();
      setOnboardingDraft(draft);
    };
    void loadDraft();
  }, []);

  const upcomingRequests = useMemo(
    () => getUpcomingRequests(requests ?? []).slice(0, 3),
    [requests]
  );
  const completionPercent = calculateCompletionPercentage(onboardingDraft);
  const latestRecap = recaps?.[0];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDatingData();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-5 pb-3 pt-2"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20">
            <Sparkles size={16} color="#f59e0b" />
          </View>
          <Text className="text-xl font-extrabold tracking-tight text-foreground">
            Home
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh dating data"
          className="rounded-full p-2 active:bg-muted"
          disabled={isRefreshing}
          onPress={() => void handleRefresh()}
        >
          <RefreshCw color={isDark ? "#f4f4f5" : "#3f3f46"} size={18} />
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{
          paddingBottom: 110,
          paddingHorizontal: 16,
        }}
        data={upcomingRequests}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isSessionPending ? (
            <Card className="mb-4 p-4">
              <Text className="text-sm text-muted-foreground">
                Checking your account…
              </Text>
            </Card>
          ) : !session?.user ? (
            <Card className="mb-4 p-4">
              <Text className="text-sm font-semibold text-foreground">
                Sign in to see your dates.
              </Text>
              <Button
                className="mt-3 h-9 self-start px-3"
                onPress={() => router.push("/auth/login")}
                size="sm"
                variant="sugar"
              >
                <Text className="text-xs font-bold text-black">Sign in</Text>
              </Button>
            </Card>
          ) : isLoading ? (
            <Card className="mb-4 p-4">
              <Text className="text-sm text-muted-foreground">
                Loading your dates…
              </Text>
            </Card>
          ) : isError ? (
            <Card className="mb-4 border-red-500/40 p-4">
              <Text className="text-sm font-semibold text-red-400">
                We couldn&apos;t load your dates.
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Check your connection and try again.
              </Text>
              <Button
                className="mt-3 h-9 self-start px-3"
                onPress={() => void handleRefresh()}
                size="sm"
                variant="outline"
              >
                <Text className="text-xs font-semibold text-foreground">
                  Retry
                </Text>
              </Button>
            </Card>
          ) : (
            <Card className="mb-4 p-4">
              <Text className="text-sm font-semibold text-foreground">
                No upcoming dates yet.
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Plan a date and Chewbuu will keep the itinerary here.
              </Text>
              <Button
                className="mt-3 h-9 self-start px-3"
                onPress={() => router.push("/date/new")}
                size="sm"
                variant="sugar"
              >
                <Text className="text-xs font-bold text-black">
                  Plan a date
                </Text>
              </Button>
            </Card>
          )
        }
        ListHeaderComponent={
          <View>
            {!onboardingDraft.isComplete && (
              <GlassView
                borderRadius={22}
                className="mb-4 flex-row items-center justify-between border-amber-500/40 bg-amber-950/40 p-3.5"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-bold text-amber-300">
                    Profile setup: {completionPercent}% complete
                  </Text>
                  <Text className="mt-1 text-[11px] text-zinc-300">
                    Finish your profile to unlock more date matches.
                  </Text>
                </View>
                <Button
                  className="h-8 px-3"
                  onPress={() => router.push("/onboarding")}
                  size="sm"
                  variant="sugar"
                >
                  <Text className="text-[11px] font-bold text-black">
                    Resume
                  </Text>
                </Button>
              </GlassView>
            )}

            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">
                Upcoming dates
              </Text>
              <Pressable
                accessibilityRole="button"
                className="flex-row items-center gap-1 rounded-full px-2 py-1 active:bg-muted"
                onPress={() => router.push("/(drawer)/(tabs)/dates")}
              >
                <Text className="text-xs font-bold text-amber-400">
                  View all
                </Text>
                <ChevronRight color="#f59e0b" size={14} />
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const acceptedMatch = item.matches.find((match) =>
            ["accepted", "friended"].includes(match.status)
          );
          const [place] = item.places;
          return (
            <Pressable
              className="mb-3"
              onPress={() =>
                router.push({
                  pathname: "/date/[date-id]",
                  params: { "date-id": item.id },
                })
              }
            >
              <Card className="border-amber-500/40 p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="mb-2 flex-row items-center gap-2">
                      <CalendarDays color="#f59e0b" size={16} />
                      <Text className="text-xs font-bold text-amber-400">
                        {formatDate(item.scheduledAt)}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-foreground">
                      {acceptedMatch
                        ? `Date with ${acceptedMatch.displayName}`
                        : "Date request"}
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {place?.name ?? item.searchArea} · {item.status}
                    </Text>
                  </View>
                  <Badge variant="outline">
                    <Text className="text-[10px] font-semibold text-foreground">
                      {item.matches.length} matches
                    </Text>
                  </Badge>
                </View>
              </Card>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      <View className="absolute bottom-[88px] left-4 right-4">
        <Card className="flex-row items-center justify-between border-amber-500/30 bg-amber-500/10 p-4">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-bold text-foreground">
              Capture the good parts
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Publish a recap with photos, videos, and spot memories.
            </Text>
          </View>
          <Button
            className="h-9 px-3"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/recaps");
            }}
            size="sm"
            variant="outline"
          >
            {latestRecap?.thumbnailUrl ? (
              <Image
                contentFit="cover"
                source={{ uri: latestRecap.thumbnailUrl }}
                style={{ borderRadius: 4, height: 20, width: 20 }}
              />
            ) : null}
            <Text className="text-xs font-bold text-foreground">Recaps</Text>
          </Button>
        </Card>
      </View>
    </View>
  );
}
