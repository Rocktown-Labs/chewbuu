import { BlurView, type BlurViewProps } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { cn } from "@/lib/utils";

export interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: BlurViewProps["tint"];
  borderRadius?: number;
  showSheen?: boolean;
  className?: string;
}

export function GlassView({
  children,
  className,
  style,
  intensity = 45,
  tint,
  borderRadius = 24,
  showSheen = true,
  ...props
}: GlassViewProps) {
  const { isDark } = useAppTheme();
  const effectiveTint = tint ?? (isDark ? "dark" : "light");

  return (
    <View
      className={cn(
        "overflow-hidden border",
        isDark
          ? "border-white/10 bg-black/40 shadow-xl"
          : "border-black/5 bg-white/70 shadow-lg",
        className
      )}
      style={[
        {
          borderRadius,
        },
        style,
      ]}
      {...props}
    >
      {Platform.OS === "ios" || Platform.OS === "android" ? (
        <BlurView
          intensity={intensity}
          tint={effectiveTint}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(18, 12, 10, 0.75)"
                : "rgba(255, 255, 255, 0.85)",
            },
          ]}
        />
      )}

      {showSheen && (
        <LinearGradient
          colors={
            isDark
              ? [
                  "rgba(255, 255, 255, 0.08)",
                  "rgba(255, 255, 255, 0.02)",
                  "transparent",
                ]
              : [
                  "rgba(255, 255, 255, 0.4)",
                  "rgba(255, 255, 255, 0.1)",
                  "transparent",
                ]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.8 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {children}
    </View>
  );
}
