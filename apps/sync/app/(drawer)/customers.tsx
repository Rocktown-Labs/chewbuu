import { useRouter } from "expo-router";
import { CircleUserRound, Plus, Search } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncLocationSwitcher,
  SyncPage,
} from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi, type VenueServiceCustomer } from "@/lib/venue-api";

export default function CustomersScreen() {
  const router = useRouter();
  const {
    error,
    loading: workspaceLoading,
    refresh,
    refreshing,
    selectedLocation,
    selectedLocationId,
  } = useSyncWorkspace();
  const [customers, setCustomers] = useState<VenueServiceCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    const loadCustomers = async () => {
      setLoading(true);
      try {
        const { customers: next } = await venueApi.getCustomers({
          locationId: selectedLocationId,
        });
        if (!cancelled) setCustomers(next);
      } catch (error) {
        if (!cancelled)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Guests could not be loaded."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [selectedLocationId]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? customers.filter((customer) =>
          `${customer.displayName} ${customer.notes ?? ""}`
            .toLowerCase()
            .includes(query)
        )
      : customers;
  }, [customers, search]);
  if (workspaceLoading)
    return (
      <SyncPage title="Guests" icon={CircleUserRound} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !selectedLocation)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!selectedLocation || !selectedLocationId)
    return (
      <SyncPage title="Guests" icon={CircleUserRound}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  return (
    <SyncPage
      title="Guests"
      subtitle="Search the venue guest book and create records when taking an order."
      icon={CircleUserRound}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
      right={
        <Pressable
          accessibilityLabel="Add guest"
          accessibilityRole="button"
          onPress={() => router.push("/(drawer)/customer-new" as never)}
          className="mt-1 h-10 w-10 items-center justify-center rounded-2xl bg-[#f4c95d]"
        >
          <Plus size={18} color="#410d25" />
        </Pressable>
      }
    >
      <SyncLocationSwitcher />
      <Input
        accessibilityLabel="Search guests"
        onChangeText={setSearch}
        placeholder="Search by guest or note"
        value={search}
        startIcon={<Search size={16} color="#f4c95d" />}
      />
      {loading ? (
        <Text className="py-6 text-center text-sm text-[#d9bda9]">
          Loading guest book…
        </Text>
      ) : errorMessage ? (
        <SyncEmpty title="Guest book unavailable" detail={errorMessage} />
      ) : filtered.length === 0 ? (
        <SyncEmpty
          icon={CircleUserRound}
          title={search ? "No matching guests" : "No guests yet"}
          detail="Create a guest record from the plus button or New order."
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(drawer)/customer-new" as never)}
              className="mt-2 rounded-full bg-[#f4c95d] px-4 py-2.5"
            >
              <Text className="text-xs font-black text-[#410d25]">
                Add guest
              </Text>
            </Pressable>
          }
        />
      ) : (
        filtered.map((customer) => (
          <View
            key={customer.id}
            className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-4"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#6b2342]">
              <Text className="text-sm font-black text-[#f4c95d]">
                {customer.displayName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-black text-[#fff6dd]">
                {customer.displayName}
              </Text>
              <Text className="text-xs text-[#d9bda9]">
                {customer.notes || "Venue guest"}
              </Text>
            </View>
          </View>
        ))
      )}
    </SyncPage>
  );
}
