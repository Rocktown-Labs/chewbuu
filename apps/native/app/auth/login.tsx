import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import {
  ArrowRight,
  Flame,
  KeyRound,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassView } from "@/components/ui/glass-view";
import { Input } from "@/components/ui/input";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await authClient.signIn.email({
        email: email.trim(),
        password: password.trim(),
      });

      if (response.error) {
        setErrorMessage(response.error.message || "Failed to sign in.");
        setLoading(false);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);
      router.replace("/(drawer)/(tabs)");
    } catch (error: any) {
      setErrorMessage(error?.message || "Sign in failed.");
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
          paddingHorizontal: 24,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          flexGrow: 1,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Headline */}
        <View className="flex-col items-center gap-3 mb-8 text-center">
          <GlassView
            className="size-16 rounded-3xl border-amber-500/40 bg-amber-950/40 items-center justify-center shadow-xl"
            borderRadius={24}
          >
            <Flame size={32} color="#f59e0b" />
          </GlassView>

          <Text className="text-3xl font-black text-foreground tracking-tight mt-2">
            Welcome to Chewbuu
          </Text>
          <Text className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
            Real dinner dates, curated spots, and verified video singles.
          </Text>
        </View>

        {/* Login Form Card */}
        <Card className="p-6 border-border/80 flex-col gap-4 shadow-xl">
          {errorMessage && (
            <View className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30">
              <Text className="text-xs font-semibold text-red-400">
                {errorMessage}
              </Text>
            </View>
          )}

          <View className="flex-col gap-1.5">
            <Text className="text-xs font-bold text-foreground">Email</Text>
            <Input
              placeholder="you@domain.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              startIcon={<Mail size={16} color="#888888" />}
            />
          </View>

          <View className="flex-col gap-1.5">
            <Text className="text-xs font-bold text-foreground">Password</Text>
            <Input
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              startIcon={<Lock size={16} color="#888888" />}
            />
          </View>

          <Button
            variant="sugar"
            size="lg"
            className="w-full mt-2 h-12 gap-2 shadow-lg"
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Text className="text-sm font-black text-black">Sign In</Text>
                <ArrowRight size={16} color="#000000" />
              </>
            )}
          </Button>

          {/* Guest Explore Action */}
          <Button
            variant="glass"
            size="sm"
            className="w-full h-10 gap-1.5"
            onPress={handleGuestExplore}
          >
            <Sparkles size={14} color="#f59e0b" />
            <Text className="text-xs font-bold text-amber-400">
              Explore Chewbuu as Guest
            </Text>
          </Button>

          <View className="flex-row items-center justify-center gap-1 pt-2 border-t border-border/40 mt-2">
            <Text className="text-xs text-muted-foreground">
              Don't have an account?
            </Text>
            <Link href="/auth/sign-up" asChild>
              <Pressable>
                <Text className="text-xs font-bold text-amber-400">
                  Create One
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
