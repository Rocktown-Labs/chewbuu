import { useRouter } from "expo-router";
import { Tags } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { SyncLocationSwitcher, SyncPage } from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi } from "@/lib/venue-api";

export default function NewSpecialScreen() {
  const router = useRouter();
  const { refresh, selectedLocationId } = useSyncWorkspace();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("featured");
  const [priceText, setPriceText] = useState("");
  const [description, setDescription] = useState("");
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const save = async () => {
    if (!selectedLocationId || !title.trim()) {
      setErrorMessage("A special title is required.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const created = await venueApi.createSpecial({
        category: category.trim() || "featured",
        description: description.trim() || undefined,
        locationId: selectedLocationId,
        priceText: priceText.trim() || undefined,
        title: title.trim(),
      });
      if (publish)
        await venueApi.updateSpecial({
          id: created.special.id,
          status: "published",
        });
      await refresh(true);
      Alert.alert(
        "Special saved",
        publish ? "It is now published." : "It is saved as a draft.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save special."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SyncPage
      title="New special"
      subtitle="Create a simple venue-wide offer."
      icon={Tags}
      back
    >
      <SyncLocationSwitcher />
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Input
          accessibilityLabel="Special title"
          autoCapitalize="words"
          onChangeText={setTitle}
          placeholder="Special title"
          value={title}
        />
        <Input
          accessibilityLabel="Special category"
          onChangeText={setCategory}
          placeholder="Category"
          value={category}
        />
        <Input
          accessibilityLabel="Special price"
          onChangeText={setPriceText}
          placeholder="Price or discount text"
          value={priceText}
        />
        <Input
          accessibilityLabel="Special description"
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
            Published specials can appear on the public venue page.
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
          {saving ? "Saving…" : "Save special"}
        </Text>
      </Pressable>
    </SyncPage>
  );
}
