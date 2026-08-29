import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useRouter } from "expo-router";
import { Check, ExternalLink, MapPin, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { datingApi, type NativeSpot } from "@/lib/dating-api";
import { refreshDatingData } from "@/lib/db/collections";

const DEFAULT_AREA = "Washington, DC";
const MINIMUM_QUERY_LENGTH = 2;

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

export default function NewDateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [area, setArea] = useState(DEFAULT_AREA);
  const [query, setQuery] = useState("");
  const [spots, setSpots] = useState<NativeSpot[]>([]);
  const [selectedSpots, setSelectedSpots] = useState<NativeSpot[]>([]);
  const [scheduledAt, setScheduledAt] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [pickerMode, setPickerMode] = useState<"date" | "time">();
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [readiness, setReadiness] =
    useState<Awaited<ReturnType<typeof datingApi.getSummary>>["readiness"]>();
  const [readinessError, setReadinessError] = useState<string>();
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(true);
  const [isStartingDating, setIsStartingDating] = useState(false);
  const [debouncedQuery] = useDebouncedValue(query.trim(), { wait: 350 });

  useEffect(() => {
    if (!readiness?.canDate || debouncedQuery.length < MINIMUM_QUERY_LENGTH) {
      setSpots([]);
      setSearchError(undefined);
      return;
    }
    let isCurrent = true;
    const loadSpots = async () => {
      setIsSearching(true);
      setSearchError(undefined);
      try {
        const result = await datingApi.searchPlaces({
          area,
          filters: [],
          query: debouncedQuery,
          searchKind: "place",
          what: ["eat", "drink", "play"],
        });
        if (isCurrent) setSpots(result.places);
      } catch (error) {
        if (isCurrent) {
          setSpots([]);
          setSearchError(
            error instanceof Error ? error.message : "Search failed."
          );
        }
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    };
    void loadSpots();
    return () => {
      isCurrent = false;
    };
  }, [area, debouncedQuery, readiness?.canDate]);

  useEffect(() => {
    let isCurrent = true;
    const loadReadiness = async () => {
      try {
        const summary = await datingApi.getSummary();
        if (isCurrent) setReadiness(summary.readiness);
      } catch (error) {
        if (isCurrent) {
          setReadinessError(
            error instanceof Error
              ? error.message
              : "Could not check dating readiness."
          );
        }
      } finally {
        if (isCurrent) setIsLoadingReadiness(false);
      }
    };
    void loadReadiness();
    return () => {
      isCurrent = false;
    };
  }, []);

  const selectedIds = useMemo(
    () => new Set(selectedSpots.map((spot) => spot.placeId)),
    [selectedSpots]
  );

  const handlePickerChange = (event: DateTimePickerEvent, value?: Date) => {
    setPickerMode(undefined);
    if (event.type === "set" && value) {
      setScheduledAt(value);
    }
  };

  const toggleSpot = (spot: NativeSpot) => {
    setSelectedSpots((current) =>
      selectedIds.has(spot.placeId)
        ? current.filter((item) => item.placeId !== spot.placeId)
        : [...current, spot]
    );
  };

  const startDating = async () => {
    setIsStartingDating(true);
    try {
      const result = await datingApi.setDatingAvailability(true);
      setReadiness(result.readiness);
    } catch (error) {
      setReadinessError(
        error instanceof Error ? error.message : "Could not start dating."
      );
    } finally {
      setIsStartingDating(false);
    }
  };

  const createDate = async () => {
    if (selectedSpots.length === 0) {
      Alert.alert("Choose a spot", "Add at least one Google Maps place first.");
      return;
    }
    if (scheduledAt.getTime() <= Date.now()) {
      Alert.alert("Choose a future time", "Your date must be scheduled ahead.");
      return;
    }
    setIsCreating(true);
    try {
      const { request } = await datingApi.createDateRequest({
        filters: [],
        partyMembers: [],
        paymentMode: "dutch",
        places: selectedSpots.map((spot) => ({
          address: spot.address,
          name: spot.name,
          placeId: spot.placeId,
          rating: spot.rating,
          types: spot.types,
        })),
        scheduledAt: scheduledAt.toISOString(),
        searchArea: area,
        what: ["eat"],
      });
      await refreshDatingData();
      router.replace({
        pathname: "/date/[date-id]",
        params: { "date-id": request.id },
      });
    } catch (error) {
      Alert.alert(
        "Could not create date",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoadingReadiness) {
    return <AccessMessage description="Checking your dating readiness…" />;
  }

  if (readinessError) {
    return <AccessMessage description={readinessError} />;
  }

  if (!readiness?.onboarded) {
    return (
      <AccessMessage
        description="Complete your dating profile before opening a new date request."
        onPress={() => router.replace("/onboarding")}
        title="Finish onboarding first"
      />
    );
  }

  if (readiness.pendingReviews > 0) {
    return (
      <AccessMessage
        description="Complete your pending date review before planning another date."
        onPress={() => router.back()}
        title="Review needed first"
      />
    );
  }

  if (!readiness.canDate) {
    return (
      <AccessMessage
        actionLabel={isStartingDating ? "Starting…" : "Start dating"}
        description="Your profile is ready. Turn dating on when you want to receive date requests and plan a date."
        disabled={isStartingDating}
        onPress={() => void startDating()}
        title="Ready when you are"
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-3 pt-2" style={{ paddingTop: insets.top + 4 }}>
        <Text className="text-xl font-extrabold tracking-tight text-foreground">
          Plan a date
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground">
          Search Google Maps places, choose a time, and request matches.
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 16 }}
        data={spots}
        keyExtractor={(item) => item.placeId}
        ListEmptyComponent={
          <Card className="mt-3 p-4">
            {isSearching ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#f59e0b" />
                <Text className="text-xs text-muted-foreground">
                  Searching Google Maps places…
                </Text>
              </View>
            ) : searchError ? (
              <Text className="text-xs text-red-400">{searchError}</Text>
            ) : (
              <Text className="text-xs text-muted-foreground">
                Type at least two characters to search places.
              </Text>
            )}
          </Card>
        }
        ListHeaderComponent={
          <View>
            <Card className="p-4">
              <Text className="mb-2 text-xs font-bold text-muted-foreground">
                Search area
              </Text>
              <TextInput
                className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm text-foreground"
                onChangeText={setArea}
                placeholder="City or neighborhood"
                placeholderTextColor="#a1a1aa"
                value={area}
              />
              <View className="mt-3 flex-row items-center rounded-xl border border-border/60 bg-muted/20 px-3">
                <Search color="#a1a1aa" size={16} />
                <TextInput
                  className="flex-1 px-2 py-3 text-sm text-foreground"
                  onChangeText={setQuery}
                  placeholder="Restaurant, coffee, mini golf…"
                  placeholderTextColor="#a1a1aa"
                  value={query}
                />
                {query ? (
                  <Pressable
                    accessibilityLabel="Clear place search"
                    onPress={() => setQuery("")}
                  >
                    <X color="#a1a1aa" size={16} />
                  </Pressable>
                ) : null}
              </View>
              <Button
                className="mt-3 h-10"
                onPress={() => setPickerMode("date")}
                size="sm"
                variant="outline"
              >
                <Text className="text-xs font-semibold text-foreground">
                  {formatDate(scheduledAt)}
                </Text>
              </Button>
              {pickerMode ? (
                <DateTimePicker
                  display="default"
                  mode={pickerMode}
                  onChange={handlePickerChange}
                  value={scheduledAt}
                />
              ) : null}
            </Card>
            {selectedSpots.length > 0 ? (
              <Card className="mt-3 border-amber-500/40 p-4">
                <Text className="text-xs font-bold text-amber-400">
                  Selected spots
                </Text>
                <View className="mt-2 gap-2">
                  {selectedSpots.map((spot) => (
                    <View
                      className="flex-row items-center justify-between"
                      key={spot.placeId}
                    >
                      <Text className="flex-1 text-sm text-foreground">
                        {spot.name}
                      </Text>
                      <Pressable onPress={() => toggleSpot(spot)}>
                        <X color="#a1a1aa" size={16} />
                      </Pressable>
                    </View>
                  ))}
                </View>
                <Button
                  className="mt-3 h-10"
                  disabled={isCreating}
                  onPress={() => void createDate()}
                  size="sm"
                  variant="sugar"
                >
                  <Text className="text-xs font-bold text-black">
                    {isCreating ? "Requesting matches…" : "Request this date"}
                  </Text>
                </Button>
              </Card>
            ) : null}
            <Text className="mb-2 mt-5 px-1 text-sm font-bold text-muted-foreground">
              Nearby places
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.placeId);
          return (
            <Card className="mb-2 p-4">
              <View className="flex-row items-start gap-3">
                <View className="mt-1 rounded-full bg-amber-500/15 p-2">
                  <MapPin color="#f59e0b" size={16} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {item.address ?? "Address unavailable"}
                    {item.rating ? ` · ${item.rating}★` : ""}
                  </Text>
                  <View className="mt-2 flex-row items-center gap-3">
                    <Pressable
                      className="flex-row items-center gap-1"
                      onPress={async () => {
                        if (!item.googleMapsUri) return;
                        try {
                          await Linking.openURL(item.googleMapsUri);
                        } catch {
                          // The system may not have a maps handler installed.
                        }
                      }}
                    >
                      <ExternalLink color="#f59e0b" size={13} />
                      <Text className="text-[11px] font-semibold text-amber-400">
                        Maps
                      </Text>
                    </Pressable>
                    <Button
                      className="h-8 px-3"
                      onPress={() => toggleSpot(item)}
                      size="sm"
                      variant={selected ? "sugar" : "outline"}
                    >
                      <Check
                        color={selected ? "#000000" : "#f59e0b"}
                        size={13}
                      />
                      <Text
                        className={`text-[11px] font-bold ${
                          selected ? "text-black" : "text-foreground"
                        }`}
                      >
                        {selected ? "Added" : "Add"}
                      </Text>
                    </Button>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function AccessMessage({
  actionLabel,
  description,
  disabled = false,
  onPress,
  title = "Date planning unavailable",
}: {
  actionLabel?: string;
  description: string;
  disabled?: boolean;
  onPress?: () => void;
  title?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Card className="w-full p-5">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        <Text className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </Text>
        {onPress ? (
          <Button
            className="mt-4 self-start"
            disabled={disabled}
            onPress={onPress}
            size="sm"
            variant="sugar"
          >
            <Text className="text-xs font-bold text-black">
              {actionLabel ?? "Continue"}
            </Text>
          </Button>
        ) : null}
      </Card>
    </View>
  );
}
