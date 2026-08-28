import { useRouter } from "expo-router";
import {
  Building2,
  ChevronRight,
  Cog,
  CreditCard,
  MapPin,
  ShieldCheck,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncError,
  SyncFilterPill,
  SyncLocationSwitcher,
  SyncPage,
} from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi, type VenueServiceConfig } from "@/lib/venue-api";

const modes = [
  { label: "Pre-open", value: "pre_open" },
  { label: "Open", value: "open" },
  { label: "Closing", value: "closing" },
  { label: "Closed", value: "closed" },
] as const;
type Mode = (typeof modes)[number]["value"];
export default function SettingsScreen() {
  const router = useRouter();
  const {
    error,
    loading: workspaceLoading,
    refresh,
    refreshing,
    selectedLocation,
    selectedLocationId,
  } = useSyncWorkspace();
  const [config, setConfig] = useState<VenueServiceConfig | null>(null);
  const [openMinute, setOpenMinute] = useState("");
  const [closeMinute, setCloseMinute] = useState("");
  const [radius, setRadius] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [publicAnalytics, setPublicAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    const loadSettings = async () => {
      setLoading(true);
      try {
        const { config: next } =
          await venueApi.getServiceConfig(selectedLocationId);
        if (cancelled) return;
        setConfig(next);
        setOpenMinute(String(next.openMinute));
        setCloseMinute(String(next.closeMinute));
        setRadius(String(next.geofenceRadiusMeters));
        setMode(next.override ?? null);
      } catch (error) {
        if (!cancelled)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Settings could not be loaded."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [selectedLocationId]);
  if (workspaceLoading)
    return (
      <SyncPage title="Settings" icon={Cog} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !selectedLocation)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!selectedLocation || !selectedLocationId)
    return (
      <SyncPage title="Settings" icon={Cog}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const save = async () => {
    const open = Math.trunc(Number(openMinute));
    const close = Math.trunc(Number(closeMinute));
    const geofence = Math.trunc(Number(radius));
    if (![open, close, geofence].every(Number.isFinite)) {
      setErrorMessage("Open, close, and geofence values must be numbers.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const next = await venueApi.updateServiceConfig({
        closeMinute: close,
        geofenceRadiusMeters: geofence,
        locationId: selectedLocationId,
        openMinute: open,
        override: mode,
      });
      setConfig(next.config);
      await venueApi.setPublicAnalytics({
        enabled: publicAnalytics,
        locationId: selectedLocationId,
        minSamples: 5,
      });
      await refresh(true);
      Alert.alert(
        "Settings saved",
        "Service controls are updated for this location."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Settings could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SyncPage
      title="Business settings"
      subtitle="Control this location’s service rules without changing global brand policy."
      icon={Cog}
      refreshing={refreshing}
      onRefresh={() => void refresh(true)}
    >
      <SyncLocationSwitcher />
      <SettingsLink
        icon={Building2}
        title="Venue profile"
        detail={`${selectedLocation.name} · ${selectedLocation.handle ? `@${selectedLocation.handle}` : "No public handle"}`}
        onPress={() => void Linking.openURL("https://chewbuu.com/venue-portal")}
      />
      <SettingsLink
        icon={ShieldCheck}
        title="Roles & access"
        detail="Membership and location assignments stay server-controlled"
        onPress={() => router.push("/(drawer)/(tabs)/shifts" as never)}
      />
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Text className="text-sm font-black text-[#fff6dd]">Service mode</Text>
        <Text className="text-xs leading-5 text-[#d9bda9]">
          Use an explicit override for unusual service periods.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {modes.map((item) => (
            <SyncFilterPill
              key={item.value}
              value={item.value}
              label={item.label}
              selected={mode === item.value}
              onPress={setMode}
            />
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => setMode(null)}>
          <Text className="text-xs font-black text-[#f4c95d]">
            Use schedule default
          </Text>
        </Pressable>
      </View>
      {loading ? (
        <Text className="py-4 text-center text-sm text-[#d9bda9]">
          Loading service controls…
        </Text>
      ) : (
        <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
          <Text className="text-sm font-black text-[#fff6dd]">
            Hours & one-time checks
          </Text>
          <Text className="text-xs leading-5 text-[#d9bda9]">
            Minutes after midnight. The geofence is only used during an explicit
            clock-in check.
          </Text>
          <Input
            accessibilityLabel="Open minute"
            keyboardType="number-pad"
            onChangeText={setOpenMinute}
            value={openMinute}
          />
          <Input
            accessibilityLabel="Close minute"
            keyboardType="number-pad"
            onChangeText={setCloseMinute}
            value={closeMinute}
          />
          <Input
            accessibilityLabel="Geofence radius"
            keyboardType="number-pad"
            onChangeText={setRadius}
            value={radius}
          />
          <Text className="text-xs text-[#d9bda9]">
            Saved mode: {config?.override ?? "schedule default"}
          </Text>
        </View>
      )}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: publicAnalytics }}
        onPress={() => setPublicAnalytics((value) => !value)}
        className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-4"
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-full border ${publicAnalytics ? "border-[#f4c95d] bg-[#f4c95d]" : "border-[#d9bda9]"}`}
        >
          {publicAnalytics ? (
            <Text className="text-xs font-black text-[#410d25]">✓</Text>
          ) : null}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-black text-[#fff6dd]">
            Public analytics
          </Text>
          <Text className="text-xs leading-5 text-[#d9bda9]">
            Only publish aggregate metrics after the minimum sample size.
          </Text>
        </View>
      </Pressable>
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <View className="flex-row items-center gap-2">
          <CreditCard size={17} color="#f4c95d" />
          <Text className="text-sm font-black text-[#fff6dd]">
            Payments & payouts
          </Text>
        </View>
        <Text className="text-xs leading-5 text-[#d9bda9]">
          Stripe Connect, refunds, tax, and payout policy remain disabled until
          an administrator completes review.
        </Text>
      </View>
      {errorMessage ? (
        <Text className="text-xs font-semibold text-[#ff9a91]">
          {errorMessage}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={saving || loading}
        onPress={() => void save()}
        className={`h-12 items-center justify-center rounded-full bg-[#f4c95d] ${saving || loading ? "opacity-50" : ""}`}
      >
        <Text className="text-sm font-black text-[#410d25]">
          {saving ? "Saving…" : "Save business settings"}
        </Text>
      </Pressable>
      <View className="flex-row items-center justify-center gap-2 py-2">
        <MapPin size={13} color="#d9bda9" />
        <Text className="text-center text-[11px] text-[#d9bda9]">
          Location tracking is never continuous.
        </Text>
      </View>
    </SyncPage>
  );
}
function SettingsLink({
  icon: Icon,
  title,
  detail,
  onPress,
}: {
  icon: typeof Building2;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-4"
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#f4c95d]/10">
        <Icon size={17} color="#f4c95d" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-black text-[#fff6dd]">{title}</Text>
        <Text className="text-xs leading-4 text-[#d9bda9]">{detail}</Text>
      </View>
      <ChevronRight size={17} color="#d9bda9" />
    </Pressable>
  );
}
