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
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { datingApi, type NativeSpot } from "@/lib/dating-api";

const CATEGORIES = ["eat", "drink", "play"] as const;
type Category = (typeof CATEGORIES)[number];

export default function SpotsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("Washington, DC");
  const [category, setCategory] = useState<Category>("eat");
  const [spots, setSpots] = useState<NativeSpot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [debouncedQuery] = useDebouncedValue(query.trim(), { wait: 350 });

  useEffect(() => {
    let isCurrent = true;
    const loadSpots = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const result = await datingApi.searchPlaces({
          area,
          filters: [],
          query: debouncedQuery || category,
          searchKind: "place",
          what: [category],
        });
        if (isCurrent) setSpots(result.places);
      } catch (loadError) {
        if (isCurrent) {
          setSpots([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load spots."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    void loadSpots();
    return () => {
      isCurrent = false;
    };
  }, [area, category, debouncedQuery]);

  const title = useMemo(
    () => `${category[0].toUpperCase()}${category.slice(1)} spots near you`,
    [category]
  );

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-3 pt-2" style={{ paddingTop: insets.top + 4 }}>
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20">
            <MapPin color="#f59e0b" size={16} />
          </View>
          <Text className="text-xl font-extrabold tracking-tight text-foreground">
            Spots
          </Text>
        </View>
        <Text className="mt-1 text-xs text-muted-foreground">
          Live Google Maps places for planning a real date.
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 16 }}
        data={spots}
        keyExtractor={(item) => item.placeId}
        ListEmptyComponent={
          <Card className="mt-3 p-4">
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#f59e0b" />
                <Text className="text-xs text-muted-foreground">
                  Loading Google Maps places…
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-muted-foreground">
                {error ?? "No matching spots found."}
              </Text>
            )}
          </Card>
        }
        ListHeaderComponent={
          <View>
            <Card className="p-4">
              <View className="flex-row items-center rounded-xl border border-border/60 bg-muted/20 px-3">
                <Search color="#a1a1aa" size={16} />
                <TextInput
                  className="flex-1 px-2 py-3 text-sm text-foreground"
                  onChangeText={setQuery}
                  placeholder="Search restaurants, coffee, activities…"
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
              <TextInput
                className="mt-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm text-foreground"
                onChangeText={setArea}
                placeholder="Search area"
                placeholderTextColor="#a1a1aa"
                value={area}
              />
              <View className="mt-3 flex-row gap-2">
                {CATEGORIES.map((option) => (
                  <Pressable
                    className={`flex-1 rounded-xl border px-3 py-2 ${
                      category === option
                        ? "border-amber-500 bg-amber-500/15"
                        : "border-border/60"
                    }`}
                    key={option}
                    onPress={() => setCategory(option)}
                  >
                    <Text
                      className={`text-center text-xs font-bold capitalize ${
                        category === option
                          ? "text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            <View className="mb-2 mt-5 flex-row items-center justify-between px-1">
              <Text className="text-sm font-bold text-muted-foreground">
                {title}
              </Text>
              <Badge variant="glass">
                <Text className="text-[10px] text-foreground">
                  {spots.length} results
                </Text>
              </Badge>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Card className="mb-2 p-4">
            <View className="flex-row items-start gap-3">
              {item.photoUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: item.photoUrl }}
                  style={{ borderRadius: 12, height: 68, width: 68 }}
                />
              ) : (
                <View className="h-[68px] w-[68px] items-center justify-center rounded-xl bg-amber-500/15">
                  <Sparkles color="#f59e0b" size={20} />
                </View>
              )}
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
                    disabled={!item.googleMapsUri}
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
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
