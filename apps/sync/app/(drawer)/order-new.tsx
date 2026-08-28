import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Minus, Plus, ReceiptText, Table2 } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  SYNC_COLORS,
  SyncEmpty,
  SyncFilterPill,
  SyncLocationSwitcher,
  SyncPage,
} from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi, type VenueMenuItem } from "@/lib/venue-api";

export default function NewOrderScreen() {
  const router = useRouter();
  const { tableId: initialTableId } = useLocalSearchParams<{
    tableId?: string;
  }>();
  const { board, refresh, selectedLocation, selectedLocationId } =
    useSyncWorkspace();
  const [menuItems, setMenuItems] = useState<VenueMenuItem[]>([]);
  const [guestName, setGuestName] = useState("");
  const [selectedTableId, setSelectedTableId] = useState(initialTableId ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    const loadMenu = async () => {
      setLoading(true);
      try {
        const { items } = await venueApi.getMenuItems(selectedLocationId);
        if (!cancelled) {
          setMenuItems(
            items.filter((item) => item.available && item.status !== "archived")
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Menu could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadMenu();
    return () => {
      cancelled = true;
    };
  }, [selectedLocationId]);
  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(menuItems.map((item) => item.section || "Featured"))
      ),
    ],
    [menuItems]
  );
  const visibleItems =
    category === "All"
      ? menuItems
      : menuItems.filter((item) => (item.section || "Featured") === category);
  const orderedItems = menuItems
    .filter((item) => (cart[item.id] ?? 0) > 0)
    .map((item) => ({ item, quantity: cart[item.id] ?? 0 }));
  const subtotal = orderedItems.reduce(
    (sum, line) => sum + line.item.priceCents * line.quantity,
    0
  );
  const tables = board?.tables ?? [];
  const changeQuantity = (id: string, delta: number) =>
    setCart((current) => {
      const quantity = Math.max(0, (current[id] ?? 0) + delta);
      if (quantity === 0) {
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: quantity };
    });
  const submit = async () => {
    if (!selectedLocationId || !guestName.trim() || orderedItems.length === 0) {
      setErrorMessage("Add a guest name and at least one menu item.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await venueApi.createOrder({
        customerName: guestName.trim(),
        items: orderedItems.map(({ item, quantity }) => ({
          menuItemId: item.id,
          name: item.name,
          quantity,
          unitPriceCents: item.priceCents,
        })),
        locationId: selectedLocationId,
        source: "staff",
        ...(selectedTableId ? { tableId: selectedTableId } : {}),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh(true);
      Alert.alert(
        "Order started",
        "Saved as unpaid until checkout is enabled.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The order could not be created."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SyncPage
      title="New order"
      subtitle="Guest → items → kitchen. Payment stays gated."
      icon={ReceiptText}
      back
    >
      <SyncLocationSwitcher />
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Text className="text-sm font-black text-[#fff6dd]">Guest name</Text>
        <Input
          accessibilityLabel="Guest name"
          autoCapitalize="words"
          onChangeText={setGuestName}
          placeholder="Guest or party name"
          value={guestName}
        />
      </View>
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-black text-[#fff6dd]">Table</Text>
            <Text className="text-xs text-[#d9bda9]">
              Optional for counter orders.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedTableId("")}
            className={`rounded-full px-3 py-2 ${selectedTableId ? "bg-[#410d25]" : "bg-[#f4c95d]"}`}
          >
            <Text
              className={`text-xs font-black ${selectedTableId ? "text-[#d9bda9]" : "text-[#410d25]"}`}
            >
              Counter
            </Text>
          </Pressable>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {tables.map((table) => {
            const selected = table.id === selectedTableId;
            return (
              <Pressable
                key={table.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedTableId(table.id)}
                className={`flex-row items-center gap-2 rounded-2xl border px-3 py-2.5 ${selected ? "border-[#f4c95d] bg-[#f4c95d]" : "border-[#f4c95d]/15 bg-[#410d25]"}`}
              >
                <Table2
                  size={14}
                  color={selected ? SYNC_COLORS.burgundy : SYNC_COLORS.gold}
                />
                <Text
                  className={`text-xs font-black ${selected ? "text-[#410d25]" : "text-[#fff6dd]"}`}
                >
                  {table.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View className="gap-3">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-sm font-black text-[#fff6dd]">Menu</Text>
            <Text className="text-xs text-[#d9bda9]">
              Tap plus to build the order.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(drawer)/menu" as never)}
          >
            <Text className="text-xs font-black text-[#f4c95d]">
              Manage menu
            </Text>
          </Pressable>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {categories.map((item) => (
            <SyncFilterPill
              key={item}
              value={item}
              label={item}
              selected={category === item}
              onPress={setCategory}
            />
          ))}
        </View>
        {loading ? (
          <Text className="py-6 text-center text-sm text-[#d9bda9]">
            Loading available menu items…
          </Text>
        ) : visibleItems.length === 0 ? (
          <SyncEmpty
            title="No available items"
            detail="Publish a menu item before starting an order."
          />
        ) : (
          visibleItems.map((item) => (
            <MenuLine
              key={item.id}
              item={item}
              quantity={cart[item.id] ?? 0}
              onChange={(delta) => changeQuantity(item.id, delta)}
            />
          ))
        )}
      </View>
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/30 bg-[#6b2342] p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-black text-[#fff6dd]">Review</Text>
            <Text className="text-xs text-[#d9bda9]">
              {orderedItems.length} menu lines
            </Text>
          </View>
          <Text className="text-xl font-black text-[#f4c95d]">
            ${(subtotal / 100).toFixed(2)}
          </Text>
        </View>
        {errorMessage ? (
          <Text className="text-xs font-semibold text-[#ff9a91]">
            {errorMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void submit()}
          className={`h-12 items-center justify-center rounded-full bg-[#f4c95d] ${saving ? "opacity-50" : ""}`}
        >
          <Text className="text-sm font-black text-[#410d25]">
            {saving ? "Starting order…" : "Send to kitchen"}
          </Text>
        </Pressable>
      </View>
    </SyncPage>
  );
}
function MenuLine({
  item,
  quantity,
  onChange,
}: {
  item: VenueMenuItem;
  quantity: number;
  onChange: (delta: number) => void;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-3.5">
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-black text-[#fff6dd]">{item.name}</Text>
        <Text className="text-xs text-[#d9bda9]" numberOfLines={1}>
          {item.description || item.section || "Available now"}
        </Text>
      </View>
      <Text className="text-sm font-black text-[#f4c95d]">
        ${(item.priceCents / 100).toFixed(2)}
      </Text>
      <View className="flex-row items-center gap-1 rounded-full bg-[#410d25] p-1">
        <Pressable
          accessibilityLabel={`Remove one ${item.name}`}
          accessibilityRole="button"
          disabled={!quantity}
          onPress={() => onChange(-1)}
          className="h-8 w-8 items-center justify-center rounded-full"
        >
          <Minus size={14} color={quantity ? SYNC_COLORS.cream : "#81566a"} />
        </Pressable>
        <Text className="w-4 text-center text-sm font-black text-[#fff6dd]">
          {quantity}
        </Text>
        <Pressable
          accessibilityLabel={`Add one ${item.name}`}
          accessibilityRole="button"
          onPress={() => onChange(1)}
          className="h-8 w-8 items-center justify-center rounded-full bg-[#f4c95d]"
        >
          <Plus size={14} color={SYNC_COLORS.burgundy} />
        </Pressable>
      </View>
    </View>
  );
}
