import { useRouter } from "expo-router";
import { Plus, Utensils } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { venueApi, type VenueMenuItem } from "@/lib/venue-api";

const filters = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Offline", value: "offline" },
] as const;
type Filter = (typeof filters)[number]["value"];
export default function MenuScreen() {
  const router = useRouter();
  const {
    error,
    loading: workspaceLoading,
    refresh,
    refreshing,
    selectedLocation,
    selectedLocationId,
  } = useSyncWorkspace();
  const [items, setItems] = useState<VenueMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!selectedLocationId) return;
    setLoading(true);
    try {
      const response = await venueApi.getMenuItems(selectedLocationId);
      setItems(response.items);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Menu could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId]);
  useEffect(() => {
    void load();
  }, [load]);
  const grouped = useMemo(() => {
    const visible = items.filter(
      (item) =>
        filter === "all" ||
        (filter === "available" ? item.available : !item.available)
    );
    const result = new Map<string, VenueMenuItem[]>();
    for (const item of visible) {
      const section = item.section || "Featured";
      const current = result.get(section) ?? [];
      current.push(item);
      result.set(section, current);
    }
    return Array.from(result.entries());
  }, [filter, items]);
  if (workspaceLoading)
    return (
      <SyncPage title="Menu" icon={Utensils} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !selectedLocation)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!selectedLocation || !selectedLocationId)
    return (
      <SyncPage title="Menu" icon={Utensils}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const toggle = async (item: VenueMenuItem) => {
    try {
      await venueApi.upsertMenuItem({
        available: !item.available,
        description: item.description,
        id: item.id,
        locationId: selectedLocationId,
        name: item.name,
        photoUrl: item.photoUrl,
        priceCents: item.priceCents,
        section: item.section,
        sortOrder: item.sortOrder,
        status: item.status,
      });
      await load();
    } catch (error) {
      Alert.alert(
        "Could not update menu item",
        error instanceof Error ? error.message : "Try again later."
      );
    }
  };
  return (
    <SyncPage
      title="Menu"
      subtitle="Make availability obvious to the floor and kitchen."
      icon={Utensils}
      refreshing={refreshing}
      onRefresh={() => {
        void refresh(true);
        void load();
      }}
      right={
        <Pressable
          accessibilityLabel="Add menu item"
          accessibilityRole="button"
          onPress={() => router.push("/(drawer)/menu-item-new" as never)}
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
      {loading ? (
        <Text className="py-6 text-center text-sm text-[#d9bda9]">
          Loading menu…
        </Text>
      ) : errorMessage ? (
        <SyncEmpty title="Menu unavailable" detail={errorMessage} />
      ) : grouped.length === 0 ? (
        <SyncEmpty
          icon={Utensils}
          title="No menu items"
          detail="Add your first item to make mobile order taking useful."
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(drawer)/menu-item-new" as never)}
              className="mt-2 rounded-full bg-[#f4c95d] px-4 py-2.5"
            >
              <Text className="text-xs font-black text-[#410d25]">
                Add menu item
              </Text>
            </Pressable>
          }
        />
      ) : (
        grouped.map(([section, sectionItems]) => (
          <View key={section} className="gap-2">
            <Text className="text-sm font-black text-[#fff6dd]">{section}</Text>
            {sectionItems.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-4"
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-black text-[#fff6dd]">
                    {item.name}
                  </Text>
                  <Text className="text-xs text-[#d9bda9]">
                    ${(item.priceCents / 100).toFixed(2)} · {item.status}
                  </Text>
                </View>
                <SyncStatus
                  value={item.available ? "available" : "offline"}
                  tone={item.available ? "success" : "danger"}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void toggle(item)}
                  className="rounded-full border border-[#f4c95d]/20 px-3 py-2"
                >
                  <Text className="text-[10px] font-black text-[#f4c95d]">
                    {item.available ? "Pause" : "Enable"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))
      )}
    </SyncPage>
  );
}
