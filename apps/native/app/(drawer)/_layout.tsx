import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";
import { BookOpen, Flame, Sparkles } from "lucide-react-native";
import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";

function DrawerLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  return (
    <Drawer
      initialRouteName="(tabs)"
      screenOptions={{
        drawerStyle: { backgroundColor: themeColorBackground },
        headerRight: renderThemeToggle,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTintColor: themeColorForeground,
        headerTitleStyle: {
          color: themeColorForeground,
          fontWeight: "700",
        },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          drawerIcon: ({ size, color, focused }) => (
            <Flame
              size={size}
              color={focused ? "#f59e0b" : themeColorForeground}
            />
          ),
          drawerLabel: ({ color, focused }) => (
            <Text
              style={{
                color: focused ? "#f59e0b" : themeColorForeground,
                fontWeight: "600",
              }}
            >
              Home
            </Text>
          ),
          headerTitle: "Chewbuu",
        }}
      />
      <Drawer.Screen
        name="recaps"
        options={{
          drawerIcon: ({ size, focused }) => (
            <BookOpen
              size={size}
              color={focused ? "#f59e0b" : themeColorForeground}
            />
          ),
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? "#f59e0b" : color }}>Recaps</Text>
          ),
          headerTitle: "Recaps",
        }}
      />
      <Drawer.Screen
        name="index"
        options={{
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="person-circle-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>
              Account & Sign In
            </Text>
          ),
          headerTitle: "Account",
        }}
      />
      <Drawer.Screen
        name="ai"
        options={{
          drawerIcon: ({ size, color, focused }) => (
            <Sparkles
              size={size}
              color={focused ? "#f59e0b" : themeColorForeground}
            />
          ),
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? "#f59e0b" : themeColorForeground }}>
              AI Date Matchmaker
            </Text>
          ),
          headerTitle: "AI Matchmaker",
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
