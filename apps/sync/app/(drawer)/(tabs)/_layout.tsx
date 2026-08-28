import { Tabs } from "expo-router";
import React from "react";

import { LiquidGlassTabBar } from "@/components/liquid-glass-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      <Tabs.Screen name="index" options={{ title: "Overview" }} />
      <Tabs.Screen name="tables" options={{ title: "Tables" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="shifts" options={{ title: "Shifts" }} />
      <Tabs.Screen name="tips" options={{ title: "Tips" }} />
    </Tabs>
  );
}
