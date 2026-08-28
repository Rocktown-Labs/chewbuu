import { usePathname, useRouter } from "expo-router";
import { DrawerContentScrollView } from "expo-router/drawer";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import {
  BriefcaseBusiness,
  CalendarClock,
  ChefHat,
  CircleUserRound,
  Clock3,
  Cog,
  LayoutDashboard,
  MessageCircle,
  ReceiptText,
  Store,
  Table2,
  Tags,
  Users,
  Utensils,
  X,
} from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { SYNC_COLORS } from "@/components/sync-ui";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    title: "Operations",
    items: [
      { label: "Overview", href: "/(drawer)/(tabs)", icon: LayoutDashboard },
      {
        label: "Tables & floor",
        href: "/(drawer)/(tabs)/tables",
        icon: Table2,
      },
      { label: "Orders", href: "/(drawer)/(tabs)/orders", icon: ReceiptText },
      {
        label: "Reservations",
        href: "/(drawer)/reservations",
        icon: CalendarClock,
      },
      { label: "Kitchen", href: "/(drawer)/kitchen", icon: ChefHat },
      { label: "Clock in", href: "/(drawer)/clock-in", icon: Clock3 },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Staff & shifts", href: "/(drawer)/(tabs)/shifts", icon: Users },
      { label: "Guests", href: "/(drawer)/customers", icon: CircleUserRound },
      { label: "Work chat", href: "/(drawer)/chat", icon: MessageCircle },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Menu", href: "/(drawer)/menu", icon: Utensils },
      { label: "Specials", href: "/(drawer)/specials", icon: Tags },
      { label: "Jobs", href: "/(drawer)/jobs", icon: BriefcaseBusiness },
      { label: "Business settings", href: "/(drawer)/settings", icon: Cog },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Sync account", href: "/(drawer)", icon: Store }],
  },
] as const;
export function SyncDrawerContent(props: DrawerContentComponentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedLocation } = useSyncWorkspace();
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingBottom: 32 }}
      style={{ backgroundColor: SYNC_COLORS.burgundy }}
    >
      <View className="gap-5 px-5 pb-5 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl border border-[#f4c95d]/30 bg-[#f4c95d]">
              <Store size={21} color={SYNC_COLORS.burgundy} />
            </View>
            <View>
              <Text className="text-lg font-black text-[#fff6dd]">
                Chewbuu Sync
              </Text>
              <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#f4c95d]">
                Venue operations
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Close navigation"
            accessibilityRole="button"
            onPress={() => props.navigation.closeDrawer()}
            className="h-9 w-9 items-center justify-center rounded-xl border border-[#f4c95d]/20 bg-[#581631]"
          >
            <X size={17} color={SYNC_COLORS.cream} />
          </Pressable>
        </View>
        <View className="rounded-2xl border border-[#f4c95d]/20 bg-[#581631] p-3">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-[#d9bda9]">
            Active location
          </Text>
          <Text
            className="mt-1 text-sm font-black text-[#fff6dd]"
            numberOfLines={1}
          >
            {selectedLocation?.name ?? "Choose a venue"}
          </Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-[#8bd6a1]" />
            <Text className="text-[11px] font-semibold text-[#d9bda9]">
              Live workspace
            </Text>
          </View>
        </View>
      </View>
      <View className="gap-5 px-3">
        {GROUPS.map((group) => (
          <View key={group.title} className="gap-1">
            <Text className="px-3 pb-1 text-[10px] font-black uppercase tracking-[1.5px] text-[#d9bda9]">
              {group.title}
            </Text>
            {group.items.map((item) => {
              const selected =
                pathname === item.href ||
                (item.href === "/(drawer)/(tabs)" &&
                  pathname.endsWith("/(tabs)"));
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    props.navigation.closeDrawer();
                    router.push(item.href as never);
                  }}
                  className={cn(
                    "flex-row items-center gap-3 rounded-2xl px-3 py-3",
                    selected ? "bg-[#f4c95d]" : "bg-transparent"
                  )}
                >
                  <Icon
                    size={18}
                    color={selected ? SYNC_COLORS.burgundy : SYNC_COLORS.cream}
                  />
                  <Text
                    className={cn(
                      "flex-1 text-sm font-bold",
                      selected ? "text-[#410d25]" : "text-[#fff6dd]"
                    )}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </DrawerContentScrollView>
  );
}
