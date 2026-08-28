import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { CalendarClock, Plus } from "lucide-react-native";
import React, { useState } from "react";
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
import { venueApi } from "@/lib/venue-api";

const filters = [
  { label: "Needs attention", value: "open" },
  { label: "Confirmed", value: "confirmed" },
  { label: "All", value: "all" },
] as const;
type Filter = (typeof filters)[number]["value"];
export default function ReservationsScreen() {
  const router = useRouter();
  const { error, loading, refresh, refreshing, selectedLocation, workspace } =
    useSyncWorkspace();
  const [filter, setFilter] = useState<Filter>("open");
  const [savingId, setSavingId] = useState<string | null>(null);
  if (loading)
    return (
      <SyncPage title="Reservations" icon={CalendarClock} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !workspace)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!workspace || !selectedLocation)
    return (
      <SyncPage title="Reservations" icon={CalendarClock}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const reservations = workspace.reservations.filter(
    (reservation) =>
      filter === "all" ||
      (filter === "confirmed"
        ? reservation.status === "confirmed"
        : !["completed", "declined", "cancelled"].includes(reservation.status))
  );
  const update = async (reservationId: string, status: string) => {
    setSavingId(reservationId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await venueApi.updateReservation({ reservationId, status });
      await refresh(true);
    } catch (error) {
      Alert.alert(
        "Could not update reservation",
        error instanceof Error ? error.message : "Try again later."
      );
    } finally {
      setSavingId(null);
    }
  };
  return (
    <SyncPage
      title="Reservations"
      subtitle="Confirm, seat, or close requests without losing the timeline."
      icon={CalendarClock}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
      right={
        <Pressable
          accessibilityLabel="New reservation"
          accessibilityRole="button"
          onPress={() => router.push("/(drawer)/reservation-new" as never)}
          className="mt-1 h-10 w-10 items-center justify-center rounded-2xl bg-[#f4c95d]"
        >
          <Plus size={18} color="#410d25" />
        </Pressable>
      }
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
      {reservations.length === 0 ? (
        <SyncEmpty
          icon={CalendarClock}
          title="No reservations in this view"
          detail="New requests will appear as guests book this location."
        />
      ) : (
        reservations.map((reservation) => (
          <View
            key={reservation.id}
            className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4"
          >
            <View className="flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-black text-[#fff6dd]">
                  Party of {reservation.partySize}
                </Text>
                <Text className="text-xs text-[#d9bda9]">
                  {new Date(reservation.requestedAt).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Text>
                {reservation.tableLabel ? (
                  <Text className="text-xs font-bold text-[#f3d9af]">
                    Table {reservation.tableLabel}
                  </Text>
                ) : null}
              </View>
              <SyncStatus value={reservation.status} />
            </View>
            <View className="flex-row flex-wrap gap-2">
              {reservation.status === "requested" ? (
                <Action
                  label="Confirm"
                  onPress={() => void update(reservation.id, "confirmed")}
                  disabled={savingId === reservation.id}
                />
              ) : null}
              {["requested", "confirmed"].includes(reservation.status) ? (
                <Action
                  label="Seat guest"
                  onPress={() => void update(reservation.id, "seated")}
                  disabled={savingId === reservation.id}
                />
              ) : null}
              {!["completed", "declined", "cancelled"].includes(
                reservation.status
              ) ? (
                <Action
                  label="Close"
                  onPress={() => void update(reservation.id, "completed")}
                  disabled={savingId === reservation.id}
                />
              ) : null}
            </View>
          </View>
        ))
      )}
    </SyncPage>
  );
}
function Action({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className="rounded-full border border-[#f4c95d]/20 bg-[#410d25] px-3.5 py-2.5"
    >
      <Text className="text-xs font-black text-[#f4c95d]">{label}</Text>
    </Pressable>
  );
}
