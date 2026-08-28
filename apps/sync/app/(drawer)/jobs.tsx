import { useRouter } from "expo-router";
import { BriefcaseBusiness, Plus } from "lucide-react-native";
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
import { venueApi, type VenueJobListing } from "@/lib/venue-api";

export default function JobsScreen() {
  const router = useRouter();
  const {
    error,
    loading: workspaceLoading,
    refresh,
    refreshing,
    selectedLocation,
    selectedLocationId,
  } = useSyncWorkspace();
  const [listings, setListings] = useState<VenueJobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!selectedLocationId) return;
    setLoading(true);
    try {
      const response = await venueApi.getJobListings(selectedLocationId);
      setListings(response.listings);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Job listings could not be loaded."
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
      <SyncPage title="Jobs" icon={BriefcaseBusiness} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !selectedLocation)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!selectedLocation || !selectedLocationId)
    return (
      <SyncPage title="Jobs" icon={BriefcaseBusiness}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  const toggle = async (listing: VenueJobListing) => {
    try {
      await venueApi.upsertJobListing({
        applicationUrl: listing.applicationUrl,
        description: listing.description,
        employmentType: listing.employmentType,
        expiresAt: listing.expiresAt,
        id: listing.id,
        locationId: listing.locationId,
        payText: listing.payText,
        scheduleText: listing.scheduleText,
        status: listing.status === "published" ? "draft" : "published",
        title: listing.title,
      });
      await load();
    } catch (error) {
      Alert.alert(
        "Could not update job",
        error instanceof Error ? error.message : "Try again later."
      );
    }
  };
  return (
    <SyncPage
      title="Jobs"
      subtitle="Publish hiring listings for this venue location."
      icon={BriefcaseBusiness}
      refreshing={refreshing}
      onRefresh={() => {
        void refresh(true);
        void load();
      }}
      right={
        <Pressable
          accessibilityLabel="Add job listing"
          accessibilityRole="button"
          onPress={() => router.push("/(drawer)/job-new" as never)}
          className="mt-1 h-10 w-10 items-center justify-center rounded-2xl bg-[#f4c95d]"
        >
          <Plus size={18} color="#410d25" />
        </Pressable>
      }
    >
      <SyncLocationSwitcher />
      <View className="rounded-2xl border border-[#f4c95d]/15 bg-[#581631] p-3.5">
        <Text className="text-xs leading-5 text-[#d9bda9]">
          Listings are attached to this location. Applicant records are not
          exposed by the current Sync API, so applicants use the configured
          application URL.
        </Text>
      </View>
      {loading ? (
        <Text className="py-6 text-center text-sm text-[#d9bda9]">
          Loading jobs…
        </Text>
      ) : errorMessage ? (
        <SyncEmpty title="Jobs unavailable" detail={errorMessage} />
      ) : listings.length === 0 ? (
        <SyncEmpty
          icon={BriefcaseBusiness}
          title="No job listings"
          detail="Create a listing for the next hiring round."
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(drawer)/job-new" as never)}
              className="mt-2 rounded-full bg-[#f4c95d] px-4 py-2.5"
            >
              <Text className="text-xs font-black text-[#410d25]">
                Create listing
              </Text>
            </Pressable>
          }
        />
      ) : (
        listings.map((listing) => (
          <View
            key={listing.id}
            className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4"
          >
            <View className="flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-black text-[#fff6dd]">
                  {listing.title}
                </Text>
                <Text className="text-xs capitalize text-[#d9bda9]">
                  {listing.employmentType}
                  {listing.payText ? ` · ${listing.payText}` : ""}
                </Text>
              </View>
              <SyncStatus value={listing.status} />
            </View>
            <Text
              className="text-sm leading-5 text-[#f3d9af]"
              numberOfLines={4}
            >
              {listing.description}
            </Text>
            {listing.scheduleText ? (
              <Text className="text-xs font-semibold text-[#d9bda9]">
                Schedule · {listing.scheduleText}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void toggle(listing)}
              className="self-start rounded-full border border-[#f4c95d]/20 px-3.5 py-2.5"
            >
              <Text className="text-xs font-black text-[#f4c95d]">
                {listing.status === "published"
                  ? "Pause listing"
                  : "Publish listing"}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </SyncPage>
  );
}
