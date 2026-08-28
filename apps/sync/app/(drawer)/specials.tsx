import { useRouter } from "expo-router";
import { Plus, Tags } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncLocationSwitcher,
  SyncPage,
  SyncStatus,
} from "@/components/sync-ui";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi, type VenueSpecial } from "@/lib/venue-api";

export default function SpecialsScreen() {
  const router = useRouter();
  const {
    error,
    loading: workspaceLoading,
    refresh,
    refreshing,
    selectedLocation,
    selectedLocationId,
  } = useSyncWorkspace();
  const [specials, setSpecials] = useState<VenueSpecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!selectedLocationId) return;
    setLoading(true);
    try {
      const response = await venueApi.getSpecials(selectedLocationId);
      setSpecials(response.specials);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Specials could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (workspaceLoading)
    return (
      <SyncPage title="Specials" icon={Tags} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !selectedLocation)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!selectedLocation || !selectedLocationId)
    return (
      <SyncPage title="Specials" icon={Tags}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const toggle = async (special: VenueSpecial) => {
    try {
      await venueApi.updateSpecial({
        id: special.id,
        status: special.status === "published" ? "draft" : "published",
      });
      await load();
    } catch (error) {
      Alert.alert(
        "Could not update special",
        error instanceof Error ? error.message : "Try again later."
      );
    }
  };
  return (
    <SyncPage
      title="Specials"
      subtitle="Publish time-boxed offers for this venue location."
      icon={Tags}
      refreshing={refreshing}
      onRefresh={() => {
        void refresh(true);
        void load();
      }}
      right={
        <Pressable
          accessibilityLabel="Add special"
          accessibilityRole="button"
          onPress={() => router.push("/(drawer)/special-new" as never)}
          className="mt-1 h-10 w-10 items-center justify-center rounded-2xl bg-[#f4c95d]"
        >
          <Plus size={18} color="#410d25" />
        </Pressable>
      }
    >
      <SyncLocationSwitcher />
      <View className="rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-3.5">
        <Text className="text-xs leading-5 text-[#d9bda9]">
          Menu-linked targeting is not exposed by the current Sync API. Specials
          are published by category, price, and description.
        </Text>
      </View>
      {loading ? (
        <Text className="py-6 text-center text-sm text-[#d9bda9]">
          Loading specials…
        </Text>
      ) : errorMessage ? (
        <SyncEmpty title="Specials unavailable" detail={errorMessage} />
      ) : specials.length === 0 ? (
        <SyncEmpty
          icon={Tags}
          title="No specials yet"
          detail="Create a venue-wide special for the next service period."
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(drawer)/special-new" as never)}
              className="mt-2 rounded-full bg-[#f4c95d] px-4 py-2.5"
            >
              <Text className="text-xs font-black text-[#410d25]">
                Create special
              </Text>
            </Pressable>
          }
        />
      ) : (
        specials.map((special) => (
          <View
            key={special.id}
            className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4"
          >
            <View className="flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-black text-[#fff6dd]">
                  {special.title}
                </Text>
                <Text className="text-xs text-[#d9bda9]">
                  {special.category}
                  {special.priceText ? ` · ${special.priceText}` : ""}
                </Text>
              </View>
              <SyncStatus value={special.status} />
            </View>
            <Text className="text-sm leading-5 text-[#f3d9af]">
              {special.description || "No description added."}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void toggle(special)}
              className="self-start rounded-full border border-[#f4c95d]/20 px-3.5 py-2.5"
            >
              <Text className="text-xs font-black text-[#f4c95d]">
                {special.status === "published"
                  ? "Pause special"
                  : "Publish special"}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </SyncPage>
  );
}
