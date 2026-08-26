import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  CalendarHeart,
  Flame,
  MessageCircle,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/app-theme-context";
import { cn } from "@/lib/utils";

interface TabItemConfig {
  name: string;
  label: string;
  icon: (props: {
    color: string;
    size: number;
    focused: boolean;
  }) => React.ReactNode;
  badgeCount?: number;
}

const TAB_CONFIGS: Record<string, TabItemConfig> = {
  index: {
    name: "index",
    label: "Discover",
    icon: ({ color, size, focused }) => (
      <Flame color={color} size={size} fill={focused ? color : "transparent"} />
    ),
  },
  spots: {
    name: "spots",
    label: "Spots",
    icon: ({ color, size }) => <UtensilsCrossed color={color} size={size} />,
  },
  dates: {
    name: "dates",
    label: "Dates",
    icon: ({ color, size, focused }) => (
      <CalendarHeart
        color={color}
        size={size}
        fill={focused ? color : "transparent"}
      />
    ),
    // Active date beacon
    badgeCount: 1,
  },
  chats: {
    name: "chats",
    label: "Chats",
    icon: ({ color, size, focused }) => (
      <MessageCircle
        color={color}
        size={size}
        fill={focused ? color : "transparent"}
      />
    ),
    // Unread messages
    badgeCount: 2,
  },
  profile: {
    name: "profile",
    label: "Profile",
    icon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
  },
};

export interface LiquidGlassTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: any;
}

export function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
}: LiquidGlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  return (
    <View
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom, 12) + 6,
        left: 16,
        right: 16,
        alignItems: "center",
      }}
      pointerEvents="box-none"
    >
      <View
        className={cn(
          "w-full max-w-md flex-row items-center justify-around overflow-hidden border shadow-2xl",
          isDark
            ? "border-white/15 bg-black/55 shadow-black/80"
            : "border-white/40 bg-white/75 shadow-black/15"
        )}
        style={{
          borderRadius: 36,
          height: 68,
          paddingHorizontal: 8,
        }}
      >
        {/* Native Blur Layer */}
        {Platform.OS === "ios" || Platform.OS === "android" ? (
          <BlurView
            intensity={Platform.OS === "ios" ? 75 : 95}
            tint={isDark ? "systemMaterialDark" : "systemMaterialLight"}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(22, 14, 10, 0.85)"
                  : "rgba(255, 255, 255, 0.90)",
              },
            ]}
          />
        )}

        {/* Liquid Glass Highlight Sheen */}
        <LinearGradient
          colors={
            isDark
              ? [
                  "rgba(255, 255, 255, 0.14)",
                  "rgba(255, 255, 255, 0.03)",
                  "transparent",
                ]
              : [
                  "rgba(255, 255, 255, 0.6)",
                  "rgba(255, 255, 255, 0.15)",
                  "transparent",
                ]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.9 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {state.routes.map(
          (route: { key: string; name: string }, index: number) => {
            const descriptor = descriptors[route.key];
            const options = descriptor?.options || {};
            const isFocused = state.index === index;
            const config = TAB_CONFIGS[route.name] || {
              name: route.name,
              label:
                typeof options.title === "string" ? options.title : route.name,
              icon: ({ color, size }: { color: string; size: number }) => (
                <Flame color={color} size={size} />
              ),
            };

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            // Chewbuu Gold/Amber Brand
            const activeColor = isDark ? "#e6a15c" : "#d97706";
            const inactiveColor = isDark
              ? "rgba(255, 255, 255, 0.45)"
              : "rgba(0, 0, 0, 0.45)";

            return (
              <Pressable
                key={route.name}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                className="flex-1 items-center justify-center py-1 relative"
                style={{ minHeight: 52 }}
              >
                {/* Active Tab Glow Pill */}
                {isFocused && (
                  <View
                    className="absolute inset-x-1.5 inset-y-1 rounded-2xl overflow-hidden"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(230, 161, 92, 0.18)"
                        : "rgba(217, 119, 6, 0.12)",
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(230, 161, 92, 0.35)"
                        : "rgba(217, 119, 6, 0.25)",
                    }}
                  >
                    <LinearGradient
                      colors={
                        isDark
                          ? [
                              "rgba(230, 161, 92, 0.25)",
                              "rgba(230, 161, 92, 0.05)",
                            ]
                          : [
                              "rgba(217, 119, 6, 0.18)",
                              "rgba(217, 119, 6, 0.02)",
                            ]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                )}

                {/* Icon with notification badge */}
                <View className="items-center justify-center relative">
                  {config.icon({
                    color: isFocused ? activeColor : inactiveColor,
                    size: 22,
                    focused: isFocused,
                  })}

                  {/* Optional Unread Notification Badge */}
                  {config.badgeCount && config.badgeCount > 0 && !isFocused && (
                    <View
                      className="absolute -top-1.5 -right-2 bg-amber-500 rounded-full items-center justify-center px-1"
                      style={{ minWidth: 16, height: 16 }}
                    >
                      <Text className="text-[10px] font-bold text-black leading-none">
                        {config.badgeCount}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  className={cn(
                    "text-[10px] mt-1 font-semibold tracking-tight transition-colors",
                    isFocused
                      ? isDark
                        ? "text-amber-400 font-bold"
                        : "text-amber-600 font-bold"
                      : isDark
                        ? "text-white/45"
                        : "text-black/45"
                  )}
                  numberOfLines={1}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>
    </View>
  );
}
