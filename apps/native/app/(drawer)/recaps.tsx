import { useLiveQuery } from "@tanstack/react-db";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { Camera, ImagePlus, RefreshCw, Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { datingApi } from "@/lib/dating-api";
import { isRecapEligible } from "@/lib/dating-utils";
import {
  dateRequestsCollection,
  recapsCollection,
  refreshDatingData,
} from "@/lib/db/collections";
import { captureImage, chooseImage, uploadDateImage } from "@/lib/media";

type SelectedMedia = {
  id: string;
  kind: string;
  url: string;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function RecapsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    params.requestId ?? ""
  );
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { data: requests } = useLiveQuery({
    query: (q) =>
      session?.user ? q.from({ request: dateRequestsCollection }) : undefined,
  });
  const {
    data: recaps,
    isError,
    isLoading,
  } = useLiveQuery({
    query: (q) =>
      session?.user
        ? q
            .from({ recap: recapsCollection })
            .orderBy(({ recap }) => recap.createdAt, "desc")
        : undefined,
  });

  const eligibleDates = useMemo(
    () => (requests ?? []).filter((request) => isRecapEligible(request.status)),
    [requests]
  );
  const selectedRequest = eligibleDates.find(
    (request) => request.id === selectedRequestId
  );

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedMedia([]);
      return;
    }
    let isCurrent = true;
    const loadMedia = async () => {
      setIsLoadingMedia(true);
      try {
        const { media } = await datingApi.getDateMedia(selectedRequestId);
        if (isCurrent) {
          setSelectedMedia(
            media.map((item) => ({
              id: item.id,
              kind: item.kind,
              url: item.url,
            }))
          );
        }
      } catch {
        if (isCurrent) setSelectedMedia([]);
      } finally {
        if (isCurrent) setIsLoadingMedia(false);
      }
    };
    void loadMedia();
    return () => {
      isCurrent = false;
    };
  }, [selectedRequestId]);

  const handleUpload = useCallback(
    async (picker: typeof captureImage) => {
      if (!selectedRequestId) {
        Alert.alert(
          "Choose a date first",
          "Select a completed date for this recap."
        );
        return;
      }
      setIsUploading(true);
      try {
        const image = await picker();
        if (!image) return;
        const { media } = await uploadDateImage({
          dateRequestId: selectedRequestId,
          image,
          kind: "recap_photo",
        });
        setSelectedMedia((current) => [
          ...current,
          { id: media.id, kind: media.kind, url: media.url },
        ]);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch (error) {
        Alert.alert(
          "Photo upload failed",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [selectedRequestId]
  );

  const handlePublish = useCallback(async () => {
    if (!selectedRequestId) {
      Alert.alert(
        "Choose a date first",
        "Select a completed date for this recap."
      );
      return;
    }
    if (selectedMedia.length === 0) {
      Alert.alert(
        "Add a memory",
        "Capture or choose at least one photo first."
      );
      return;
    }
    setIsPublishing(true);
    try {
      await datingApi.publishRecap({
        caption: caption.trim() || undefined,
        dateRequestId: selectedRequestId,
        mediaIds: selectedMedia.map((media) => media.id),
      });
      await refreshDatingData();
      setCaption("");
      setSelectedMedia([]);
      setSelectedRequestId("");
      Alert.alert("Recap published", "Your date memory is now in Recaps.");
    } catch (error) {
      Alert.alert(
        "Could not publish recap",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsPublishing(false);
    }
  }, [caption, selectedMedia, selectedRequestId]);

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-5 pb-3 pt-2"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20">
            <Sparkles color="#f59e0b" size={16} />
          </View>
          <Text className="text-xl font-extrabold tracking-tight text-foreground">
            Recaps
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh recaps"
          className="rounded-full p-2 active:bg-muted"
          onPress={() => void refreshDatingData()}
        >
          <RefreshCw color="#f59e0b" size={18} />
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{
          gap: 12,
          paddingBottom: 110,
          paddingHorizontal: 16,
        }}
        data={recaps ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isSessionPending ? (
            <Card className="p-4">
              <Text className="text-sm text-muted-foreground">
                Checking your account…
              </Text>
            </Card>
          ) : !session?.user ? (
            <Card className="p-4">
              <Text className="text-sm font-semibold text-foreground">
                Sign in to create or view recaps.
              </Text>
            </Card>
          ) : isLoading ? (
            <Card className="p-4">
              <Text className="text-sm text-muted-foreground">
                Loading recaps…
              </Text>
            </Card>
          ) : isError ? (
            <Card className="border-red-500/40 p-4">
              <Text className="text-sm font-semibold text-red-400">
                Recaps are unavailable right now.
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Check your connection and refresh.
              </Text>
            </Card>
          ) : (
            <Card className="p-4">
              <Text className="text-sm font-semibold text-foreground">
                No recaps yet.
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Complete a date, then save a memory here.
              </Text>
            </Card>
          )
        }
        ListHeaderComponent={
          <Card className="mb-1 border-amber-500/30 p-4">
            <Text className="text-base font-bold text-foreground">
              Save a date memory
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Photos and menu memories stay attached to the date you actually
              went on.
            </Text>

            <Text className="mb-2 mt-4 text-xs font-bold text-muted-foreground">
              Choose a completed date
            </Text>
            {eligibleDates.length === 0 ? (
              <Text className="text-xs text-muted-foreground">
                Your completed dates will appear here after check-in and review.
              </Text>
            ) : (
              <View className="gap-2">
                {eligibleDates.map((request) => (
                  <Pressable
                    className={`rounded-xl border p-3 ${
                      request.id === selectedRequestId
                        ? "border-amber-500 bg-amber-500/15"
                        : "border-border/60 bg-muted/20"
                    }`}
                    key={request.id}
                    onPress={() => setSelectedRequestId(request.id)}
                  >
                    <Text className="text-xs font-bold text-foreground">
                      {formatDate(request.scheduledAt)} · {request.searchArea}
                    </Text>
                    <Text className="mt-1 text-[11px] text-muted-foreground">
                      {request.places[0]?.name ?? "Date spot pending"} ·{" "}
                      {request.status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {selectedRequest ? (
              <View className="mt-4">
                <TextInput
                  className="min-h-20 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm text-foreground"
                  multiline
                  onChangeText={setCaption}
                  placeholder="What made this date memorable?"
                  placeholderTextColor="#a1a1aa"
                  textAlignVertical="top"
                  value={caption}
                />
                <View className="mt-3 flex-row gap-2">
                  <Button
                    className="h-10 flex-1"
                    disabled={isUploading}
                    onPress={() => void handleUpload(captureImage)}
                    size="sm"
                    variant="outline"
                  >
                    <Camera color="#f59e0b" size={15} />
                    <Text className="text-xs font-bold text-foreground">
                      Capture
                    </Text>
                  </Button>
                  <Button
                    className="h-10 flex-1"
                    disabled={isUploading}
                    onPress={() => void handleUpload(chooseImage)}
                    size="sm"
                    variant="outline"
                  >
                    <ImagePlus color="#f59e0b" size={15} />
                    <Text className="text-xs font-bold text-foreground">
                      Choose
                    </Text>
                  </Button>
                </View>
                {isLoadingMedia || isUploading ? (
                  <Text className="mt-2 text-xs text-muted-foreground">
                    {isUploading ? "Uploading photo…" : "Loading date media…"}
                  </Text>
                ) : null}
                {selectedMedia.length > 0 ? (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {selectedMedia.map((media) => (
                      <Image
                        contentFit="cover"
                        key={media.id}
                        source={{ uri: media.url }}
                        style={{ borderRadius: 10, height: 72, width: 72 }}
                      />
                    ))}
                  </View>
                ) : null}
                {selectedMedia.some((media) =>
                  ["menu_photo", "spot_photo"].includes(media.kind)
                ) ? (
                  <View className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <Text className="text-xs font-bold text-emerald-400">
                      Spot and menu contributions
                    </Text>
                    <Text className="mt-1 text-[11px] text-muted-foreground">
                      These memories are also queued for contribution review and
                      possible credit.
                    </Text>
                  </View>
                ) : null}
                <Button
                  className="mt-4 h-10"
                  disabled={isPublishing || isUploading}
                  onPress={() => void handlePublish()}
                  size="sm"
                  variant="sugar"
                >
                  <Text className="text-xs font-bold text-black">
                    {isPublishing ? "Publishing…" : "Publish recap"}
                  </Text>
                </Button>
              </View>
            ) : null}
          </Card>
        }
        renderItem={({ item }) => {
          const imageUrl = item.media?.[0]?.url ?? item.thumbnailUrl;
          const request = requests?.find(
            (candidate) => candidate.id === item.dateRequestId
          );
          return (
            <Card className="overflow-hidden p-0">
              {imageUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: imageUrl }}
                  style={{ height: 190, width: "100%" }}
                />
              ) : null}
              <View className="p-4">
                <Text className="text-xs font-bold text-amber-400">
                  {request ? formatDate(request.scheduledAt) : "Date recap"}
                </Text>
                {request?.places[0] ? (
                  <Text className="mt-1 text-sm font-semibold text-foreground">
                    {request.places[0].name}
                  </Text>
                ) : null}
                {item.caption ? (
                  <Text className="mt-2 text-sm text-muted-foreground">
                    {item.caption}
                  </Text>
                ) : null}
                <Text className="mt-2 text-[11px] text-muted-foreground">
                  {item.media?.length ?? 0} captured memories ·{" "}
                  {item.media?.filter((media) =>
                    ["menu_photo", "spot_photo"].includes(media.kind)
                  ).length ?? 0}{" "}
                  spot/menu contributions
                </Text>
              </View>
            </Card>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
