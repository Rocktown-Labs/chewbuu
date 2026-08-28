import { useRouter } from "expo-router";
import { BriefcaseBusiness } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { SyncLocationSwitcher, SyncPage } from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import { venueApi } from "@/lib/venue-api";

export default function NewJobScreen() {
  const router = useRouter();
  const { refresh, selectedLocationId } = useSyncWorkspace();
  const [title, setTitle] = useState("");
  const [employmentType, setEmploymentType] = useState("Part-time");
  const [payText, setPayText] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [description, setDescription] = useState("");
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const save = async () => {
    if (!selectedLocationId || !title.trim() || !description.trim()) {
      setErrorMessage("A title and description are required.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await venueApi.upsertJobListing({
        applicationUrl: applicationUrl.trim() || undefined,
        description: description.trim(),
        employmentType: employmentType.trim() || "Part-time",
        locationId: selectedLocationId,
        payText: payText.trim() || undefined,
        scheduleText: scheduleText.trim() || undefined,
        status: publish ? "published" : "draft",
        title: title.trim(),
      });
      await refresh(true);
      Alert.alert(
        "Job saved",
        publish
          ? "The listing is now public."
          : "The listing is saved as a draft.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save job listing."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SyncPage
      title="New job listing"
      subtitle="Create a draft or publish a location-specific opening."
      icon={BriefcaseBusiness}
      back
    >
      <SyncLocationSwitcher />
      <View className="gap-3 rounded-3xl border border-[#f4c95d]/15 bg-[#581631] p-4">
        <Input
          accessibilityLabel="Job title"
          autoCapitalize="words"
          onChangeText={setTitle}
          placeholder="Job title"
          value={title}
        />
        <Input
          accessibilityLabel="Employment type"
          onChangeText={setEmploymentType}
          placeholder="Part-time"
          value={employmentType}
        />
        <Input
          accessibilityLabel="Pay information"
          onChangeText={setPayText}
          placeholder="Pay, e.g. $18/hour"
          value={payText}
        />
        <Input
          accessibilityLabel="Schedule information"
          onChangeText={setScheduleText}
          placeholder="Schedule, e.g. Weekends"
          value={scheduleText}
        />
        <Input
          accessibilityLabel="Application URL"
          autoCapitalize="none"
          keyboardType="url"
          onChangeText={setApplicationUrl}
          placeholder="Application URL (optional)"
          value={applicationUrl}
        />
        <Input
          accessibilityLabel="Job description"
          onChangeText={setDescription}
          placeholder="Describe the role"
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
            Applicants will use the application URL you provide.
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
          {saving ? "Saving…" : "Save job listing"}
        </Text>
      </Pressable>
    </SyncPage>
  );
}
