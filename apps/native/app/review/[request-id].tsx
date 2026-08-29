import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Star } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { datingApi } from "@/lib/dating-api";
import { refreshDatingData } from "@/lib/db/collections";

const ratingOptions = [1, 2, 3, 4, 5];

function RatingPicker({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (rating: number) => void;
  value: number;
}) {
  return (
    <View className="mt-4">
      <Text className="text-xs font-bold text-muted-foreground">{label}</Text>
      <View className="mt-2 flex-row gap-2">
        {ratingOptions.map((rating) => (
          <Pressable
            accessibilityLabel={`${rating} out of 5 stars`}
            key={rating}
            onPress={() => onChange(rating)}
          >
            <Star
              color="#f59e0b"
              fill={rating <= value ? "#f59e0b" : "transparent"}
              size={26}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ "request-id": string }>();
  const requestId = params["request-id"];
  const [personRating, setPersonRating] = useState(0);
  const [placeRating, setPlaceRating] = useState(0);
  const [personComment, setPersonComment] = useState("");
  const [placeComment, setPlaceComment] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    let isCurrent = true;
    const load = async () => {
      try {
        const [prompt, media] = await Promise.all([
          datingApi.getReviewPrompt(requestId),
          datingApi.getDateMedia(requestId),
        ]);
        if (!isCurrent) return;
        setPeople(prompt.people.map((person) => person.name));
        setPlaces(prompt.places.map((place) => place.name));
        setMediaIds(media.media.map((item) => item.id));
        if (prompt.existingReview) {
          setPersonRating(prompt.existingReview.personRating);
          setPlaceRating(prompt.existingReview.placeRating);
          setPersonComment(prompt.existingReview.personComment ?? "");
          setPlaceComment(prompt.existingReview.placeComment ?? "");
        }
      } catch (error) {
        if (isCurrent) {
          Alert.alert(
            "Review unavailable",
            error instanceof Error ? error.message : "Please try again."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [requestId]);

  const submit = useCallback(async () => {
    if (!requestId || personRating < 1 || placeRating < 1) {
      Alert.alert("Add ratings", "Rate both the date and the spot first.");
      return;
    }
    setIsSubmitting(true);
    try {
      await datingApi.submitReview(requestId, {
        mediaIds,
        personComment: personComment.trim() || undefined,
        personCriteria: {},
        personRating,
        placeComment: placeComment.trim() || undefined,
        placeCriteria: {},
        placeRating,
      });
      await refreshDatingData();
      Alert.alert(
        "Review submitted",
        "Thanks for helping improve Chewbuu dates."
      );
      router.replace({
        pathname: "/recaps",
        params: { requestId },
      });
    } catch (error) {
      Alert.alert(
        "Could not submit review",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    mediaIds,
    personComment,
    personRating,
    placeComment,
    placeRating,
    requestId,
    router,
  ]);

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center gap-3 px-4 pb-3 pt-2"
        style={{ paddingTop: insets.top + 4 }}
      >
        <Pressable
          accessibilityLabel="Go back"
          className="rounded-full p-2 active:bg-muted"
          onPress={() => router.back()}
        >
          <ChevronLeft color="#f59e0b" size={22} />
        </Pressable>
        <Text className="text-xl font-extrabold text-foreground">
          Review date
        </Text>
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f59e0b" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            gap: 12,
            paddingBottom: 110,
            paddingHorizontal: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Card className="p-4">
            <Text className="text-base font-bold text-foreground">
              How did it go?
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {people.join(", ") || "Your date"} ·{" "}
              {places.join(", ") || "Your spot"}
            </Text>
            <RatingPicker
              label="The date"
              onChange={setPersonRating}
              value={personRating}
            />
            <TextInput
              className="mt-3 min-h-20 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm text-foreground"
              multiline
              onChangeText={setPersonComment}
              placeholder="What did you enjoy about the conversation?"
              placeholderTextColor="#a1a1aa"
              textAlignVertical="top"
              value={personComment}
            />
            <RatingPicker
              label="The spot"
              onChange={setPlaceRating}
              value={placeRating}
            />
            <TextInput
              className="mt-3 min-h-20 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm text-foreground"
              multiline
              onChangeText={setPlaceComment}
              placeholder="How was the venue or activity?"
              placeholderTextColor="#a1a1aa"
              textAlignVertical="top"
              value={placeComment}
            />
            <Button
              className="mt-4 h-11"
              disabled={isSubmitting}
              onPress={() => void submit()}
              size="sm"
              variant="sugar"
            >
              <Text className="text-xs font-bold text-black">
                {isSubmitting ? "Submitting…" : "Submit review"}
              </Text>
            </Button>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}
