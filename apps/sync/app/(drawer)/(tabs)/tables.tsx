import { useRouter } from "expo-router";
import { Table2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncFilterPill,
  SyncLocationSwitcher,
  SyncPage,
  SyncStatus,
} from "@/components/sync-ui";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";

type Filter = "all" | "available" | "seated" | "orders" | "paid";
const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Seated", value: "seated" },
  { label: "Orders", value: "orders" },
  { label: "Paid", value: "paid" },
];
const hasOrderIds = (table: unknown): table is { currentOrderIds: string[] } =>
  typeof table === "object" &&
  table !== null &&
  "currentOrderIds" in table &&
  Array.isArray(table.currentOrderIds);
export default function TablesScreen() {
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
  const tables = useMemo(
    () =>
      (board?.tables ?? workspace?.tables ?? []).filter((table) => {
        if (filter === "all") return true;
        if (filter === "available") return table.status === "available";
        if (filter === "seated")
          return ["occupied", "seated"].includes(table.status);
        if (!hasOrderIds(table)) return false;
        if (filter === "orders") return table.currentOrderIds.length > 0;
        return table.currentOrderIds.some((id) =>
          (board?.orders ?? []).some(
            (order) => order.id === id && order.paymentStatus === "paid"
          )
        );
      }),
    [board, filter, workspace]
  );
  const groups = useMemo(() => {
    const result = new Map<string, typeof tables>();
    for (const table of tables) {
      const section =
        "section" in table && table.section ? table.section : "Main floor";
      const current = result.get(section) ?? [];
      current.push(table);
      result.set(section, current);
    }
    return Array.from(result.entries());
  }, [tables]);
  if (loading)
    return (
      <SyncPage title="Tables" icon={Table2} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !workspace)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!workspace || !selectedLocation)
    return (
      <SyncPage title="Tables" icon={Table2}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  return (
    <SyncPage
      title="Tables"
      subtitle={`${workspace.tables.length} configured · tap a table for its current session`}
      icon={Table2}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
    >
      <SyncLocationSwitcher />
      <View className="flex-row flex-wrap gap-2">
        {filters.map((item) => (
          <SyncFilterPill
            key={item.value}
            value={item.value}
            label={item.label}
            selected={filter === item.value}
            onPress={setFilter}
          />
        ))}
      </View>
      {tables.length === 0 ? (
        <SyncEmpty
          icon={Table2}
          title="No tables in this view"
          detail="Try another floor filter or configure more tables."
        />
      ) : (
        groups.map(([section, sectionTables]) => (
          <View key={section} className="gap-2">
            <Text className="text-sm font-black text-[#fff6dd]">{section}</Text>
            {sectionTables.map((table) => (
              <Pressable
                key={table.id}
                accessibilityRole="button"
                accessibilityLabel={`Table ${table.label}, ${table.status}`}
                onPress={() =>
                  router.push({
                    pathname: "/(drawer)/table-detail",
                    params: { tableId: table.id },
                  })
                }
                className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#f4c95d]/10">
                  <Table2 size={19} color="#f4c95d" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-black text-[#fff6dd]">
                    Table {table.label}
                  </Text>
                  <Text className="text-xs text-[#d9bda9]">
                    {"occupiedSeats" in table
                      ? `${table.occupiedSeats}/${table.capacity} seats`
                      : `${table.capacity} seats`}
                  </Text>
                </View>
                <SyncStatus value={table.status} />
              </Pressable>
            ))}
          </View>
        ))
      )}
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Text className="text-sm font-black text-[#fff6dd]">
          Dining sessions
        </Text>
        {workspace.sessions.length === 0 ? (
          <Text className="text-xs text-[#d9bda9]">
            No active sessions yet.
          </Text>
        ) : (
          workspace.sessions.slice(0, 6).map((session) => (
            <View
              key={session.id}
              className="flex-row items-center justify-between border-t border-[#f4c95d]/10 pt-3"
            >
              <Text className="text-sm font-bold text-[#fff6dd]">
                {session.tableLabel
                  ? `Table ${session.tableLabel}`
                  : "Unassigned"}
              </Text>
              <SyncStatus value={session.endedAt ? "completed" : "active"} />
            </View>
          ))
        )}
      </View>
    </SyncPage>
  );
}
