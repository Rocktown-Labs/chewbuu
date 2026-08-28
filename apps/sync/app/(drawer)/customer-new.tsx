import { useRouter } from "expo-router";
import { CircleUserRound } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { SyncLocationSwitcher, SyncPage } from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi } from "@/lib/venue-api";

export default function NewCustomerScreen() {
  const router = useRouter();
  const { refresh, selectedLocationId } = useSyncWorkspace();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const save = async () => {
    if (!selectedLocationId || !name.trim()) {
      setErrorMessage("A guest name is required.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await venueApi.createCustomer({
        displayName: name.trim(),
        locationId: selectedLocationId,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      await refresh(true);
      Alert.alert("Guest added", "The guest is available for future orders.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not create guest."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SyncPage
      title="New guest"
      subtitle="Keep contact capture intentional and venue-scoped."
      icon={CircleUserRound}
      back
    >
      <SyncLocationSwitcher />
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Input
          accessibilityLabel="Guest name"
          autoCapitalize="words"
          onChangeText={setName}
          placeholder="Full name"
          value={name}
        />
        <Input
          accessibilityLabel="Guest phone"
          keyboardType="phone-pad"
          onChangeText={setPhone}
          placeholder="Phone (optional)"
          value={phone}
        />
        <Input
          accessibilityLabel="Guest email"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email (optional)"
          value={email}
        />
        <Input
          accessibilityLabel="Guest notes"
          onChangeText={setNotes}
          placeholder="Notes (optional)"
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
        disabled={saving}
        onPress={() => void save()}
        className={`h-12 items-center justify-center rounded-full bg-[#f4c95d] ${saving ? "opacity-50" : ""}`}
      >
        <Text className="text-sm font-black text-[#410d25]">
          {saving ? "Saving…" : "Save guest"}
        </Text>
      </Pressable>
    </SyncPage>
  );
}
