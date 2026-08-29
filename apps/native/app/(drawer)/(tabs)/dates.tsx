import { useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  MapPin,
  RefreshCw,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { datingApi } from "@/lib/dating-api";
import { getPastRequests, getUpcomingRequests } from "@/lib/dating-utils";
import {
  dateRequestsCollection,
  refreshDatingData,
} from "@/lib/db/collections";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

function CalendarGrid({
  requests,
  onSelect,
}: {
  onSelect: (requestId: string) => void;
  requests: {
    id: string;
    scheduledAt: string;
  }[];
}) {
  const monthDate = new Date(requests[0]?.scheduledAt ?? Date.now());
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  ).getDate();
  const cells = Array.from(
    { length: firstDay.getDay() + daysInMonth },
    (_, index) =>
      index < firstDay.getDay() ? null : index - firstDay.getDay() + 1
  );
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(monthDate);

  return (
    <Card className="mb-4 p-4">
      <Text className="mb-3 text-base font-bold text-foreground">
        {monthLabel}
      </Text>
      <View className="mb-2 flex-row">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text
            className="flex-1 text-center text-[10px] font-bold text-muted-foreground"
            key={`${day}-${index}`}
          >
            {day}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((day, index) => {
          const date = day
            ? new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
            : null;
          const request = date
            ? requests.find((item) => sameDay(new Date(item.scheduledAt), date))
            : undefined;
          return (
            <Pressable
              accessibilityLabel={
                request ? `Open date on day ${day}` : undefined
              }
              className="h-11 w-[14.285%] items-center justify-center"
              disabled={!request}
              key={`${day ?? "blank"}-${index}`}
              onPress={() => request && onSelect(request.id)}
            >
              {day ? (
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full ${
                    request ? "bg-amber-500" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      request ? "text-black" : "text-foreground"
                    }`}
                  >
                    {day}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

export default function DatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<"list" | "calendar">(
    params.view === "calendar" ? "calendar" : "list"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
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
  const requestList = useMemo(() => requests ?? [], [requests]);
  const upcoming = useMemo(
    () => getUpcomingRequests(requestList),
    [requestList]
  );
  const past = useMemo(() => getPastRequests(requestList), [requestList]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDatingData();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleCheckIn = useCallback(async (dateRequestId: string) => {
    try {
      await datingApi.checkIn({ dateRequestId });
      await refreshDatingData();
      Alert.alert("Check-in confirmed", "Enjoy your date.");
    } catch (error) {
      Alert.alert(
        "Check-in unavailable",
        error instanceof Error ? error.message : "Please try again."
      );
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
            <CalendarDays color="#f59e0b" size={16} />
          </View>
          <Text className="text-xl font-extrabold tracking-tight text-foreground">
            Dates
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh dates"
          className="rounded-full p-2 active:bg-muted"
          disabled={isRefreshing}
          onPress={() => void handleRefresh()}
        >
          <RefreshCw color="#f59e0b" size={18} />
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{
          paddingBottom: 110,
          paddingHorizontal: 16,
          paddingTop: 8,
        }}
        data={view === "list" ? [...upcoming, ...past] : []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          view === "calendar" ? (
            <CalendarGrid
              onSelect={(requestId) =>
                router.push({
                  pathname: "/date/[date-id]",
                  params: { "date-id": requestId },
                })
              }
              requests={upcoming}
            />
          ) : isSessionPending ? (
            <Card className="p-4">
              <Text className="text-sm text-muted-foreground">
                Checking your account…
              </Text>
            </Card>
          ) : !session?.user ? (
            <Card className="p-4">
              <Text className="text-sm font-semibold text-foreground">
                Sign in to manage dates.
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
            <Card className="p-4">
              <Text className="text-sm text-muted-foreground">
                Loading your dates…
              </Text>
            </Card>
          ) : isError ? (
            <Card className="border-red-500/40 p-4">
              <Text className="text-sm font-semibold text-red-400">
                We couldn&apos;t load your dates.
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
            <Card className="p-4">
              <Text className="text-sm font-semibold text-foreground">
                No dates yet.
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Plan a date to see the itinerary here.
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
            <View className="mb-4 flex-row rounded-2xl border border-border/60 bg-card p-1">
              {(["list", "calendar"] as const).map((option) => (
                <Pressable
                  className={`flex-1 rounded-xl px-3 py-2 ${
                    view === option ? "bg-amber-500" : "bg-transparent"
                  }`}
                  key={option}
                  onPress={() => setView(option)}
                >
                  <Text
                    className={`text-center text-xs font-bold capitalize ${
                      view === option ? "text-black" : "text-muted-foreground"
                    }`}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            {view === "list" && upcoming.length > 0 ? (
              <Text className="mb-2 px-1 text-sm font-bold text-muted-foreground">
                Upcoming
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const isPast = getPastRequests([item]).length > 0;
          const match = item.matches.find((candidate) =>
            ["accepted", "friended"].includes(candidate.status)
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
              <Card className={`p-4 ${!isPast ? "border-amber-500/40" : ""}`}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="mb-2 flex-row items-center gap-2">
                      {isPast ? (
                        <CheckCircle2 color="#34d399" size={16} />
                      ) : (
                        <CalendarDays color="#f59e0b" size={16} />
                      )}
                      <Text className="text-xs font-bold text-foreground">
                        {formatDate(item.scheduledAt)}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-foreground">
                      {match
                        ? `Date with ${match.displayName}`
                        : "Date request"}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <MapPin color="#a1a1aa" size={12} />
                      <Text className="flex-1 text-xs text-muted-foreground">
                        {place?.name ?? item.searchArea}
                      </Text>
                    </View>
                  </View>
                  <Badge variant={isPast ? "outline" : "sugar"}>
                    <Text className="text-[10px] font-semibold text-foreground">
                      {item.status}
                    </Text>
                  </Badge>
                </View>
                {!isPast && index < upcoming.length ? (
                  <Button
                    className="mt-3 h-9 self-start px-3"
                    onPress={() => void handleCheckIn(item.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Text className="text-xs font-semibold text-foreground">
                      Check in
                    </Text>
                  </Button>
                ) : null}
                <View className="absolute bottom-4 right-4">
                  <ChevronRight color="#a1a1aa" size={16} />
                </View>
              </Card>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
