import * as Haptics from "expo-haptics";
import {
  Crown,
  Edit3,
  Moon,
  Plus,
  Radio,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserPlus,
  Users,
  Video,
} from "lucide-react-native";
import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassView } from "@/components/ui/glass-view";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useAppTheme();

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="px-5 pb-3 pt-2 flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-400/40 items-center justify-center">
            <ShieldCheck size={16} color="#f59e0b" />
          </View>
          <Text className="text-xl font-extrabold text-foreground tracking-tight">
            My Profile & Safety
          </Text>
        </View>

        {/* Theme Toggle Button */}
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleTheme();
          }}
          className="size-9 rounded-full border border-border/80 bg-card items-center justify-center"
        >
          {isDark ? (
            <Sun size={16} color="#fbbf24" />
          ) : (
            <Moon size={16} color="#3b82f6" />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 110,
          paddingTop: 8,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <Card className="p-5 border-border/80 flex-col items-center text-center relative overflow-hidden">
          <View className="relative">
            <Avatar size="xl" className="border-2 border-amber-500/50">
              <AvatarImage
                source={{
                  uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
                }}
              />
              <AvatarFallback>CB</AvatarFallback>
            </Avatar>
            <View className="absolute bottom-0 right-0 size-6 rounded-full bg-emerald-500 border-2 border-background items-center justify-center">
              <ShieldCheck size={13} color="#ffffff" />
            </View>
          </View>

          <Text className="text-lg font-bold text-foreground mt-3">
            Elena Rostova, 26
          </Text>
          <Text className="text-xs font-semibold text-amber-500">
            @elena.r • Live Capture Verified
          </Text>
          <Text className="text-xs text-muted-foreground mt-1 text-center max-w-xs leading-relaxed">
            "Video first, real dinner dates second. Speakeasies & late-night
            ramen."
          </Text>

          <View className="flex-row items-center gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 gap-1.5"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Edit3 size={13} color="#a1a1aa" />
              <Text className="text-xs font-semibold text-foreground">
                Edit Profile
              </Text>
            </Button>

            <Button
              size="sm"
              variant="glass"
              className="h-9 px-4 gap-1.5"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Video size={13} color="#f59e0b" />
              <Text className="text-xs font-bold text-amber-400">
                Update Intro
              </Text>
            </Button>
          </View>
        </Card>

        {/* Sugar VIP & Crews Event Hosting Card */}
        <GlassView
          className="p-5 border-amber-500/40 bg-amber-950/40 flex-col gap-3 shadow-xl"
          borderRadius={28}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Crown size={18} color="#fbbf24" fill="#fbbf24" />
              <Text className="text-base font-extrabold text-amber-300">
                Sugar VIP • Crews & Ads
              </Text>
            </View>
            <Badge variant="sugar" className="px-2.5 py-0.5">
              <Text className="text-[10px] font-bold text-amber-300">
                VIP Tier
              </Text>
            </Badge>
          </View>

          <Text className="text-xs text-zinc-200 leading-relaxed">
            Host local social events, parties, and mixers under your own{" "}
            <Text className="font-bold text-amber-300">Crew</Text>, with
            built-in ad promotion tools in the Chewbuu feed.
          </Text>

          <View className="flex-row items-center gap-2 mt-1">
            <Button
              size="sm"
              variant="sugar"
              className="flex-1 gap-1.5"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Plus size={14} color="#000000" />
              <Text className="text-xs font-bold text-black">
                Create a Crew Event
              </Text>
            </Button>

            <Button
              size="sm"
              variant="glass"
              className="gap-1.5 px-3"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Radio size={14} color="#f59e0b" />
              <Text className="text-xs font-bold text-amber-400">Run Ad</Text>
            </Button>
          </View>
        </GlassView>

        {/* Friend Safety Circle ("Friends who should know you're going out") */}
        <Card className="p-4 border-border/80 flex-col gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Users size={16} color="#10b981" />
              <Text className="text-sm font-bold text-foreground">
                Safety Circle Contacts
              </Text>
            </View>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <UserPlus size={13} color="#10b981" />
              <Text className="text-[11px] font-bold text-emerald-400">
                + Add Friend
              </Text>
            </Button>
          </View>

          <Text className="text-xs text-muted-foreground leading-relaxed">
            These friends receive automated Safety Beacon check-in pings during
            active dates.
          </Text>

          <View className="flex-col gap-2 mt-1">
            <View className="flex-row items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/40">
              <View className="flex-row items-center gap-2.5">
                <Avatar size="sm">
                  <AvatarFallback>SK</AvatarFallback>
                </Avatar>
                <View className="flex-col">
                  <Text className="text-xs font-bold text-foreground">
                    Sarah Kim
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">
                    +1 (202) 555-0182 • Automated Ping: On
                  </Text>
                </View>
              </View>
              <Badge variant="success" className="px-2 py-0.5">
                <Text className="text-[9px] font-bold text-emerald-400">
                  Active
                </Text>
              </Badge>
            </View>

            <View className="flex-row items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/40">
              <View className="flex-row items-center gap-2.5">
                <Avatar size="sm">
                  <AvatarFallback>DL</AvatarFallback>
                </Avatar>
                <View className="flex-col">
                  <Text className="text-xs font-bold text-foreground">
                    David Lee
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">
                    +1 (202) 555-0144 • Automated Ping: On
                  </Text>
                </View>
              </View>
              <Badge variant="success" className="px-2 py-0.5">
                <Text className="text-[9px] font-bold text-emerald-400">
                  Active
                </Text>
              </Badge>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
