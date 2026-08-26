import * as Haptics from "expo-haptics";
import {
  Camera,
  Compass,
  FileText,
  MapPin,
  Search,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react-native";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassView } from "@/components/ui/glass-view";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Eat", "Drink", "Play", "Move", "Watch", "Talk"] as const;

const MOCK_SPOTS = [
  {
    id: "s1",
    name: "Daikaya Izakaya & Ramen",
    category: "Eat",
    cuisine: "Japanese • Craft Cocktails",
    address: "705 6th St NW, Washington, DC",
    rating: 4.8,
    reviews: 320,
    price: "$$",
    distance: "0.4 mi",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
    menuScraped: true,
    topItems: ["Spicy Miso Ramen", "Wagyu Skewers", "Yuzu Highball"],
    verifiedVenue: true,
  },
  {
    id: "s2",
    name: "Silver Lyan Speakeasy",
    category: "Drink",
    cuisine: "Cocktail Lounge • Intimate",
    address: "900 F St NW, Washington, DC",
    rating: 4.9,
    reviews: 190,
    price: "$$$",
    distance: "0.7 mi",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=80",
    menuScraped: true,
    topItems: ["Project Sazerac", "Truffle Fries", "Oysters"],
    verifiedVenue: true,
  },
  {
    id: "s3",
    name: "Swingers Crazy Golf",
    category: "Play",
    cuisine: "Mini Golf • Street Food • DJ",
    address: "1330 19th St NW, Washington, DC",
    rating: 4.7,
    reviews: 410,
    price: "$$",
    distance: "1.2 mi",
    image:
      "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80",
    menuScraped: false,
    topItems: ["9-Hole Round", "Patty & Bun Sliders", "Frozen Margarita"],
    verifiedVenue: false,
  },
];

export default function SpotsScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string>("Eat");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSpots = MOCK_SPOTS.filter((spot) => {
    const matchesCategory = spot.category === activeCategory;
    const matchesSearch =
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="px-5 pb-3 pt-2 flex-col gap-3"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-400/40 items-center justify-center">
              <Compass size={16} color="#f59e0b" />
            </View>
            <Text className="text-xl font-extrabold text-foreground tracking-tight">
              Date Spots
            </Text>
          </View>

          <Badge variant="glass" className="px-3 py-1">
            <Text className="text-xs font-semibold text-muted-foreground">
              GPS Verified
            </Text>
          </Badge>
        </View>

        {/* Search Bar */}
        <Input
          placeholder="Search restaurants, cocktail lounges, activities..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          startIcon={<Search size={16} color="#888888" />}
          className="h-11"
        />

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          className="py-1"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(cat);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-full border transition-all",
                  isSelected
                    ? "bg-amber-500 border-amber-400 shadow-xs"
                    : "bg-card/60 border-border/80"
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-bold",
                    isSelected ? "text-black" : "text-muted-foreground"
                  )}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Spot Listings */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 110,
          paddingTop: 8,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {filteredSpots.map((spot) => (
          <Card key={spot.id} className="p-0 overflow-hidden border-border/70">
            {/* Spot Image Header */}
            <View className="relative h-44 w-full bg-muted">
              <Image
                source={{ uri: spot.image }}
                className="w-full h-full object-cover"
              />

              {/* Price & Rating Badges */}
              <View className="absolute top-3 left-3 flex-row gap-2">
                <GlassView
                  className="px-2.5 py-1 border-white/20"
                  borderRadius={14}
                >
                  <Text className="text-[11px] font-bold text-white">
                    {spot.price} • {spot.distance}
                  </Text>
                </GlassView>

                {spot.menuScraped && (
                  <GlassView
                    className="flex-row items-center gap-1 px-2.5 py-1 border-amber-400/30 bg-amber-950/50"
                    borderRadius={14}
                  >
                    <FileText size={11} color="#f59e0b" />
                    <Text className="text-[10px] font-bold text-amber-300">
                      Menu Ready
                    </Text>
                  </GlassView>
                )}
              </View>

              <View className="absolute top-3 right-3">
                <GlassView
                  className="flex-row items-center gap-1 px-2 py-1 border-white/20"
                  borderRadius={14}
                >
                  <Star size={12} color="#fbbf24" fill="#fbbf24" />
                  <Text className="text-[11px] font-bold text-white">
                    {spot.rating}
                  </Text>
                </GlassView>
              </View>
            </View>

            {/* Spot Content */}
            <View className="p-4 flex-col gap-2">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-base font-bold text-foreground">
                  {spot.name}
                </Text>
              </View>

              <Text className="text-xs font-semibold text-amber-500">
                {spot.cuisine}
              </Text>

              <View className="flex-row items-center gap-1">
                <MapPin size={12} color="#71717a" />
                <Text className="text-xs text-muted-foreground">
                  {spot.address}
                </Text>
              </View>

              {/* Firecrawl Menu Highlights */}
              <View className="mt-2 rounded-2xl bg-muted/40 border border-border/40 p-3 flex-col gap-1.5">
                <Text className="text-[11px] font-bold text-foreground flex-row items-center">
                  🔥 Popular Date Dishes & Drinks
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {spot.topItems.map((item) => (
                    <Badge key={item} variant="outline" className="px-2 py-0.5">
                      <Text className="text-[10px] text-foreground font-medium">
                        {item}
                      </Text>
                    </Badge>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Camera size={13} color="#a1a1aa" />
                  <Text className="text-xs font-semibold text-foreground">
                    Upload Menu
                  </Text>
                </Button>

                <Button
                  variant="sugar"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onPress={() => {
                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium
                    );
                  }}
                >
                  <UtensilsCrossed size={13} color="#000000" />
                  <Text className="text-xs font-bold text-black">
                    Propose Date
                  </Text>
                </Button>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
