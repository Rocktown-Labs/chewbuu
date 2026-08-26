import { Tabs } from "expo-router";
import React from "react";

import { LiquidGlassTabBar } from "@/components/liquid-glass-tab-bar";

export default function TabLayout() {
  return (
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
          title: "Discover",
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
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
