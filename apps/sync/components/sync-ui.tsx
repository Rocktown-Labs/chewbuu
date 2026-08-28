import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Menu,
  RefreshCw,
  Store,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { cn } from "@/lib/utils";

export const SYNC_COLORS = {
  burgundy: "#410d25",
  burgundyCard: "#581631",
  burgundyRaised: "#6b2342",
  cream: "#fff6dd",
  gold: "#f4c95d",
  goldMuted: "#dcae43",
  muted: "#d9bda9",
  success: "#8bd6a1",
  danger: "#ff9a91",
} as const;
export function SyncLoading({
  label = "Loading workspace",
}: {
  label?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-[#410d25]">
      <ActivityIndicator color={SYNC_COLORS.gold} />
      <Text className="text-xs font-semibold text-[#d9bda9]">{label}</Text>
    </View>
  );
}
export function SyncError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-[#410d25] px-6">
      <View className="h-14 w-14 items-center justify-center rounded-3xl border border-[#ff9a91]/30 bg-[#ff9a91]/10">
        <AlertCircle size={26} color={SYNC_COLORS.danger} />
      </View>
      <View className="items-center gap-1">
        <Text className="text-base font-extrabold text-[#fff6dd]">
          Sync is unavailable
        </Text>
        <Text className="text-center text-sm leading-5 text-[#d9bda9]">
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Button variant="sugar" size="sm" onPress={onRetry}>
          Try again
        </Button>
      ) : null}
    </View>
  );
}
export function SyncEmpty({
  icon: Icon = Store,
  title,
  detail,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="items-center gap-2 border-dashed border-[#f4c95d]/30 bg-[#581631]/50 p-6">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#f4c95d]/10">
        <Icon size={22} color={SYNC_COLORS.gold} />
      </View>
      <Text className="text-center text-sm font-bold text-[#fff6dd]">
        {title}
      </Text>
      {detail ? (
        <Text className="text-center text-xs leading-5 text-[#d9bda9]">
          {detail}
        </Text>
      ) : null}
      {action}
    </Card>
  );
}
export function SyncHeader({
  title,
  eyebrow = "CHEWBUU SYNC",
  subtitle,
  icon: Icon,
  back = false,
  right,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  icon?: LucideIcon;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  return (
    <View
      style={{ paddingTop: insets.top + 8 }}
      className="flex-row items-start gap-3 border-b border-[#f4c95d]/10 bg-[#410d25] px-5 pb-4"
    >
      <Pressable
        accessibilityLabel={back ? "Go back" : "Open Sync navigation"}
        accessibilityRole="button"
        className="mt-1 h-10 w-10 items-center justify-center rounded-2xl border border-[#f4c95d]/20 bg-[#581631]"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (back) router.back();
          else navigation.dispatch({ type: "DRAWER_OPEN" } as never);
        }}
      >
        {back ? (
          <ArrowLeft size={18} color={SYNC_COLORS.gold} />
        ) : (
          <Menu size={18} color={SYNC_COLORS.gold} />
        )}
      </Pressable>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[10px] font-black tracking-[2px] text-[#f4c95d]">
          {eyebrow}
        </Text>
        <View className="flex-row items-center gap-2">
          {Icon ? <Icon size={20} color={SYNC_COLORS.cream} /> : null}
          <Text className="text-2xl font-black tracking-tight text-[#fff6dd]">
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text className="text-xs leading-5 text-[#d9bda9]">{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
export function SyncPage({
  title,
  subtitle,
  icon,
  back,
  right,
  children,
  refreshing,
  onRefresh,
  scroll = true,
  contentContainerStyle,
  scrollViewProps,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  back?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
}) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        {
          gap: 14,
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 96,
        },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            tintColor={SYNC_COLORS.gold}
            colors={[SYNC_COLORS.gold]}
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1">{children}</View>
  );
  return (
    <View className="flex-1 bg-[#410d25]">
      <SyncHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        back={back}
        right={right}
      />
      {body}
    </View>
  );
}
export function SyncLocationSwitcher() {
  const { locations, selectedLocationId, selectLocation } = useSyncWorkspace();
  if (locations.length < 2) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {locations.map((location) => {
        const selected = location.id === selectedLocationId;
        return (
          <Pressable
            key={location.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => selectLocation(location.id)}
            className={cn(
              "rounded-full border px-3.5 py-2",
              selected
                ? "border-[#f4c95d] bg-[#f4c95d]"
                : "border-[#f4c95d]/20 bg-[#581631]"
            )}
          >
            <Text
              className={cn(
                "text-xs font-extrabold",
                selected ? "text-[#410d25]" : "text-[#fff6dd]"
              )}
            >
              {location.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
export function SyncMetric({
  label,
  value,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "gold" | "green" | "cream";
}) {
  const color =
    tone === "green"
      ? SYNC_COLORS.success
      : tone === "cream"
        ? SYNC_COLORS.cream
        : SYNC_COLORS.gold;
  return (
    <Card className="min-w-[46%] flex-1 gap-3 border-[#f4c95d]/15 bg-[#581631] p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-[11px] font-semibold leading-4 text-[#d9bda9]">
          {label}
        </Text>
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#f4c95d]/10">
          <Icon size={15} color={color} />
        </View>
      </View>
      <Text className="text-xl font-black text-[#fff6dd]">{value}</Text>
    </Card>
  );
}
export function SyncQuickAction({
  title,
  detail,
  icon: Icon,
  onPress,
  disabled = false,
}: {
  title: string;
  detail: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={cn(
        "min-w-[46%] flex-1 flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/20 bg-[#6b2342] p-4",
        disabled && "opacity-50"
      )}
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#f4c95d]">
        <Icon size={19} color={SYNC_COLORS.burgundy} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-sm font-black text-[#fff6dd]">{title}</Text>
        <Text className="text-[11px] leading-4 text-[#f3d9af]">{detail}</Text>
      </View>
      <ChevronRight size={16} color={SYNC_COLORS.gold} />
    </Pressable>
  );
}
export function SyncFilterPill<T extends string>({
  value,
  label,
  selected,
  onPress,
}: {
  value: T;
  label: string;
  selected: boolean;
  onPress: (value: T) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(value)}
      className={cn(
        "rounded-full border px-3.5 py-2",
        selected
          ? "border-[#f4c95d] bg-[#f4c95d]"
          : "border-[#f4c95d]/20 bg-[#581631]"
      )}
    >
      <Text
        className={cn(
          "text-xs font-extrabold",
          selected ? "text-[#410d25]" : "text-[#f3d9af]"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function SyncStatus({
  value,
  tone,
}: {
  value: string;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  const resolved =
    tone ??
    (value === "completed" || value === "paid" || value === "ready"
      ? "success"
      : value === "cancelled" || value === "declined"
        ? "danger"
        : "warning");
  return (
    <Badge
      className={cn(
        "border",
        resolved === "success" && "border-[#8bd6a1]/30 bg-[#8bd6a1]/10",
        resolved === "danger" && "border-[#ff9a91]/30 bg-[#ff9a91]/10",
        resolved === "warning" && "border-[#f4c95d]/30 bg-[#f4c95d]/10",
        resolved === "neutral" && "border-[#fff6dd]/20 bg-[#fff6dd]/5"
      )}
    >
      <Text
        className={cn(
          "text-[10px] font-black uppercase tracking-wide",
          resolved === "success" && "text-[#8bd6a1]",
          resolved === "danger" && "text-[#ff9a91]",
          resolved === "warning" && "text-[#f4c95d]",
          resolved === "neutral" && "text-[#d9bda9]"
        )}
      >
        {value.replaceAll("_", " ")}
      </Text>
    </Badge>
  );
}
