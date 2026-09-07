import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { LiquidGlassTabBar } from "@/components/liquid-glass-tab-bar";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader />
      <Tabs
        tabBar={(props) => <LiquidGlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="spots"
          options={{
            title: "Spots",
          }}
        />
        <Tabs.Screen
          name="dates"
          options={{
            title: "Dates",
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: "Chats",
          }}
        />
        <Tabs.Screen
          name="recaps"
          options={{
            title: "Recaps",
          }}
        />
      </Tabs>
    </View>
  );
}
