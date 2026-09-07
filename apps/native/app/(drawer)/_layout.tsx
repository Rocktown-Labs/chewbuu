import { Drawer } from "expo-router/drawer";
import React from "react";

const HIDDEN_DRAWER_ITEM = {
  drawerItemStyle: { display: "none" as const },
};

function DrawerLayout() {
  return (
    <Drawer
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        swipeEdgeWidth: 0,
        swipeEnabled: false,
      }}
    >
      <Drawer.Screen name="(tabs)" options={HIDDEN_DRAWER_ITEM} />
      <Drawer.Screen name="index" options={HIDDEN_DRAWER_ITEM} />
      <Drawer.Screen name="profile" options={HIDDEN_DRAWER_ITEM} />
      <Drawer.Screen name="ai" options={HIDDEN_DRAWER_ITEM} />
    </Drawer>
  );
}

export default DrawerLayout;
