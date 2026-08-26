import * as Haptics from "expo-haptics";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  Clock,
  Download,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react-native";
import React, { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassView } from "@/components/ui/glass-view";

export default function DatesScreen() {
  const insets = useSafeAreaInsets();
  const [safetyPingsActive, setSafetyPingsActive] = useState(true);

  const handleExportIcs = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleFakeCall = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="px-5 pb-3 pt-2 flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-400/40 items-center justify-center">
            <CalendarDays size={16} color="#f59e0b" />
          </View>
          <Text className="text-xl font-extrabold text-foreground tracking-tight">
            My Dates & Safety
          </Text>
        </View>

        <Badge variant="success" className="px-3 py-1">
          <Text className="text-xs font-bold text-emerald-400">1 Upcoming</Text>
        </Badge>
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
        {/* Active Upcoming Date Card */}
        <Card className="border-amber-500/50 bg-card p-5 shadow-xl relative overflow-hidden">
          <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
            <View className="flex-row items-center gap-2">
              <Badge variant="sugar" className="px-2.5 py-0.5">
                <Text className="text-[10px] font-bold text-amber-300">
                  Confirmed Date
                </Text>
              </Badge>
              <Text className="text-xs font-semibold text-muted-foreground">
                Thursday, 7:30 PM
              </Text>
            </View>

            <Button
              size="sm"
              variant="glass"
              className="h-8 px-2.5 gap-1"
              onPress={handleExportIcs}
            >
              <Download size={12} color="#f59e0b" />
              <Text className="text-[10px] font-bold text-amber-400">
                .ICS Sync
              </Text>
            </Button>
          </View>

          {/* Partner & Venue Details */}
          <View className="flex-row items-center gap-3.5 my-3.5">
            <Avatar size="lg">
              <AvatarImage
                source={{
                  uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
                }}
              />
              <AvatarFallback>ER</AvatarFallback>
            </Avatar>

            <View className="flex-col gap-0.5 flex-1">
              <Text className="text-base font-bold text-foreground">
                Elena Rostova
              </Text>
              <Text className="text-xs font-semibold text-amber-500">
                Daikaya Izakaya • Table for 2
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <MapPin size={11} color="#71717a" />
                <Text className="text-[11px] text-muted-foreground">
                  705 6th St NW, Washington, DC
                </Text>
              </View>
            </View>
          </View>

          {/* Pre-Ordered Items Summary (Zero Interruption Dining) */}
          <View className="rounded-2xl bg-muted/40 border border-border/50 p-3.5 flex-col gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-foreground flex-row items-center gap-1.5">
                🍽️ Pre-Ordered Courses
              </Text>
              <Text className="text-[10px] font-bold text-emerald-400">
                Auto-Pay Settled ($86.00)
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              • 2x Yuzu Highball Cocktails{"\n"}• 1x Spicy Miso Ramen & 1x Shoyu
              Ramen{"\n"}• 1x Wagyu Beef Skewers
            </Text>
            <Text className="text-[10px] text-amber-400 italic">
              ✨ Server will deliver dishes on arrival. No bill-splitting
              required.
            </Text>
          </View>

          {/* Live Safety Beacon Status */}
          <GlassView
            className="mt-4 p-3.5 border-emerald-500/40 bg-emerald-950/30 flex-col gap-2"
            borderRadius={20}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <ShieldCheck size={16} color="#10b981" />
                <Text className="text-xs font-bold text-emerald-300">
                  Safety Beacon Active
                </Text>
              </View>
              <Badge variant="success" className="px-2 py-0.5">
                <Text className="text-[10px] font-bold text-emerald-400">
                  2 Contacts Connected
                </Text>
              </Badge>
            </View>

            <Text className="text-[11px] text-zinc-300">
              Trusted friends (Sarah & David) will receive automated location
              pings at 8:30 PM & 9:30 PM.
            </Text>

            {/* Emergency / Discrete Exit Tool */}
            <View className="flex-row items-center gap-2 mt-1">
              <Button
                size="sm"
                variant="destructive"
                className="h-8 flex-1 gap-1"
                onPress={handleFakeCall}
              >
                <PhoneCall size={12} color="#ffffff" />
                <Text className="text-[11px] font-bold text-white">
                  Trigger Fake Call
                </Text>
              </Button>
            </View>
          </GlassView>
        </Card>

        {/* Date Proposal History */}
        <View className="flex-col gap-2 mt-2">
          <Text className="text-sm font-bold text-muted-foreground px-1">
            Past Dates & Spots
          </Text>

          <Card className="p-4 border-border/60">
            <View className="flex-row items-center justify-between">
              <View className="flex-col gap-0.5">
                <Text className="text-sm font-bold text-foreground">
                  Silver Lyan Speakeasy
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Date with Marcus V. • Aug 19, 2026
                </Text>
              </View>
              <Badge variant="outline" className="px-2.5 py-1">
                <Text className="text-xs font-semibold text-emerald-400">
                  Completed
                </Text>
              </Badge>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
