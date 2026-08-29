import { useLiveQuery } from "@tanstack/react-db";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  UserPlus,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { profileCollection, refreshDatingData } from "@/lib/db/collections";

const readString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined;

const readStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { isDark, toggleTheme } = useAppTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    data: profiles,
    isError,
    isLoading,
  } = useLiveQuery({
    query: (q) =>
      session?.user ? q.from({ profile: profileCollection }) : undefined,
  });
  const profile = profiles?.[0];
  const displayName =
    readString(profile?.name) ??
    readString(profile?.username) ??
    "Your profile";
  const bio = readString(profile?.bio);
  const interests = readStringArray(profile?.interests);
  const trustedContacts = Array.isArray(profile?.trustedContacts)
    ? profile.trustedContacts
    : [];
  const media = profile?.media ?? [];
  const identityStatus = readString(profile?.identityStatus) ?? "not_started";

  const initials = useMemo(
    () =>
      displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [displayName]
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDatingData();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-5 pb-3 pt-2"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20">
            <ShieldCheck color="#f59e0b" size={16} />
          </View>
          <Text className="text-xl font-extrabold tracking-tight text-foreground">
            Profile
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityLabel="Toggle theme"
            className="rounded-full border border-border/80 bg-card p-2"
            onPress={toggleTheme}
          >
            {isDark ? (
              <Sun color="#fbbf24" size={16} />
            ) : (
              <Moon color="#3b82f6" size={16} />
            )}
          </Pressable>
          <Pressable
            accessibilityLabel="Refresh profile"
            className="rounded-full p-2 active:bg-muted"
            disabled={isRefreshing}
            onPress={() => void refresh()}
          >
            <RefreshCw color="#f59e0b" size={18} />
          </Pressable>
        </View>
      </View>

      {!isSessionPending && !session?.user ? (
        <Card className="mx-4 p-4">
          <Text className="text-sm font-semibold text-foreground">
            Sign in to view your profile.
          </Text>
          <Button
            className="mt-3 h-9 self-start px-3"
            onPress={() => router.push("/auth/login")}
            size="sm"
            variant="sugar"
          >
            <Text className="text-xs font-bold text-black">Sign in</Text>
          </Button>
        </Card>
      ) : null}
      <FlatList
        contentContainerStyle={{
          gap: 12,
          paddingBottom: 110,
          paddingHorizontal: 16,
        }}
        data={media}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Card className="p-4">
            <Text className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading your profile…"
                : isError
                  ? "Profile data is unavailable. Refresh to try again."
                  : "No profile media yet."}
            </Text>
          </Card>
        }
        ListHeaderComponent={
          <View>
            <Card className="items-center p-5">
              {media[0]?.url ? (
                <Image
                  contentFit="cover"
                  source={{ uri: media[0].url }}
                  style={{ borderRadius: 44, height: 88, width: 88 }}
                />
              ) : (
                <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-amber-500/20">
                  <Text className="text-xl font-bold text-amber-400">
                    {initials}
                  </Text>
                </View>
              )}
              <Text className="mt-3 text-lg font-bold text-foreground">
                {displayName}
              </Text>
              <Badge
                className="mt-2"
                variant={identityStatus === "verified" ? "success" : "outline"}
              >
                <Text className="text-[10px] font-semibold text-foreground">
                  Identity: {identityStatus.replaceAll("_", " ")}
                </Text>
              </Badge>
              {bio ? (
                <Text className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                  {bio}
                </Text>
              ) : null}
              <Button
                className="mt-4 h-9 px-4"
                onPress={() => router.push("/onboarding")}
                size="sm"
                variant="outline"
              >
                <Text className="text-xs font-semibold text-foreground">
                  Edit profile in onboarding
                </Text>
              </Button>
            </Card>
            <Card className="mt-3 p-4">
              <View className="flex-row items-center gap-2">
                <UserPlus color="#34d399" size={16} />
                <Text className="text-sm font-bold text-foreground">
                  Safety circle
                </Text>
                <Badge className="ml-auto" variant="success">
                  <Text className="text-[10px] font-bold text-emerald-400">
                    {trustedContacts.length} contacts
                  </Text>
                </Badge>
              </View>
              <Text className="mt-2 text-xs text-muted-foreground">
                Trusted contacts receive safety updates for active dates.
              </Text>
              {trustedContacts.length === 0 ? (
                <Text className="mt-3 text-xs text-muted-foreground">
                  Add trusted contacts during onboarding.
                </Text>
              ) : null}
            </Card>
            {interests.length > 0 ? (
              <Card className="mt-3 p-4">
                <Text className="text-sm font-bold text-foreground">
                  Interests
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge key={interest} variant="glass">
                      <Text className="text-[10px] text-foreground">
                        {interest}
                      </Text>
                    </Badge>
                  ))}
                </View>
              </Card>
            ) : null}
            {media.length > 0 ? (
              <Text className="mb-1 mt-5 px-1 text-sm font-bold text-muted-foreground">
                Profile media
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Image
            contentFit="cover"
            source={{ uri: item.url }}
            style={{ borderRadius: 14, height: 120, width: "31%" }}
          />
        )}
        numColumns={3}
        columnWrapperStyle={{ gap: 8 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
