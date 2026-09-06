import { useDebouncedValue } from "@tanstack/react-pacer";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ExternalLink, MapPin, Search, Sparkles, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenHeading } from "@/components/screen-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  datingApi,
  type NativeSpecial,
  type NativeSpot,
} from "@/lib/dating-api";

const FILTERS = ["all", "specials", "eat", "drink", "play"] as const;
type SpotFilter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<SpotFilter, string> = {
  all: "All",
  specials: "Specials",
  eat: "Eat",
  drink: "Drink",
  play: "Play",
};

type SpotListItem = NativeSpot | NativeSpecial;

const isSpot = (item: SpotListItem): item is NativeSpot => "placeId" in item;

export default function SpotsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("Little Rock, AR");
  const [filter, setFilter] = useState<SpotFilter>("all");
  const [spots, setSpots] = useState<NativeSpot[]>([]);
  const [specials, setSpecials] = useState<NativeSpecial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [debouncedQuery] = useDebouncedValue(query.trim(), { wait: 350 });

  useEffect(() => {
    let isCurrent = true;
    const load = async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(undefined);
      try {
        if (filter === "specials") {
          const result = await datingApi.listPublicSpecials({
            area: area.trim() || undefined,
            radiusMiles: 25,
          });
          if (!isCurrent) return;
          const q = debouncedQuery.toLowerCase();
          setSpecials(
            q
              ? result.specials.filter((special) =>
                  [
                    special.title,
                    special.description,
                    special.category,
                    special.priceText,
                    special.locationName,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(q)
                )
              : result.specials
          );
          setSpots([]);
        } else {
          const result = await datingApi.searchPublicSpots({
            area: area.trim() || undefined,
            category: filter,
            query: debouncedQuery || undefined,
          });
          if (!isCurrent) return;
          setSpots(result.places);
          setSpecials([]);
        }
      } catch (loadError) {
        if (isCurrent) {
          setSpots([]);
          setSpecials([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load spots."
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [area, debouncedQuery, filter]);

  const resultCount = filter === "specials" ? specials.length : spots.length;
  const title = useMemo(
    () =>
      filter === "specials"
        ? "Daily specials near you"
        : filter === "all"
          ? "Explore spots near you"
          : `${filter[0].toUpperCase()}${filter.slice(1)} spots near you`,
    [filter]
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeading
        subtitle="Search nearby Eat, Drink, or Play spots and daily Sync specials."
        title="Explore Local Spots"
      />

      <FlatList
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 16 }}
        data={(filter === "specials" ? specials : spots) as SpotListItem[]}
        keyExtractor={(item) => (isSpot(item) ? item.placeId : item.id)}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setIsRefreshing(true);
              setIsLoading(true);
              setIsRefreshing(false);
              setIsLoading(false);
            }}
            refreshing={isRefreshing}
          />
        }
        ListEmptyComponent={
          <Card className="mt-3 p-4">
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#e6c46a" />
                <Text className="text-xs text-muted-foreground">
                  {filter === "specials"
                    ? "Loading daily specials…"
                    : "Loading spots…"}
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-muted-foreground">
                {error ??
                  (filter === "specials"
                    ? "No specials found. Try a different search."
                    : "No matching spots found.")}
              </Text>
            )}
          </Card>
        }
        ListHeaderComponent={
          <View>
            <Card className="p-4">
              <View className="flex-row items-center rounded-full border border-border/60 bg-input px-3">
                <Search color="#a1a1aa" size={16} />
                <TextInput
                  className="flex-1 px-2 py-3 text-sm text-foreground"
                  onChangeText={setQuery}
                  placeholder="Search nearby Eat, Drink, or Play spots…"
                  placeholderTextColor="#a1a1aa"
                  value={query}
                />
                {query ? (
                  <Pressable
                    accessibilityLabel="Clear spot search"
                    onPress={() => setQuery("")}
                  >
                    <X color="#a1a1aa" size={16} />
                  </Pressable>
                ) : null}
              </View>
              <View className="mt-2 flex-row items-center rounded-full border border-border/60 bg-input px-3">
                <MapPin color="#a1a1aa" size={16} />
                <TextInput
                  className="flex-1 px-2 py-3 text-sm text-foreground"
                  onChangeText={setArea}
                  placeholder="Little Rock, AR"
                  placeholderTextColor="#a1a1aa"
                  value={area}
                />
              </View>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {FILTERS.map((option) => (
                  <Pressable
                    className={`rounded-full border px-3.5 py-2 ${
                      filter === option
                        ? "border-primary bg-primary"
                        : "border-border/60 bg-transparent"
                    }`}
                    key={option}
                    onPress={() => setFilter(option)}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        filter === option
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {option === "specials"
                        ? "✨ Specials"
                        : FILTER_LABELS[option]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            <View className="mb-2 mt-5 flex-row items-center justify-between px-1">
              <Text className="text-sm font-bold text-muted-foreground">
                {title}
              </Text>
              <Badge variant="outline">
                <Text className="text-[10px] text-foreground">
                  {resultCount} results
                </Text>
              </Badge>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          if (isSpot(item)) {
            const spot = item;
            return (
              <Card className="mb-2 p-4">
                <View className="flex-row items-start gap-3">
                  {spot.photoUrl ? (
                    <Image
                      contentFit="cover"
                      source={{ uri: spot.photoUrl }}
                      style={{ borderRadius: 12, height: 68, width: 68 }}
                    />
                  ) : (
                    <View className="h-[68px] w-[68px] items-center justify-center rounded-xl bg-primary/15">
                      <Sparkles color="#e6c46a" size={20} />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">
                      {spot.name}
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {spot.address ?? "Address unavailable"}
                      {spot.rating ? ` · ${spot.rating}★` : ""}
                    </Text>
                    <View className="mt-2 flex-row items-center gap-3">
                      <Pressable
                        className="flex-row items-center gap-1"
                        disabled={!spot.googleMapsUri}
                        onPress={async () => {
                          if (!spot.googleMapsUri) return;
                          try {
                            await Linking.openURL(spot.googleMapsUri);
                          } catch {
                            // The system may not have a maps handler installed.
                          }
                        }}
                      >
                        <ExternalLink color="#e6c46a" size={13} />
                        <Text className="text-[11px] font-semibold text-primary">
                          Open Maps
                        </Text>
                      </Pressable>
                      <Button
                        className="h-8 px-3"
                        onPress={() => router.push("/date/new")}
                        size="sm"
                        variant="outline"
                      >
                        <Text className="text-[11px] font-bold text-foreground">
                          Plan here
                        </Text>
                      </Button>
                    </View>
                  </View>
                </View>
              </Card>
            );
          }

          const special = item;
          return (
            <Card className="mb-2 border-primary/30 p-4">
              <View className="flex-row items-center gap-2">
                <Badge variant="default">
                  <Text className="text-[10px] font-bold text-primary-foreground">
                    {special.category}
                  </Text>
                </Badge>
                {special.priceText ? (
                  <Text className="text-[11px] font-bold text-primary">
                    {special.priceText}
                  </Text>
                ) : null}
              </View>
              <Text className="mt-2 text-sm font-bold text-foreground">
                {special.title}
              </Text>
              {special.description ? (
                <Text className="mt-1 text-xs text-muted-foreground">
                  {special.description}
                </Text>
              ) : null}
              <Text className="mt-1 text-[11px] text-muted-foreground">
                {special.locationName ?? "Sync venue"}
                {special.locationAddress ? ` · ${special.locationAddress}` : ""}
              </Text>
              <Button
                className="mt-3 h-8 self-start px-3"
                onPress={() => router.push("/date/new")}
                size="sm"
                variant="default"
              >
                <Text className="text-[11px] font-bold text-primary-foreground">
                  Plan date here
                </Text>
              </Button>
            </Card>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
