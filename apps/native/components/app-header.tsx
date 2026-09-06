import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { authClient } from "@/lib/auth-client";

const brandIcon = require("@/assets/images/icon.png");

export function AppHeader() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user as
    | { image?: string | null; name?: string | null }
    | undefined;

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "CG";

  return (
    <View className="flex-row items-center justify-between border-b border-border/40 bg-background px-4 pb-2.5">
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center gap-2"
        onPress={() => router.push("/(drawer)/(tabs)")}
      >
        <View className="size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
          <Image
            contentFit="cover"
            source={brandIcon}
            style={{ height: 32, width: 32 }}
          />
        </View>
        <Text className="text-base font-bold tracking-tight text-foreground">
          Chewbuu
        </Text>
      </Pressable>

      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityLabel="Notifications"
          className="size-9 items-center justify-center rounded-full border border-border/60 bg-card"
          onPress={() => router.push("/(drawer)/(tabs)/chats")}
        >
          <Bell size={16} color="#e6c46a" />
        </Pressable>
        <Pressable
          accessibilityLabel="Profile"
          className="size-9 items-center justify-center rounded-full border border-border/60 bg-card"
          onPress={() => router.push("/(drawer)")}
        >
          {user?.image ? (
            <Image
              contentFit="cover"
              source={{ uri: user.image }}
              style={{ borderRadius: 18, height: 36, width: 36 }}
            />
          ) : (
            <Text className="text-xs font-bold text-foreground">
              {initials}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
