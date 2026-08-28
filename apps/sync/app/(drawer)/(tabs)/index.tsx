import { useRouter } from "expo-router";
import {
  CalendarClock,
  ChefHat,
  Clock3,
  ReceiptText,
  RefreshCw,
  Store,
  Users,
} from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncLocationSwitcher,
  SyncMetric,
  SyncPage,
  SyncQuickAction,
  SyncStatus,
} from "@/components/sync-ui";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";

const time = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown time"
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
export default function OverviewScreen() {
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
  if (loading)
    return (
      <SyncPage title="Overview" icon={Store} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !workspace)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!workspace || !selectedLocation)
    return (
      <SyncPage title="Overview" icon={Store}>
        <SyncEmpty
          title="No venue assigned"
          detail="Ask a venue admin to assign your account to an active location."
        />
      </SyncPage>
    );
  const orders = board?.orders ?? [];
  const activeOrders = orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status)
  ).length;
  const openReservations = workspace.reservations.filter(
    (reservation) =>
      !["completed", "declined", "cancelled"].includes(reservation.status)
  ).length;
  const onShift =
    board?.staff.filter((staff) => staff.attendance?.status === "clocked_in")
      .length ?? 0;
  const pendingKitchen = orders.filter((order) =>
    ["submitted", "accepted", "preparing"].includes(order.status)
  ).length;
  return (
    <SyncPage
      title="Overview"
      subtitle={`${selectedLocation.name} · ${selectedLocation.status}`}
      icon={Store}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
      right={
        <Pressable
          accessibilityLabel="Refresh workspace"
          accessibilityRole="button"
          onPress={() => void refresh(true)}
          className="mt-1 h-10 w-10 items-center justify-center rounded-2xl border border-[#f4c95d]/20 bg-[#581631]"
        >
          <RefreshCw size={16} color="#f4c95d" />
        </Pressable>
      }
    >
      <SyncLocationSwitcher />
      <View className="flex-row flex-wrap gap-3">
        <SyncQuickAction
          title="New order"
          detail="Tap in a guest order"
          icon={ReceiptText}
          onPress={() => router.push("/(drawer)/order-new" as never)}
        />
        <SyncQuickAction
          title="Clock in"
          detail="Start a shift securely"
          icon={Clock3}
          onPress={() => router.push("/(drawer)/clock-in" as never)}
        />
        <SyncQuickAction
          title="Reservations"
          detail={`${openReservations} need attention`}
          icon={CalendarClock}
          onPress={() => router.push("/(drawer)/reservations" as never)}
        />
        <SyncQuickAction
          title="Kitchen"
          detail={`${pendingKitchen} in the queue`}
          icon={ChefHat}
          onPress={() => router.push("/(drawer)/kitchen" as never)}
        />
      </View>
      <View className="flex-row flex-wrap gap-3">
        <SyncMetric
          label="Open reservations"
          value={openReservations}
          icon={CalendarClock}
        />
        <SyncMetric
          label="Active orders"
          value={activeOrders}
          icon={ReceiptText}
        />
        <SyncMetric
          label="On shift now"
          value={onShift}
          icon={Users}
          tone="green"
        />
        <SyncMetric
          label="Tips recorded"
          value={`$${(workspace.analytics.tipCents / 100).toFixed(2)}`}
          icon={ReceiptText}
        />
      </View>
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-sm font-black text-[#fff6dd]">
              Service pulse
            </Text>
            <Text className="text-xs leading-5 text-[#d9bda9]">
              A calm view of what needs attention now.
            </Text>
          </View>
          <SyncStatus value={board?.mode ?? "offline"} tone="neutral" />
        </View>
        <View className="flex-row gap-2">
          <Pulse value={`${workspace.tables.length}`} label="tables" />
          <Pulse
            value={`${workspace.sessions.filter((session) => !session.endedAt).length}`}
            label="active sessions"
          />
          <Pulse value={`${workspace.analytics.eventCount}`} label="events" />
        </View>
      </View>
      <View className="gap-3">
        <Text className="text-sm font-black text-[#fff6dd]">
          Recent activity
        </Text>
        {workspace.events.length === 0 ? (
          <SyncEmpty
            icon={RefreshCw}
            title="No operational events yet"
            detail="Timing checkpoints appear here as the team works."
          />
        ) : (
          workspace.events.slice(0, 6).map((event) => (
            <View
              key={event.id}
              className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-3.5"
            >
              <View className="h-2.5 w-2.5 rounded-full bg-[#f4c95d]" />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold capitalize text-[#fff6dd]">
                  {event.eventType.replaceAll("_", " ")}
                </Text>
                <Text className="text-xs text-[#d9bda9]">
                  {time(event.occurredAt)}
                </Text>
              </View>
              <SyncStatus value={event.source} tone="neutral" />
            </View>
          ))
        )}
      </View>
    </SyncPage>
  );
}
function Pulse({ value, label }: { value: string; label: string }) {
  return (
    <View className="min-w-[30%] flex-1 rounded-2xl bg-[#410d25] p-3">
      <Text className="text-lg font-black text-[#fff6dd]">{value}</Text>
      <Text className="text-[11px] text-[#d9bda9]">{label}</Text>
    </View>
  );
}
