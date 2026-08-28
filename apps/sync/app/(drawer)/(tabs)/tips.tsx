import { Tag } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncLocationSwitcher,
  SyncPage,
  SyncStatus,
} from "@/components/sync-ui";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";

export default function TipsScreen() {
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
      <SyncPage title="Tips" icon={Tag} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !workspace)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!workspace || !selectedLocation)
    return (
      <SyncPage title="Tips" icon={Tag}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const orders = board?.orders ?? [];
  return (
    <SyncPage
      title="Tips"
      subtitle="A clear ledger for recorded tips. Settlement stays outside this screen."
      icon={Tag}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
    >
      <SyncLocationSwitcher />
      <View className="gap-1 rounded-3xl border border-[#f4c95d]/20 bg-[#6b2342] p-5">
        <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-[#f3d9af]">
          Recorded tips
        </Text>
        <Text className="text-3xl font-black text-[#f4c95d]">
          ${(workspace.analytics.tipCents / 100).toFixed(2)}
        </Text>
        <Text className="text-xs leading-5 text-[#d9bda9]">
          Tips remain unpaid until your payment policy is enabled.
        </Text>
      </View>
      {orders.length === 0 ? (
        <SyncEmpty
          icon={Tag}
          title="No tip-bearing orders"
          detail="Tip records appear after orders are created."
        />
      ) : (
        orders
          .filter((order) => order.tipCents > 0 || order.totalCents > 0)
          .slice(0, 20)
          .map((order) => (
            <View
              key={order.id}
              className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-4"
            >
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-black text-[#fff6dd]">
                  Order {order.id.slice(0, 8)}
                </Text>
                <Text className="text-xs text-[#d9bda9]">
                  Total ${(order.totalCents / 100).toFixed(2)} ·{" "}
                  {order.paymentStatus}
                </Text>
              </View>
              <View className="items-end gap-1">
                <Text className="text-sm font-black text-[#f4c95d]">
                  ${(order.tipCents / 100).toFixed(2)}
                </Text>
                <SyncStatus value={order.status} />
              </View>
            </View>
          ))
      )}
    </SyncPage>
  );
}
