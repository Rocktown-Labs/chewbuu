import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import {
  ArrowRight,
  Flame,
  LogOut,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassView } from "@/components/ui/glass-view";
import { authClient } from "@/lib/auth-client";
import {
  calculateCompletionPercentage,
  DEFAULT_ONBOARDING_DATA,
  loadOnboardingDraft,
  type OnboardingData,
} from "@/lib/onboarding-storage";

export default function AccountScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingData>(
    DEFAULT_ONBOARDING_DATA
  );

  useEffect(() => {
    async function load() {
      const draft = await loadOnboardingDraft();
      setOnboardingDraft(draft);
    }
    void load();
  }, []);

  const completionPercent = calculateCompletionPercentage(onboardingDraft);

  const handleSignOut = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await authClient.signOut();
  };

  if (isPending) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand Header */}
      <View className="flex-row items-center justify-between pb-2">
        <View className="flex-row items-center gap-2">
          <View className="size-8 rounded-full bg-amber-500/20 border border-amber-400/40 items-center justify-center">
            <Flame size={16} color="#f59e0b" />
          </View>
          <Text className="text-xl font-extrabold text-foreground tracking-tight">
            Account & Session
          </Text>
        </View>
      </View>

      {session?.user ? (
        /* Signed In User Card */
        <Card className="p-5 border-border/80 flex-col gap-4">
          <View className="flex-row items-center gap-3.5">
            <Avatar size="lg" className="border border-amber-500/40">
              {session.user.image ? (
                <AvatarImage source={{ uri: session.user.image }} />
              ) : (
                <AvatarFallback>
                  {session.user.name?.slice(0, 2) || "CB"}
                </AvatarFallback>
              )}
            </Avatar>

            <View className="flex-col gap-0.5 flex-1">
              <Text className="text-base font-bold text-foreground">
                {session.user.name || "Chewbuu Member"}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {session.user.email}
              </Text>
              <Badge variant="sugar" className="self-start px-2 py-0.5 mt-1">
                <Text className="text-[10px] font-bold text-amber-300">
                  Dating Mode Active
                </Text>
              </Badge>
            </View>
          </View>

          {/* Onboarding Status Progress */}
          <GlassView
            className="p-3.5 border-border/60 bg-muted/40 flex-col gap-2"
            borderRadius={20}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-foreground">
                Profile Setup: {completionPercent}% Complete
              </Text>
              <Text className="text-[11px] font-semibold text-amber-400">
                {onboardingDraft.isComplete ? "Completed" : "Draft Saved"}
              </Text>
            </View>

            <View className="h-2 rounded-full bg-black/20 overflow-hidden">
              <View
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${completionPercent}%` }}
              />
            </View>

            {!onboardingDraft.isComplete && (
              <Button
                variant="sugar"
                size="sm"
                className="mt-1 gap-1"
                onPress={() => router.push("/onboarding")}
              >
                <Sparkles size={13} color="#000000" />
                <Text className="text-xs font-bold text-black">
                  Resume Onboarding
                </Text>
              </Button>
            )}
          </GlassView>

          <Button
            variant="destructive"
            size="sm"
            className="w-full gap-1.5"
            onPress={handleSignOut}
          >
            <LogOut size={14} color="#ffffff" />
            <Text className="text-xs font-bold text-white">Sign Out</Text>
          </Button>
        </Card>
      ) : (
        /* Guest / Signed Out State */
        <Card className="p-6 border-border/80 flex-col items-center gap-4 text-center">
          <View className="size-14 rounded-3xl bg-amber-500/20 border border-amber-400/40 items-center justify-center">
            <User size={28} color="#f59e0b" />
          </View>

          <View className="flex-col items-center gap-1">
            <Text className="text-lg font-bold text-foreground">
              Sign In to Your Account
            </Text>
            <Text className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
              Sign in or complete profile onboarding to access video speed
              dates, reservation invites, and Safety Circle alerts.
            </Text>
          </View>

          <View className="flex-col gap-2.5 w-full mt-2">
            <Button
              variant="sugar"
              size="lg"
              className="w-full h-12 gap-2"
              onPress={() => router.push("/auth/login")}
            >
              <Text className="text-sm font-black text-black">Sign In</Text>
              <ArrowRight size={16} color="#000000" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 gap-2"
              onPress={() => router.push("/auth/sign-up")}
            >
              <Text className="text-sm font-bold text-foreground">
                Create Account
              </Text>
            </Button>

            <Button
              variant="glass"
              size="sm"
              className="w-full h-10 gap-1.5 mt-1"
              onPress={() => router.push("/onboarding")}
            >
              <Sparkles size={14} color="#f59e0b" />
              <Text className="text-xs font-bold text-amber-400">
                Launch Onboarding Wizard
              </Text>
            </Button>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}
