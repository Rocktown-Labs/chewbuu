import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text,
  View,
} from "react-native";

import { cn } from "@/lib/utils";

export interface ButtonProps extends PressableProps {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "glass"
    | "sugar";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
  loading?: boolean;
  className?: string;
  textClassName?: string;
  enableHaptics?: boolean;
}

export function Button({
  children,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  className,
  textClassName,
  enableHaptics = true,
  onPress,
  ...props
}: ButtonProps) {
  const handlePress = (e: any) => {
    if (disabled || loading) return;
    if (enableHaptics) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary": {
        return "bg-secondary active:bg-secondary/80 border border-border/40";
      }
      case "destructive": {
        return "bg-red-600 active:bg-red-700 text-white";
      }
      case "outline": {
        return "border border-border/80 bg-transparent active:bg-card/40";
      }
      case "ghost": {
        return "bg-transparent active:bg-card/40";
      }
      case "glass": {
        return "bg-white/10 dark:bg-white/5 border border-white/20 active:bg-white/20";
      }
      case "sugar": {
        return "bg-amber-500 active:bg-amber-600 border border-amber-400/50 shadow-md";
      }
      default: {
        return "bg-primary active:bg-primary/90 shadow-sm";
      }
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case "secondary": {
        return "text-secondary-foreground font-semibold";
      }
      case "destructive": {
        return "text-white font-semibold";
      }
      case "outline":
      case "ghost": {
        return "text-foreground font-semibold";
      }
      case "glass": {
        return "text-foreground font-semibold";
      }
      case "sugar": {
        return "text-black font-bold";
      }
      default: {
        return "text-primary-foreground font-semibold";
      }
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm": {
        return "h-9 px-3.5 rounded-full";
      }
      case "lg": {
        return "h-13 px-6 rounded-full";
      }
      case "icon": {
        return "h-10 w-10 rounded-full justify-center items-center p-0";
      }
      default: {
        return "h-11 px-5 rounded-full";
      }
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case "sm": {
        return "text-xs";
      }
      case "lg": {
        return "text-base";
      }
      case "icon": {
        return "text-sm";
      }
      default: {
        return "text-sm";
      }
    }
  };

  return (
    <Pressable
      className={cn(
        "flex-row items-center justify-center transition-all",
        getVariantStyles(),
        getSizeStyles(),
        disabled && "opacity-50",
        className
      )}
      disabled={disabled || loading}
      onPress={handlePress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "default" ? "#000000" : "#ffffff"}
        />
      ) : typeof children === "string" ? (
        <Text
          className={cn(
            getTextVariantStyles(),
            getTextSizeStyles(),
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
