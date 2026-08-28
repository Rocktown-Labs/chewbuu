import { useRouter } from "expo-router";
import { Clock3, Users } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncLocationSwitcher,
  SyncPage,
  SyncStatus,
} from "@/components/sync-ui";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown time"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};
export default function ShiftsScreen() {
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
      <SyncPage title="Shifts" icon={Clock3} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !workspace)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!workspace || !selectedLocation)
    return (
      <SyncPage title="Shifts" icon={Clock3}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  return (
    <SyncPage
      title="Shifts"
      subtitle="See who is working and send teammates to Clock in."
      icon={Clock3}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
      right={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(drawer)/clock-in" as never)}
          className="mt-1 rounded-full bg-[#f4c95d] px-3 py-2"
        >
          <Text className="text-xs font-black text-[#410d25]">Clock in</Text>
        </Pressable>
      }
    >
      <SyncLocationSwitcher />
      <View className="flex-row items-center gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Users size={18} color="#8bd6a1" />
        <Text className="flex-1 text-xs leading-5 text-[#d9bda9]">
          {board?.staff.length ?? 0} staff records. Attendance is explicit and
          shift-linked; Sync does not continuously track staff.
        </Text>
      </View>
      <View className="gap-2">
        <Text className="text-sm font-black text-[#fff6dd]">Staff today</Text>
        {board?.staff.length ? (
          board.staff.map((staff) => (
            <View
              key={staff.userId ?? staff.displayName}
              className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-3.5"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#6b2342]">
                <Text className="text-sm font-black text-[#f4c95d]">
                  {staff.displayName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-[#fff6dd]">
                  {staff.displayName}
                </Text>
                <Text className="text-xs capitalize text-[#d9bda9]">
                  {staff.role}
                </Text>
              </View>
              <SyncStatus value={staff.attendance?.status ?? staff.status} />
            </View>
          ))
        ) : (
          <SyncEmpty
            icon={Users}
            title="No staff records"
            detail="Invite staff from the web workspace."
          />
        )}
      </View>
      <View className="gap-2">
        <Text className="text-sm font-black text-[#fff6dd]">
          Scheduled shifts
        </Text>
        {workspace.shifts.length ? (
          workspace.shifts.slice(0, 20).map((shift) => (
            <View
              key={shift.id}
              className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-3.5"
            >
              <Clock3 size={17} color="#f4c95d" />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold capitalize text-[#fff6dd]">
                  {shift.role}
                </Text>
                <Text className="text-xs text-[#d9bda9]">
                  {formatDate(shift.startAt)} – {formatDate(shift.endAt)}
                </Text>
              </View>
              <SyncStatus value={shift.status || "scheduled"} />
            </View>
          ))
        ) : (
          <Text className="rounded-2xl border border-dashed border-[#f4c95d]/20 p-4 text-center text-xs text-[#d9bda9]">
            No shifts scheduled.
          </Text>
        )}
      </View>
    </SyncPage>
  );
}
