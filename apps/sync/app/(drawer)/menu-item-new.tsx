import { useRouter } from "expo-router";
import { Utensils } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { SyncLocationSwitcher, SyncPage } from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi } from "@/lib/venue-api";

export default function NewMenuItemScreen() {
  const router = useRouter();
  const { refresh, selectedLocationId } = useSyncWorkspace();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [publish, setPublish] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const save = async () => {
    const priceCents = Math.round(Number(price) * 100);
    if (!selectedLocationId || !name.trim()) {
      setErrorMessage("An item name is required.");
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setErrorMessage("Enter a valid price, such as 12.50.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await venueApi.upsertMenuItem({
        available: true,
        description: description.trim() || undefined,
        locationId: selectedLocationId,
        name: name.trim(),
        priceCents,
        section: section.trim() || undefined,
        status: publish ? "published" : "draft",
      });
      await refresh(true);
      Alert.alert(
        "Menu item saved",
        publish
          ? "It is available for order taking."
          : "It is saved as a draft.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save menu item."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SyncPage
      title="New menu item"
      subtitle="Create a clear, tap-ready item for the floor."
      icon={Utensils}
      back
    >
      <SyncLocationSwitcher />
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Input
          accessibilityLabel="Menu item name"
          autoCapitalize="words"
          onChangeText={setName}
          placeholder="Item name"
          value={name}
        />
        <Input
          accessibilityLabel="Menu item price"
          keyboardType="decimal-pad"
          onChangeText={setPrice}
          placeholder="Price, e.g. 12.50"
          value={price}
        />
        <Input
          accessibilityLabel="Menu item section"
          autoCapitalize="words"
          onChangeText={setSection}
          placeholder="Section"
          value={section}
        />
        <Input
          accessibilityLabel="Menu item description"
          onChangeText={setDescription}
          placeholder="Description (optional)"
          value={description}
        />
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: publish }}
        onPress={() => setPublish((value) => !value)}
        className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-4"
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-full border ${publish ? "border-[#f4c95d] bg-[#f4c95d]" : "border-[#d9bda9]"}`}
        >
          {publish ? (
            <Text className="text-xs font-black text-[#410d25]">✓</Text>
          ) : null}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-black text-[#fff6dd]">Publish now</Text>
          <Text className="text-xs text-[#d9bda9]">
            Published items can be selected in New order.
          </Text>
        </View>
      </Pressable>
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
          {saving ? "Saving…" : "Save menu item"}
        </Text>
      </Pressable>
    </SyncPage>
  );
}
