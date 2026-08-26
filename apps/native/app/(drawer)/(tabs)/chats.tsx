import * as Haptics from "expo-haptics";
import {
  MessageCircle,
  Sparkles,
  UtensilsCrossed,
  Video,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassView } from "@/components/ui/glass-view";

const MOCK_CHATS = [
  {
    id: "c1",
    name: "Elena Rostova",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    lastMessage: "I saw you picked Daikaya! Super excited for the ramen.",
    time: "2m ago",
    unread: 2,
    online: true,
    spotProposal: "Daikaya Izakaya",
  },
  {
    id: "c2",
    name: "Marcus Vance",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    lastMessage: "Did you catch that new A24 release last weekend?",
    time: "1h ago",
    unread: 0,
    online: false,
    spotProposal: null,
  },
  {
    id: "c3",
    name: "Chloe Chen",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    lastMessage: "Sounds like a plan! Let's do 7:00 PM.",
    time: "Yesterday",
    unread: 0,
    online: false,
    spotProposal: "Swingers Crazy Golf",
  },
];

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();

  const handleStartSpeedDate = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            <MessageCircle size={16} color="#f59e0b" />
          </View>
          <Text className="text-xl font-extrabold text-foreground tracking-tight">
            Messages
          </Text>
        </View>

        <Badge variant="sugar" className="px-3 py-1">
          <Text className="text-xs font-bold text-amber-300">
            Active Orbits
          </Text>
        </Badge>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 110,
          paddingTop: 8,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Speed Dating Room Banner */}
        <GlassView
          className="p-4 border-amber-500/40 bg-amber-950/40 flex-col gap-2.5 shadow-lg"
          borderRadius={24}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
              <Text className="text-xs font-bold text-amber-300">
                Live Speed Dating Queue (Tonight 8 PM)
              </Text>
            </View>
            <Badge variant="glass" className="px-2 py-0.5">
              <Text className="text-[10px] font-bold text-white">
                18 Singles Active
              </Text>
            </Badge>
          </View>

          <Text className="text-xs text-zinc-200">
            3-minute timed video vibe checks with verified matches in your area.
          </Text>

          <Button
            size="sm"
            variant="sugar"
            className="h-9 gap-1.5 mt-1"
            onPress={handleStartSpeedDate}
          >
            <Video size={14} color="#000000" />
            <Text className="text-xs font-bold text-black">
              Enter Speed Dating Room
            </Text>
          </Button>
        </GlassView>

        {/* Chat List */}
        <View className="flex-col gap-2 mt-1">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            Active Match Conversations (3 Max)
          </Text>

          {MOCK_CHATS.map((chat) => (
            <Pressable
              key={chat.id}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className="p-3.5 rounded-3xl border border-border/70 bg-card active:bg-card/60 flex-row items-center gap-3.5 transition-all"
            >
              <View className="relative">
                <Avatar size="lg">
                  <AvatarImage source={{ uri: chat.avatar }} />
                  <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {chat.online && (
                  <View className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                )}
              </View>

              <View className="flex-col gap-0.5 flex-1 pr-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-foreground">
                    {chat.name}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground">
                    {chat.time}
                  </Text>
                </View>

                {chat.spotProposal && (
                  <View className="flex-row items-center gap-1 my-0.5">
                    <UtensilsCrossed size={11} color="#f59e0b" />
                    <Text className="text-[11px] font-semibold text-amber-400">
                      Date Spot: {chat.spotProposal}
                    </Text>
                  </View>
                )}

                <Text
                  className="text-xs text-muted-foreground"
                  numberOfLines={1}
                >
                  {chat.lastMessage}
                </Text>
              </View>

              {chat.unread > 0 && (
                <View className="size-5 rounded-full bg-amber-500 items-center justify-center">
                  <Text className="text-[10px] font-bold text-black">
                    {chat.unread}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
