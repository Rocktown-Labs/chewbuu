import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const brandIcon = require("@/assets/images/icon.png");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setErrorMessage("Please enter both email/username and password.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const isEmail = trimmedIdentifier.includes("@");
      const response = isEmail
        ? await authClient.signIn.email({
            email: trimmedIdentifier,
            password,
          })
        : await authClient.signIn.username({
            password,
            username: trimmedIdentifier.replace(/^@/, ""),
          });

      if (response.error) {
        const { code } = response.error as { code?: string };
        if (code === "EMAIL_NOT_VERIFIED") {
          setErrorMessage("Please verify your email, then sign in.");
        } else {
          setErrorMessage(response.error.message || "Failed to sign in.");
        }
        setLoading(false);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const session = await authClient.getSession();
      const hasCompletedOnboarding =
        (session.data?.user as { hasCompletedOnboarding?: boolean } | undefined)
          ?.hasCompletedOnboarding ?? true;
      setLoading(false);
      router.replace(
        hasCompletedOnboarding ? "/(drawer)/(tabs)" : "/onboarding"
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Sign in failed."
      );
      setLoading(false);
    }
  };

  const handleGuestExplore = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/(drawer)/(tabs)");
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
          paddingTop: insets.top + 40,
          flexGrow: 1,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 flex-col items-center gap-3">
          <View className="size-24 items-center justify-center overflow-hidden rounded-3xl border border-border shadow-md bg-card">
            <Image
              contentFit="cover"
              source={brandIcon}
              style={{ height: 96, width: 96 }}
            />
          </View>

          <Text className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Real People, Real Dates, Real Results.
          </Text>
          <Text className="text-center text-4xl font-semibold leading-tight text-foreground">
            Meet for something worth showing up for.
          </Text>
          <Text className="max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
            Chewbuu helps singles, friends, couples, and circles plan real dates
            around food, drinks, games, events, and quick video-first intros.
          </Text>
        </View>

        <Card className="flex-col gap-4 border-border bg-card p-5 shadow-xl">
          <Text className="text-xl font-bold text-foreground">Sign In</Text>
          {errorMessage ? (
            <View className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
              <Text className="text-xs font-semibold text-red-400">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View className="flex-col gap-1.5">
            <Text className="ml-1 text-xs font-semibold text-foreground">
              Email or username
            </Text>
            <Input
              autoCapitalize="none"
              autoComplete="username"
              keyboardType="default"
              onChangeText={setIdentifier}
              placeholder="you@example.com or @username"
              value={identifier}
              startIcon={<Mail size={16} color="#888888" />}
            />
          </View>

          <View className="flex-col gap-1.5">
            <Text className="ml-1 text-xs font-semibold text-foreground">
              Password
            </Text>
            <Input
              autoComplete="password"
              onChangeText={setPassword}
              onSubmitEditing={() => void handleSignIn()}
              placeholder="••••••••"
              returnKeyType="go"
              secureTextEntry
              value={password}
              startIcon={<Lock size={16} color="#888888" />}
            />
          </View>

          <Button
            className="mt-2 h-10 w-full gap-2"
            disabled={loading}
            onPress={() => void handleSignIn()}
            size="lg"
            variant="default"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#1c1206" />
            ) : (
              <>
                <Text className="text-sm font-bold text-primary-foreground">
                  Sign In
                </Text>
                <ArrowRight size={16} color="#1c1206" />
              </>
            )}
          </Button>

          <Button
            className="h-10 w-full gap-1.5"
            onPress={handleGuestExplore}
            size="sm"
            variant="outline"
          >
            <Sparkles size={14} color="#e6c46a" />
            <Text className="text-xs font-bold text-primary">
              Explore Chewbuu as Guest
            </Text>
          </Button>

          <View className="mt-2 flex-col items-center gap-2">
            <Link href="/auth/sign-up" asChild>
              <Pressable>
                <Text className="text-sm text-foreground">
                  Forgot password?
                </Text>
              </Pressable>
            </Link>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs text-muted-foreground">
                Need to create an account?
              </Text>
              <Link href="/auth/sign-up" asChild>
                <Pressable>
                  <Text className="text-xs font-semibold text-foreground underline">
                    Sign Up
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
