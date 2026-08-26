import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  CalendarPlus,
  CheckCircle2,
  Heart,
  Info,
  MapPin,
  Sparkles,
  Video,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassView } from "@/components/ui/glass-view";
import { useAppTheme } from "@/contexts/app-theme-context";

const { width } = Dimensions.get("window");

const MOCK_PROFILES = [
  {
    id: "p1",
    name: "Elena Rostova",
    age: 26,
    occupation: "UX Architect & Foodie",
    area: "Downtown / Arts District",
    bio: "Video first, real dinner dates second. Looking for someone to explore hidden speakeasies and late-night ramen spots.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    hasVideo: true,
    interests: ["Ramen", "A24 Films", "Live Jazz", "Pottery"],
    favoriteSpot: "Daikaya Izakaya",
    verified: true,
  },
  {
    id: "p2",
    name: "Marcus Vance",
    age: 29,
    occupation: "Sound Designer & Runner",
    area: "West End",
    bio: "Coffee snob, vinyl collector, and weekend trail runner. Let's grab espresso and talk favorite directors.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    hasVideo: true,
    interests: ["Espresso", "Film Scoring", "Rock Climbing", "Vinyl"],
    favoriteSpot: "Blue Bottle Roastery",
    verified: true,
  },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const profile = MOCK_PROFILES[currentIndex % MOCK_PROFILES.length];

  const handleLike = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePass = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleVibeCheck = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Top Header Bar */}
      <View
        className="flex-row items-center justify-between px-5 pb-3 pt-2"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-400/40 items-center justify-center">
            <Sparkles size={16} color="#f59e0b" />
          </View>
          <Text className="text-xl font-extrabold text-foreground tracking-tight">
            Chewbuu
          </Text>
        </View>

        <Badge variant="sugar" className="px-3 py-1">
          <Text className="text-xs font-bold text-amber-300">Live Radar</Text>
        </Badge>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Discovery Card with Liquid Glass Overlay */}
        <View
          className="relative rounded-[36px] overflow-hidden border border-border/60 bg-card shadow-2xl mt-2"
          style={{ width: width - 32, height: 490 }}
        >
          <Image
            source={{ uri: profile.image }}
            className="w-full h-full object-cover"
          />

          {/* Video Verification Badge */}
          <View className="absolute top-4 left-4 flex-row gap-2">
            {profile.verified && (
              <GlassView
                className="flex-row items-center gap-1.5 px-3 py-1.5 border-emerald-500/40 bg-emerald-950/60"
                borderRadius={20}
              >
                <CheckCircle2 size={13} color="#10b981" />
                <Text className="text-[11px] font-bold text-emerald-300">
                  Live Verified
                </Text>
              </GlassView>
            )}
            {profile.hasVideo && (
              <GlassView
                className="flex-row items-center gap-1.5 px-3 py-1.5 border-amber-400/40 bg-amber-950/60"
                borderRadius={20}
              >
                <Video size={13} color="#f59e0b" />
                <Text className="text-[11px] font-bold text-amber-300">
                  60s Intro
                </Text>
              </GlassView>
            )}
          </View>

          {/* Bottom Card Glass Metadata Panel */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.92)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: 24,
            }}
          >
            <View className="flex-col gap-1.5">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-2xl font-black text-white tracking-tight">
                  {profile.name}, {profile.age}
                </Text>
              </View>

              <Text className="text-xs font-semibold text-amber-400">
                {profile.occupation}
              </Text>

              <View className="flex-row items-center gap-1.5 mt-0.5">
                <MapPin size={12} color="#d4d4d8" />
                <Text className="text-xs font-medium text-zinc-300">
                  {profile.area}
                </Text>
              </View>

              <Text
                className="text-xs text-zinc-200 mt-2 leading-relaxed"
                numberOfLines={2}
              >
                "{profile.bio}"
              </Text>

              {/* Interest Tag Chips */}
              <View className="flex-row flex-wrap gap-1.5 mt-3">
                {profile.interests.map((interest) => (
                  <View
                    key={interest}
                    className="rounded-full px-2.5 py-1 bg-white/15 border border-white/20"
                  >
                    <Text className="text-[10px] font-semibold text-white">
                      {interest}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Action Controls: Pass, 3-Min Vibe Check, Like, Propose Spot */}
        <View className="flex-row items-center justify-center gap-4 mt-5">
          {/* Pass Button */}
          <Pressable
            onPress={handlePass}
            className="size-14 rounded-full border border-red-500/30 bg-red-500/10 items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <X size={24} color="#ef4444" />
          </Pressable>

          {/* 3-Min Video Vibe Check Button */}
          <Pressable
            onPress={handleVibeCheck}
            className="h-14 px-5 rounded-full border border-amber-500/40 bg-amber-500/15 flex-row items-center gap-2 shadow-lg active:scale-95"
          >
            <Video size={18} color="#f59e0b" />
            <Text className="text-xs font-bold text-amber-400">
              3-Min Vibe Check
            </Text>
          </Pressable>

          {/* Like / Match Button */}
          <Pressable
            onPress={handleLike}
            className="size-14 rounded-full border border-emerald-500/40 bg-emerald-500/20 items-center justify-center shadow-lg active:scale-95"
          >
            <Heart size={24} color="#10b981" fill="#10b981" />
          </Pressable>
        </View>

        {/* Spot Match Suggestion Banner */}
        <GlassView
          className="mt-6 p-4 border-amber-500/30 bg-amber-500/5 flex-row items-center justify-between"
          borderRadius={24}
        >
          <View className="flex-col gap-0.5 flex-1 pr-3">
            <Text className="text-xs font-bold text-amber-400">
              Top Date Spot Match
            </Text>
            <Text className="text-xs font-semibold text-foreground">
              {profile.favoriteSpot}
            </Text>
            <Text className="text-[10px] text-muted-foreground">
              Pre-order drinks & invite {profile.name.split(" ")[0]}
            </Text>
          </View>

          <Button
            size="sm"
            variant="sugar"
            className="h-9 px-3.5 gap-1.5"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <CalendarPlus size={14} color="#000000" />
            <Text className="text-xs font-bold text-black">Invite</Text>
          </Button>
        </GlassView>
      </ScrollView>
    </View>
  );
}
