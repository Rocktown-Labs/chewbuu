import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import {
  ArrowRight,
  Flame,
  Lock,
  Mail,
  Sparkles,
  User,
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
import { authClient } from "@/lib/auth-client";

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });

      if (response.error) {
        setErrorMessage(response.error.message || "Failed to create account.");
        setLoading(false);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);
      // Route immediately into Onboarding
      router.replace("/onboarding");
    } catch (error: any) {
      setErrorMessage(error?.message || "Sign up failed.");
      setLoading(false);
    }
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
        <View className="flex-col items-center gap-3 mb-8 text-center">
          <GlassView
            className="size-16 rounded-3xl border-amber-500/40 bg-amber-950/40 items-center justify-center shadow-xl"
            borderRadius={24}
          >
            <Flame size={32} color="#f59e0b" />
          </GlassView>

          <Text className="text-3xl font-black text-foreground tracking-tight mt-2">
            Create Account
          </Text>
          <Text className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
            Join Chewbuu to meet verified singles for real date spots.
          </Text>
        </View>

        <Card className="p-6 border-border/80 flex-col gap-4 shadow-xl">
          {errorMessage && (
            <View className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30">
              <Text className="text-xs font-semibold text-red-400">
                {errorMessage}
              </Text>
            </View>
          )}

          <View className="flex-col gap-1.5">
            <Text className="text-xs font-bold text-foreground">Full Name</Text>
            <Input
              placeholder="Elena Rostova"
              value={name}
              onChangeText={setName}
              startIcon={<User size={16} color="#888888" />}
            />
          </View>

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
              placeholder="At least 8 characters"
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
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Text className="text-sm font-black text-black">
                  Continue to Onboarding
                </Text>
                <ArrowRight size={16} color="#000000" />
              </>
            )}
          </Button>

          <View className="flex-row items-center justify-center gap-1 pt-2 border-t border-border/40 mt-2">
            <Text className="text-xs text-muted-foreground">
              Already have an account?
            </Text>
            <Link href="/auth/login" asChild>
              <Pressable>
                <Text className="text-xs font-bold text-amber-400">
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
