import { useLiveQuery } from "@tanstack/react-db";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { datingApi } from "@/lib/dating-api";
import {
  dateRequestsCollection,
  refreshDatingData,
} from "@/lib/db/collections";
import { captureImage, chooseImage, uploadDateImage } from "@/lib/media";

type DateMedia = {
  id: string;
  kind: string;
  url: string;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));

export default function DateDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ "date-id": string }>();
  const dateId = params["date-id"];
  const [media, setMedia] = useState<DateMedia[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const { data: requests, isLoading } = useLiveQuery({
    query: (q) => q.from({ request: dateRequestsCollection }),
  });
  const request = requests?.find((candidate) => candidate.id === dateId);
  const match = request?.matches.find((candidate) =>
    ["accepted", "friended"].includes(candidate.status)
  );

  useEffect(() => {
    if (!dateId) return;
    let isCurrent = true;
    const loadMedia = async () => {
      try {
        const { media: nextMedia } = await datingApi.getDateMedia(dateId);
        if (isCurrent) {
          setMedia(
            nextMedia.map((item) => ({
              id: item.id,
              kind: item.kind,
              url: item.url,
            }))
          );
        }
      } catch {
        if (isCurrent) setMedia([]);
      }
    };
    void loadMedia();
    return () => {
      isCurrent = false;
    };
  }, [dateId]);

  const runAction = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setIsBusy(true);
      try {
        await action();
        await refreshDatingData();
        Alert.alert("Date updated", successMessage);
      } catch (error) {
        Alert.alert(
          "Action unavailable",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setIsBusy(false);
      }
    },
    []
  );

  const handleCapture = useCallback(
    async (
      kind: "date_photo" | "menu_photo" | "spot_photo",
      picker: typeof captureImage
    ) => {
      if (!dateId) return;
      setIsBusy(true);
      try {
        const image = await picker();
        if (!image) return;
        const result = await uploadDateImage({
          dateRequestId: dateId,
          image,
          kind,
        });
        setMedia((current) => [
          ...current,
          {
            id: result.media.id,
            kind: result.media.kind,
            url: result.media.url,
          },
        ]);
        if (kind !== "date_photo") {
          const [place] = request?.places ?? [];
          if (!place)
            throw new Error("This date has no place to contribute to.");
          await datingApi.submitSpotContribution({
            dateMediaId: result.media.id,
            dateRequestId: dateId,
            googlePlaceId: place.placeId,
            kind,
          });
          Alert.alert(
            "Contribution submitted",
            "Thanks — it is pending review for contribution credit."
          );
        }
      } catch (error) {
        Alert.alert(
          "Photo upload failed",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setIsBusy(false);
      }
    },
    [dateId, request]
  );

  if (isLoading || !request) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-sm text-muted-foreground">
          {isLoading ? "Loading date…" : "Date not found."}
        </Text>
      </View>
    );
  }

  const canCheckIn = ["accepted", "confirmed", "proposed"].includes(
    request.status
  );
  const canComplete = request.status === "checked_in";
  const canReview = request.status === "review_due";

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center gap-3 px-5 pb-3 pt-2"
        style={{ paddingTop: insets.top + 4 }}
      >
        <Pressable
          accessibilityLabel="Go back"
          className="rounded-full p-2 active:bg-muted"
          onPress={() => router.back()}
        >
          <ChevronLeft color="#f59e0b" size={22} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold tracking-tight text-foreground">
            Date details
          </Text>
          <Text className="text-xs text-muted-foreground">
            {request.status}
          </Text>
        </View>
        <Sparkles color="#f59e0b" size={18} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Card className="border-amber-500/40 p-5">
          <Badge variant="sugar">
            <Text className="text-[10px] font-bold text-amber-400">
              {request.status}
            </Text>
          </Badge>
          <View className="mt-4 flex-row items-center gap-2">
            <Clock3 color="#f59e0b" size={16} />
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {formatDate(request.scheduledAt)}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <MapPin color="#a1a1aa" size={16} />
            <Text className="flex-1 text-sm text-muted-foreground">
              {request.places.map((place) => place.name).join(" · ") ||
                request.searchArea}
            </Text>
          </View>
          {match ? (
            <View className="mt-4 flex-row items-center gap-3 rounded-xl bg-muted/30 p-3">
              {match.profilePhotoUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: match.profilePhotoUrl }}
                  style={{ borderRadius: 24, height: 48, width: 48 }}
                />
              ) : null}
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  {match.displayName}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {match.compatibility}% compatibility · {match.status}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="mt-5 gap-2">
            {canCheckIn ? (
              <Button
                disabled={isBusy}
                onPress={() =>
                  void runAction(
                    () => datingApi.checkIn({ dateRequestId: request.id }),
                    "Check-in is confirmed."
                  )
                }
                size="sm"
                variant="sugar"
              >
                <CheckCircle2 color="#000000" size={15} />
                <Text className="text-xs font-bold text-black">Check in</Text>
              </Button>
            ) : null}
            {canComplete ? (
              <Button
                disabled={isBusy}
                onPress={() =>
                  void runAction(
                    () => datingApi.completeDate(request.id),
                    "Your review is ready."
                  )
                }
                size="sm"
                variant="outline"
              >
                <Text className="text-xs font-semibold text-foreground">
                  Complete date
                </Text>
              </Button>
            ) : null}
            {canReview ? (
              <Button
                disabled={isBusy}
                onPress={() =>
                  router.push({
                    pathname: "/review/[request-id]",
                    params: { "request-id": request.id },
                  })
                }
                size="sm"
                variant="sugar"
              >
                <Text className="text-xs font-bold text-black">
                  Review date
                </Text>
              </Button>
            ) : null}
          </View>
        </Card>

        <Card className="mt-4 p-4">
          <View>
            <Text className="text-base font-bold text-foreground">
              Date memories
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Capture photos for your review and recap.
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Button
                className="h-9 flex-1 px-2"
                disabled={isBusy}
                onPress={() => void handleCapture("date_photo", captureImage)}
                size="sm"
                variant="outline"
              >
                <Camera color="#f59e0b" size={15} />
                <Text className="text-[11px] font-bold text-foreground">
                  Memory
                </Text>
              </Button>
              <Button
                className="h-9 flex-1 px-2"
                disabled={isBusy}
                onPress={() => void handleCapture("spot_photo", captureImage)}
                size="sm"
                variant="outline"
              >
                <MapPin color="#f59e0b" size={15} />
                <Text className="text-[11px] font-bold text-foreground">
                  Spot credit
                </Text>
              </Button>
              <Button
                className="h-9 flex-1 px-2"
                disabled={isBusy}
                onPress={() => void handleCapture("menu_photo", chooseImage)}
                size="sm"
                variant="outline"
              >
                <Text className="text-[11px] font-bold text-foreground">
                  Menu
                </Text>
              </Button>
            </View>
          </View>
          {media.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {media.map((item) => (
                <Image
                  contentFit="cover"
                  key={item.id}
                  source={{ uri: item.url }}
                  style={{ borderRadius: 10, height: 82, width: 82 }}
                />
              ))}
            </View>
          ) : (
            <Text className="mt-3 text-xs text-muted-foreground">
              No date media yet.
            </Text>
          )}
        </Card>

        <View className="mt-4 flex-row gap-2">
          <Button
            className="flex-1"
            onPress={() =>
              router.push({
                pathname: "/recaps",
                params: { requestId: request.id },
              })
            }
            size="sm"
            variant="outline"
          >
            <Sparkles color="#f59e0b" size={15} />
            <Text className="text-xs font-bold text-foreground">Recap</Text>
          </Button>
          {match ? (
            <Button
              className="flex-1"
              onPress={() => router.push("/chats")}
              size="sm"
              variant="outline"
            >
              <MessageCircle color="#f59e0b" size={15} />
              <Text className="text-xs font-bold text-foreground">Chat</Text>
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
