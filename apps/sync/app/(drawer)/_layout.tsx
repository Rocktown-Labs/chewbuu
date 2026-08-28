import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { SyncDrawerContent } from "@/components/sync-drawer-content";
import { SYNC_COLORS } from "@/components/sync-ui";
import { SyncWorkspaceProvider } from "@/contexts/sync-workspace-context";
import { authClient } from "@/lib/auth-client";

const HIDDEN_DRAWER_ITEM = { display: "none" } as const;
const ROUTES = [
  "reservations",
  "kitchen",
  "clock-in",
  "customers",
  "chat",
  "menu",
  "specials",
  "jobs",
  "settings",
  "order-new",
  "reservation-new",
  "customer-new",
  "menu-item-new",
  "job-new",
  "special-new",
  "table-detail",
  "ai",
  "index",
] as const;
function SyncDrawer() {
  return (
    <Drawer
      initialRouteName="(tabs)"
      drawerContent={(props) => <SyncDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: { backgroundColor: SYNC_COLORS.burgundy, width: 310 },
        headerShown: false,
        swipeEdgeWidth: 80,
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{ drawerItemStyle: HIDDEN_DRAWER_ITEM }}
      />
      {ROUTES.map((name) => (
        <Drawer.Screen
          key={name}
          name={name}
          options={{ drawerItemStyle: HIDDEN_DRAWER_ITEM }}
        />
      ))}
    </Drawer>
  );
}
export default function DrawerLayout() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending)
    return (
      <View className="flex-1 items-center justify-center bg-[#410d25]">
        <ActivityIndicator color={SYNC_COLORS.gold} />
      </View>
    );
  if (!session?.user) return <Redirect href="/auth/login" />;
  return (
    <SyncWorkspaceProvider>
      <SyncDrawer />
    </SyncWorkspaceProvider>
  );
}
