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

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Needs action", value: "active" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Closed", value: "completed" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];
const FLOW = [
  "draft",
  "submitted",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
];
export default function OrdersScreen() {
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
  const [filter, setFilter] = useState<Filter>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const orders = useMemo(
    () =>
      (
        board?.orders ??
        workspace?.orders ??
        ([] as VenueServiceOrder[])
      ).filter((order) => {
        if (filter === "all") return true;
        if (filter === "active")
          return !["completed", "cancelled"].includes(order.status);
        if (filter === "completed")
          return ["completed", "cancelled"].includes(order.status);
        return order.status === filter;
      }),
    [board, filter, workspace]
  ) as VenueServiceOrder[];
  if (loading)
    return (
      <SyncPage title="Orders" icon={ReceiptText} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !workspace)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!workspace || !selectedLocation)
    return (
      <SyncPage title="Orders" icon={ReceiptText}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const update = async (order: VenueServiceOrder, status: string) => {
    if (status === order.status) return;
    setSavingId(order.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await venueApi.updateServiceOrder({ orderId: order.id, status });
      await refresh(true);
    } catch (error) {
      Alert.alert(
        "Could not update order",
        error instanceof Error ? error.message : "Try again later."
      );
    } finally {
      setSavingId(null);
    }
  };
  return (
    <SyncPage
      title="Orders"
      subtitle="Move every order from tap-in to served."
      icon={ReceiptText}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
      right={
        <Pressable
          accessibilityLabel="New order"
          accessibilityRole="button"
          onPress={() => router.push("/(drawer)/order-new" as never)}
          className="mt-1 rounded-full bg-[#f4c95d] px-3 py-2"
        >
          <Text className="text-xs font-black text-[#410d25]">New order</Text>
        </Pressable>
      }
    >
      <SyncLocationSwitcher />
      <View className="flex-row flex-wrap gap-2">
        {FILTERS.map((item) => (
          <SyncFilterPill
            key={item.value}
            value={item.value}
            label={item.label}
            selected={filter === item.value}
            onPress={setFilter}
          />
        ))}
      </View>
      <View className="flex-row items-center gap-2 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-3.5">
        <ChefHat size={17} color="#f4c95d" />
        <Text className="flex-1 text-xs leading-5 text-[#d9bda9]">
          Orders remain unpaid operational records. Checkout and money movement
          are capability-gated.
        </Text>
      </View>
      {orders.length === 0 ? (
        <SyncEmpty
          icon={ReceiptText}
          title="No orders in this view"
          detail="Start an order from Overview or use another filter."
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(drawer)/order-new" as never)}
              className="mt-2 rounded-full bg-[#f4c95d] px-4 py-2.5"
            >
              <Text className="text-xs font-black text-[#410d25]">
                Start an order
              </Text>
            </Pressable>
          }
        />
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            saving={savingId === order.id}
            onStatus={(status) => void update(order, status)}
          />
        ))
      )}
    </SyncPage>
  );
}
function OrderCard({
  order,
  saving,
  onStatus,
}: {
  order: VenueServiceOrder;
  saving: boolean;
  onStatus: (status: string) => void;
}) {
  const next =
    FLOW[
      Math.min(Math.max(FLOW.indexOf(order.status), 0) + 1, FLOW.length - 1)
    ];
  return (
    <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-black text-[#fff6dd]">
            {order.customer?.displayName ?? `Order ${order.id.slice(0, 6)}`}
          </Text>
          <Text className="text-xs text-[#d9bda9]">
            {order.items?.length ?? 0} items · $
            {(order.totalCents / 100).toFixed(2)} · {order.paymentStatus}
          </Text>
        </View>
        <SyncStatus value={order.status} />
      </View>
      {order.items?.length ? (
        <View className="gap-1 border-t border-[#f4c95d]/10 pt-2">
          {order.items.slice(0, 4).map((item) => (
            <Text
              key={item.id}
              className="text-xs font-semibold text-[#f3d9af]"
            >
              {item.quantity} × {item.name}
            </Text>
          ))}
        </View>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {FLOW.filter((status) => status !== "draft").map((status) => (
          <Pressable
            key={status}
            accessibilityRole="button"
            accessibilityState={{
              selected: order.status === status,
              disabled: saving,
            }}
            disabled={saving}
            onPress={() => onStatus(status)}
            className={`rounded-full border px-3 py-2 ${order.status === status ? "border-[#f4c95d] bg-[#f4c95d]" : "border-[#f4c95d]/15 bg-[#410d25]"}`}
          >
            <Text
              className={`text-[10px] font-black uppercase ${order.status === status ? "text-[#410d25]" : "text-[#d9bda9]"}`}
            >
              {status}
            </Text>
          </Pressable>
        ))}
      </View>
      {!["completed", "cancelled"].includes(order.status) ? (
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => onStatus(next)}
          className={`h-11 items-center justify-center rounded-full bg-[#6b2342] ${saving ? "opacity-50" : ""}`}
        >
          <Text className="text-sm font-black text-[#fff6dd]">
            {saving ? "Updating…" : `Move to ${next}`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
