import { useLocalSearchParams, useRouter } from "expo-router";
import { ReceiptText, Table2, Users } from "lucide-react-native";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncLocationSwitcher,
  SyncPage,
  SyncStatus,
} from "@/components/sync-ui";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi } from "@/lib/venue-api";

const hasTableOrders = (
  table: unknown
): table is { currentOrderIds: string[]; customerNames: string[] } =>
  typeof table === "object" &&
  table !== null &&
  "currentOrderIds" in table &&
  Array.isArray(table.currentOrderIds) &&
  "customerNames" in table &&
  Array.isArray(table.customerNames);
export default function TableDetailScreen() {
  const router = useRouter();
  const { tableId } = useLocalSearchParams<{ tableId?: string }>();
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
      <SyncPage title="Table" icon={Table2} back scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !workspace)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!workspace || !selectedLocation || !tableId)
    return (
      <SyncPage title="Table" icon={Table2} back>
        <SyncEmpty title="Table not found" />
      </SyncPage>
    );
  const table = (board?.tables ?? workspace.tables).find(
    (item) => item.id === tableId
  );
  if (!table)
    return (
      <SyncPage title="Table" icon={Table2} back>
        <SyncEmpty
          title="Table not found"
          detail="This table may have been removed or belongs to another location."
        />
      </SyncPage>
    );
  const orderIds = hasTableOrders(table) ? table.currentOrderIds : [];
  const orders = (board?.orders ?? []).filter((order) =>
    orderIds.includes(order.id)
  );
  const session = workspace.sessions.find(
    (item) => item.tableLabel === table.label && !item.endedAt
  );
  const closeSession = async () => {
    if (!session) return;
    try {
      await venueApi.endSession(session.id);
      await refresh(true);
    } catch (error) {
      Alert.alert(
        "Could not end session",
        error instanceof Error ? error.message : "Try again later."
      );
    }
  };
  const endSession = () => {
    if (!session) return;
    Alert.alert(
      "End dining session?",
      `Close the active session at table ${table.label}?`,
      [
        { text: "Keep open", style: "cancel" },
        {
          text: "End session",
          style: "destructive",
          onPress: () => void closeSession(),
        },
      ]
    );
  };
  return (
    <SyncPage
      title={`Table ${table.label}`}
      subtitle={`${table.capacity} seats`}
      icon={Table2}
      back
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
    >
      <SyncLocationSwitcher />
      <View className="flex-row items-center gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-5">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#f4c95d]/10">
          <Table2 size={22} color="#f4c95d" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-black text-[#fff6dd]">
            Table {table.label}
          </Text>
          <Text className="text-xs text-[#d9bda9]">
            {"occupiedSeats" in table
              ? `${table.occupiedSeats}/${table.capacity} seats seated`
              : `${table.capacity} seats`}
          </Text>
        </View>
        <SyncStatus value={table.status} />
      </View>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/(drawer)/order-new",
              params: { tableId: table.id },
            })
          }
          className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-[#f4c95d] py-3"
        >
          <ReceiptText size={15} color="#410d25" />
          <Text className="text-xs font-black text-[#410d25]">New order</Text>
        </Pressable>
        {session ? (
          <Pressable
            accessibilityRole="button"
            onPress={endSession}
            className="flex-1 items-center justify-center rounded-full border border-[#ff9a91]/25 bg-[#ff9a91]/10 py-3"
          >
            <Text className="text-xs font-black text-[#ff9a91]">
              End session
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#f4c95d" />
          <Text className="text-sm font-black text-[#fff6dd]">
            Current guests
          </Text>
        </View>
        {hasTableOrders(table) && table.customerNames.length > 0 ? (
          table.customerNames.map((name) => (
            <Text
              key={name}
              className="border-t border-[#f4c95d]/10 pt-2 text-sm font-bold text-[#f3d9af]"
            >
              {name}
            </Text>
          ))
        ) : (
          <Text className="text-xs text-[#d9bda9]">
            No named guests are attached yet.
          </Text>
        )}
      </View>
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Text className="text-sm font-black text-[#fff6dd]">Open orders</Text>
        {orders.length > 0 ? (
          orders.map((order) => (
            <View
              key={order.id}
              className="flex-row items-center justify-between border-t border-[#f4c95d]/10 pt-3"
            >
              <View>
                <Text className="text-sm font-bold text-[#fff6dd]">
                  {order.customer?.displayName ??
                    `Order ${order.id.slice(0, 6)}`}
                </Text>
                <Text className="text-xs text-[#d9bda9]">
                  {order.items.length} items · $
                  {(order.totalCents / 100).toFixed(2)}
                </Text>
              </View>
              <SyncStatus value={order.status} />
            </View>
          ))
        ) : (
          <Text className="text-xs text-[#d9bda9]">No current orders.</Text>
        )}
      </View>
    </SyncPage>
  );
}
