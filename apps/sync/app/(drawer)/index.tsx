import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { LogOut, ShieldCheck, Store, UserRound } from "lucide-react-native";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  SyncEmpty,
  SyncLocationSwitcher,
  SyncPage,
  SyncStatus,
} from "@/components/sync-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { authClient } from "@/lib/auth-client";

export default function SyncAccountScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { board, locations, selectedLocation, selectedLocationId } =
    useSyncWorkspace();
  const signOut = async () => {
    try {
      await authClient.signOut();
      router.replace("/auth/login");
    } catch (error) {
      Alert.alert(
        "Could not sign out",
        error instanceof Error ? error.message : "Try again later."
      );
    }
  };
  return (
    <SyncPage
      title="Sync account"
      subtitle="Your login, venue memberships, and active location."
      icon={UserRound}
    >
      <SyncLocationSwitcher />
      <View className="flex-row items-center gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-5">
        <Avatar size="lg" className="border border-[#f4c95d]/30">
          <AvatarImage
            source={
              session?.user.image ? { uri: session.user.image } : undefined
            }
          />
          <AvatarFallback>
            {session?.user.name?.slice(0, 2) || "CB"}
          </AvatarFallback>
        </Avatar>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-black text-[#fff6dd]">
            {session?.user.name || "Chewbuu member"}
          </Text>
          <Text className="text-xs text-[#d9bda9]" numberOfLines={1}>
            {session?.user.email}
          </Text>
          <SyncStatus value="authenticated" tone="success" />
        </View>
      </View>
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <View className="flex-row items-center gap-3">
          <Store size={18} color="#f4c95d" />
          <Text className="text-sm font-black text-[#fff6dd]">
            Venue access
          </Text>
        </View>
        {locations.length === 0 ? (
          <SyncEmpty
            title="No active locations"
            detail="A venue admin must assign your account before Sync can load operations."
          />
        ) : (
          locations.map((location) => (
            <View
              key={location.id}
              className="flex-row items-center justify-between gap-3 border-t border-[#f4c95d]/10 pt-3"
            >
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-[#fff6dd]">
                  {location.name}
                </Text>
                <Text className="text-xs text-[#d9bda9]">
                  {location.id === selectedLocationId
                    ? "Active location"
                    : location.status}
                </Text>
              </View>
              <SyncStatus value={location.status} />
            </View>
          ))
        )}
      </View>
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <View className="flex-row items-center gap-3">
          <ShieldCheck size={18} color="#8bd6a1" />
          <Text className="text-sm font-black text-[#fff6dd]">
            Current permissions
          </Text>
        </View>
        <Text className="text-xs leading-5 text-[#d9bda9]">
          {board?.viewerRole
            ? `You are a ${board.viewerRole} for ${selectedLocation?.name ?? "this location"}.`
            : "Permissions are checked by the Sync API for every action."}
        </Text>
      </View>
      <Button
        variant="destructive"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          void signOut();
        }}
      >
        <LogOut size={15} color="#fff" />
        <Text className="text-sm font-black text-white">Sign out</Text>
      </Button>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(drawer)/settings" as never)}
        className="py-2"
      >
        <Text className="text-center text-xs font-black text-[#f4c95d]">
          Open business settings
        </Text>
      </Pressable>
    </SyncPage>
  );
}
