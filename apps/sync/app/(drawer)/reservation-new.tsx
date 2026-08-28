import { useRouter } from "expo-router";
import { CalendarClock, Minus, Plus } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  SYNC_COLORS,
  SyncLocationSwitcher,
  SyncPage,
} from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi } from "@/lib/venue-api";

const defaultTime = () => {
  const next = new Date(Date.now() + 60 * 60 * 1000);
  next.setSeconds(0, 0);
  return next.toISOString().slice(0, 16);
};
export default function NewReservationScreen() {
  const router = useRouter();
  const { refresh, selectedLocationId } = useSyncWorkspace();
  const [partySize, setPartySize] = useState(2);
  const [requestedAt, setRequestedAt] = useState(defaultTime);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submit = async () => {
    if (!selectedLocationId) return;
    const date = new Date(requestedAt);
    if (Number.isNaN(date.getTime())) {
      setErrorMessage("Use a valid date and time, such as 2026-08-28T19:30.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await venueApi.requestReservation({
        locationId: selectedLocationId,
        partySize,
        requestedAt: date.toISOString(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      await refresh(true);
      Alert.alert(
        "Reservation requested",
        "The request is now in the venue timeline.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not request reservation."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SyncPage
      title="New reservation"
      subtitle="Create a request for the active venue location."
      icon={CalendarClock}
      back
    >
      <SyncLocationSwitcher />
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Text className="text-sm font-black text-[#fff6dd]">Party size</Text>
        <View className="flex-row items-center justify-between rounded-2xl bg-[#410d25] p-3">
          <Text className="text-sm text-[#d9bda9]">Guests at the table</Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityLabel="Decrease party size"
              accessibilityRole="button"
              disabled={partySize <= 1}
              onPress={() => setPartySize((value) => Math.max(1, value - 1))}
              className="h-9 w-9 items-center justify-center rounded-full border border-[#f4c95d]/20"
            >
              <Minus
                size={15}
                color={partySize <= 1 ? "#81566a" : SYNC_COLORS.cream}
              />
            </Pressable>
            <Text className="w-6 text-center text-lg font-black text-[#fff6dd]">
              {partySize}
            </Text>
            <Pressable
              accessibilityLabel="Increase party size"
              accessibilityRole="button"
              disabled={partySize >= 20}
              onPress={() => setPartySize((value) => Math.min(20, value + 1))}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#f4c95d]"
            >
              <Plus size={15} color={SYNC_COLORS.burgundy} />
            </Pressable>
          </View>
        </View>
      </View>
      <View className="gap-2 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Text className="text-sm font-black text-[#fff6dd]">When?</Text>
        <Text className="text-xs text-[#d9bda9]">
          Use local time in ISO format.
        </Text>
        <Input
          accessibilityLabel="Requested date and time"
          onChangeText={setRequestedAt}
          placeholder="2026-08-28T19:30"
          value={requestedAt}
        />
      </View>
      <View className="gap-2 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Text className="text-sm font-black text-[#fff6dd]">
          Notes (optional)
        </Text>
        <Input
          accessibilityLabel="Reservation notes"
          onChangeText={setNotes}
          placeholder="Accessibility, birthday, seating note…"
          value={notes}
        />
      </View>
      {errorMessage ? (
        <Text className="text-xs font-semibold text-[#ff9a91]">
          {errorMessage}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={saving || !selectedLocationId}
        onPress={() => void submit()}
        className={`h-12 items-center justify-center rounded-full bg-[#f4c95d] ${saving || !selectedLocationId ? "opacity-50" : ""}`}
      >
        <Text className="text-sm font-black text-[#410d25]">
          {saving ? "Requesting…" : "Request reservation"}
        </Text>
      </Pressable>
    </SyncPage>
  );
}
