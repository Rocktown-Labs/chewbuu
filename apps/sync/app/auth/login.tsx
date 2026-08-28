import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { ArrowRight, Lock, Mail, Store } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SYNC_COLORS } from "@/components/sync-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const signIn = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Enter your work email and password to continue.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const response = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (response.error) {
        setErrorMessage(response.error.message || "Sign in failed.");
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(drawer)/(tabs)");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Sign in failed."
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <View className="flex-1 bg-[#410d25]">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
          paddingBottom: insets.bottom + 32,
          paddingTop: insets.top + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-3 pb-8">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-[#f4c95d]">
            <Store size={30} color={SYNC_COLORS.burgundy} />
          </View>
          <Text className="text-center text-3xl font-black tracking-tight text-[#fff6dd]">
            Chewbuu Sync
          </Text>
          <Text className="max-w-xs text-center text-sm leading-5 text-[#d9bda9]">
            The mobile workspace for venue teams. Sign in to view only locations
            assigned to you.
          </Text>
        </View>
        <View className="gap-4 rounded-3xl border border-[#f4c95d]/20 bg-[#581631] p-5">
          {errorMessage ? (
            <View className="rounded-2xl border border-[#ff9a91]/30 bg-[#ff9a91]/10 p-3">
              <Text className="text-xs font-semibold text-[#ff9a91]">
                {errorMessage}
              </Text>
            </View>
          ) : null}
          <View className="gap-2">
            <Text className="text-xs font-black uppercase tracking-wide text-[#f3d9af]">
              Work email
            </Text>
            <Input
              accessibilityLabel="Work email"
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@venue.com"
              value={email}
              startIcon={<Mail size={16} color="#f4c95d" />}
            />
          </View>
          <View className="gap-2">
            <Text className="text-xs font-black uppercase tracking-wide text-[#f3d9af]">
              Password
            </Text>
            <Input
              accessibilityLabel="Password"
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              value={password}
              startIcon={<Lock size={16} color="#f4c95d" />}
            />
          </View>
          <Button
            variant="sugar"
            size="lg"
            onPress={() => void signIn()}
            disabled={loading}
            className="mt-2 w-full gap-2"
          >
            {loading ? (
              <ActivityIndicator color="#410d25" />
            ) : (
              <>
                <Text className="text-sm font-black text-[#410d25]">
                  Sign in to Sync
                </Text>
                <ArrowRight size={16} color="#410d25" />
              </>
            )}
          </Button>
          <View className="flex-row items-center justify-center gap-1 border-t border-[#f4c95d]/10 pt-3">
            <Text className="text-xs text-[#d9bda9]">Need an account?</Text>
            <Link href="/auth/sign-up" asChild>
              <Pressable>
                <Text className="text-xs font-black text-[#f4c95d]">
                  Create one
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
