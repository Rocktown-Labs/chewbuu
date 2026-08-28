import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ChefHat, ReceiptText } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncFilterPill,
  SyncLocationSwitcher,
  SyncPage,
  SyncStatus,
} from "@/components/sync-ui";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi, type VenueServiceOrder } from "@/lib/venue-api";

const lanes = [
  { label: "All", value: "all" },
  { label: "New", value: "submitted" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Served", value: "served" },
] as const;
type Lane = (typeof lanes)[number]["value"];
export default function KitchenScreen() {
  const router = useRouter();
  const {
    board,
    error,
    loading,
    refresh,
    refreshing,
    selectedLocation,
    workspace,
  } = useSyncWorkspace();
  const [lane, setLane] = useState<Lane>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const orders = useMemo(
    () =>
      (board?.orders ?? workspace?.orders ?? []).filter((order) =>
        lane === "all"
          ? !["completed", "cancelled"].includes(order.status)
          : order.status === lane
      ) as VenueServiceOrder[],
    [board, lane, workspace]
  );
  if (loading)
    return (
      <SyncPage title="Kitchen" icon={ChefHat} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !workspace)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!workspace || !selectedLocation)
    return (
      <SyncPage title="Kitchen" icon={ChefHat}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const move = async (order: VenueServiceOrder, status: string) => {
    setSavingId(order.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await venueApi.updateServiceOrder({ orderId: order.id, status });
      await refresh(true);
    } catch (error) {
      Alert.alert(
        "Could not update kitchen ticket",
        error instanceof Error ? error.message : "Try again later."
      );
    } finally {
      setSavingId(null);
    }
  };
  return (
    <SyncPage
      title="Kitchen"
      subtitle="A focused mobile KDS for the moments you need away from the terminal."
      icon={ChefHat}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
    >
      <SyncLocationSwitcher />
      <View className="flex-row flex-wrap gap-2">
        {lanes.map((item) => (
          <SyncFilterPill
            key={item.value}
            value={item.value}
            label={item.label}
            selected={lane === item.value}
            onPress={setLane}
          />
        ))}
      </View>
      {orders.length === 0 ? (
        <SyncEmpty
          icon={ChefHat}
          title="Kitchen is clear"
          detail="New orders will show here as soon as the floor sends them."
        />
      ) : (
        orders.map((order) => (
          <View
            key={order.id}
            className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4"
          >
            <View className="flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-black text-[#fff6dd]">
                  {order.customer?.displayName ??
                    `Ticket ${order.id.slice(0, 6)}`}
                </Text>
                <Text className="text-xs text-[#d9bda9]">
                  {order.items.length} items ·{" "}
                  {order.tableId ? "Table order" : "Counter order"}
                </Text>
              </View>
              <SyncStatus value={order.status} />
            </View>
            <View className="gap-1 border-t border-[#f4c95d]/10 pt-2">
              {order.items.map((item) => (
                <Text
                  key={item.id}
                  className="text-sm font-bold text-[#f3d9af]"
                >
                  {item.quantity} × {item.name}
                </Text>
              ))}
            </View>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                disabled={savingId === order.id}
                onPress={() => void move(order, "ready")}
                className="flex-1 items-center justify-center rounded-full bg-[#f4c95d] py-3"
              >
                <Text className="text-xs font-black text-[#410d25]">
                  Mark ready
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={savingId === order.id}
                onPress={() => void move(order, "served")}
                className="flex-1 items-center justify-center rounded-full border border-[#f4c95d]/20 bg-[#410d25] py-3"
              >
                <Text className="text-xs font-black text-[#f4c95d]">
                  Served
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(drawer)/(tabs)/orders" as never)}
        className="flex-row items-center justify-center gap-2 py-2"
      >
        <ReceiptText size={15} color="#f4c95d" />
        <Text className="text-xs font-black text-[#f4c95d]">
          Open full order queue
        </Text>
      </Pressable>
    </SyncPage>
  );
}
