import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs/types";
import {
  BarChart3,
  Clock3,
  ReceiptText,
  Table2,
  Users,
} from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SYNC_COLORS } from "@/components/sync-ui";

const TAB_CONFIGS = {
  index: { label: "Home", icon: BarChart3 },
  tables: { label: "Tables", icon: Table2 },
  orders: { label: "Orders", icon: ReceiptText },
  shifts: { label: "Shifts", icon: Clock3 },
  tips: { label: "Tips", icon: Users },
} as const;
export function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{
        bottom: Math.max(insets.bottom, 8),
        left: 12,
        position: "absolute",
        right: 12,
      }}
    >
      <View className="flex-row items-center justify-around rounded-[28px] border border-[#f4c95d]/20 bg-[#35091e] px-1 py-1 shadow-2xl">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config =
            TAB_CONFIGS[route.name as keyof typeof TAB_CONFIGS] ??
            TAB_CONFIGS.index;
          const Icon = config.icon;
          const options = descriptors[route.key]?.options;
          return (
            <Pressable
              key={route.key}
              accessibilityLabel={
                options?.tabBarAccessibilityLabel ?? config.label
              }
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onLongPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.emit({ type: "tabLongPress", target: route.key });
              }}
              onPress={() => {
                const event = navigation.emit({
                  canPreventDefault: true,
                  target: route.key,
                  type: "tabPress",
                });
                if (!isFocused && !event.defaultPrevented) {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(route.name);
                }
              }}
              className={`min-h-14 flex-1 items-center justify-center rounded-3xl gap-0.5 ${isFocused ? "bg-[#f4c95d]" : "bg-transparent"}`}
            >
              <Icon
                size={19}
                color={isFocused ? SYNC_COLORS.burgundy : SYNC_COLORS.muted}
              />
              <Text
                className={`text-[10px] font-black ${isFocused ? "text-[#410d25]" : "text-[#d9bda9]"}`}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
