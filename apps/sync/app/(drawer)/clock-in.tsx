import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { Check, Clock3, LogOut, Pause, Play } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  SYNC_COLORS,
  SyncEmpty,
  SyncError,
  SyncLocationSwitcher,
  SyncPage,
  SyncStatus,
} from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi } from "@/lib/venue-api";

export default function ClockInScreen() {
  const router = useRouter();
  const {
    board,
    error,
    loading,
    refresh,
    refreshing,
    selectedLocation,
    selectedLocationId,
  } = useSyncWorkspace();
  const [shiftId, setShiftId] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  if (loading)
    return (
      <SyncPage title="Clock in" icon={Clock3} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !board)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!board || !selectedLocation || !selectedLocationId)
    return (
      <SyncPage title="Clock in" icon={Clock3}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const attendance = board.staff.find((staff) => staff.attendance)?.attendance;
  const clockIn = async () => {
    if (!shiftId || !code.trim()) {
      setErrorMessage(
        "Choose your shift and enter the daily code from the venue terminal."
      );
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await venueApi.clockIn({
        code: code.trim(),
        locationId: selectedLocationId,
        shiftId,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Clock in failed. Check the shift and code."
      );
    } finally {
      setSaving(false);
    }
  };
  const attendanceAction = async (
    action: "break_in" | "break_out" | "clock_out" | "lunch_in" | "lunch_out"
  ) => {
    if (!attendance) return;
    setSaving(true);
    try {
      await venueApi.updateAttendance({ action, attendanceId: attendance.id });
      await refresh(true);
    } catch (error) {
      Alert.alert(
        "Attendance update failed",
        error instanceof Error ? error.message : "Try again later."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SyncPage
      title="Clock in"
      subtitle="One-time shift verification. Sync never continuously tracks your location."
      icon={Clock3}
      back
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
    >
      <SyncLocationSwitcher />
      {attendance && attendance.status !== "clocked_out" ? (
        <View className="gap-4 rounded-3xl border border-[#8bd6a1]/30 bg-[#8bd6a1]/10 p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#8bd6a1]">
              <Check size={22} color={SYNC_COLORS.burgundy} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-[#fff6dd]">
                You are clocked in
              </Text>
              <Text className="text-xs text-[#d9bda9]">
                Status: {attendance.status.replaceAll("_", " ")}
              </Text>
            </View>
            <SyncStatus value={attendance.status} tone="success" />
          </View>
          <View className="flex-row flex-wrap gap-2">
            {attendance.status === "clocked_in" ? (
              <Action
                label="Start break"
                icon={Pause}
                onPress={() => void attendanceAction("break_in")}
                disabled={saving}
              />
            ) : null}
            {attendance.status === "break" ? (
              <Action
                label="End break"
                icon={Play}
                onPress={() => void attendanceAction("break_out")}
                disabled={saving}
              />
            ) : null}
            {attendance.status === "clocked_in" ? (
              <Action
                label="Start lunch"
                icon={Pause}
                onPress={() => void attendanceAction("lunch_in")}
                disabled={saving}
              />
            ) : null}
            {attendance.status === "lunch" ? (
              <Action
                label="End lunch"
                icon={Play}
                onPress={() => void attendanceAction("lunch_out")}
                disabled={saving}
              />
            ) : null}
            <Action
              label="Clock out"
              icon={LogOut}
              onPress={() => void attendanceAction("clock_out")}
              disabled={saving}
            />
          </View>
        </View>
      ) : (
        <>
          <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
            <Text className="text-sm font-black text-[#fff6dd]">
              Choose today’s shift
            </Text>
            {board.shifts.length === 0 ? (
              <Text className="text-xs text-[#d9bda9]">
                No assigned shifts are available.
              </Text>
            ) : (
              board.shifts.map((shift) => {
                const selected = shift.id === shiftId;
                return (
                  <Pressable
                    key={shift.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setShiftId(shift.id)}
                    className={`flex-row items-center gap-3 rounded-2xl border p-3 ${selected ? "border-[#f4c95d] bg-[#f4c95d]" : "border-[#f4c95d]/15 bg-[#410d25]"}`}
                  >
                    <Clock3
                      size={17}
                      color={selected ? SYNC_COLORS.burgundy : SYNC_COLORS.gold}
                    />
                    <View className="min-w-0 flex-1">
                      <Text
                        className={`text-sm font-black ${selected ? "text-[#410d25]" : "text-[#fff6dd]"}`}
                      >
                        {shift.role}
                      </Text>
                      <Text
                        className={`text-xs ${selected ? "text-[#410d25]/70" : "text-[#d9bda9]"}`}
                      >
                        {new Date(shift.startAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {new Date(shift.endAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    {selected ? (
                      <Check size={16} color={SYNC_COLORS.burgundy} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </View>
          <View className="gap-2 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
            <Text className="text-sm font-black text-[#fff6dd]">
              Daily code
            </Text>
            <Text className="text-xs leading-5 text-[#d9bda9]">
              Enter the code shown on the venue’s kiosk. A manager can rotate it
              at any time.
            </Text>
            <Input
              accessibilityLabel="Daily clock in code"
              autoCapitalize="characters"
              keyboardType="number-pad"
              onChangeText={setCode}
              placeholder="000000"
              value={code}
            />
          </View>
          {errorMessage ? (
            <Text className="text-xs font-semibold text-[#ff9a91]">
              {errorMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void clockIn()}
            className={`h-12 items-center justify-center rounded-full bg-[#f4c95d] ${saving ? "opacity-50" : ""}`}
          >
            <Text className="text-sm font-black text-[#410d25]">
              {saving ? "Verifying…" : "Clock in securely"}
            </Text>
          </Pressable>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(drawer)/(tabs)/shifts" as never)}
        className="py-2"
      >
        <Text className="text-center text-xs font-black text-[#f4c95d]">
          View staff roster
        </Text>
      </Pressable>
    </SyncPage>
  );
}
function Action({
  label,
  icon: Icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-2 rounded-full border border-[#f4c95d]/20 bg-[#410d25] px-3.5 py-2.5 ${disabled ? "opacity-50" : ""}`}
    >
      <Icon size={14} color="#f4c95d" />
      <Text className="text-xs font-black text-[#f4c95d]">{label}</Text>
    </Pressable>
  );
}
