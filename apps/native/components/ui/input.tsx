import React from "react";
import { TextInput, type TextInputProps, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { cn } from "@/lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
  containerClassName?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export function Input({
  className,
  containerClassName,
  startIcon,
  endIcon,
  placeholderTextColor,
  ...props
}: InputProps) {
  const { isDark } = useAppTheme();

  return (
    <View
      className={cn(
        "flex-row items-center rounded-full border border-border/80 bg-card/60 px-4 h-12 gap-2.5 focus:border-primary",
        containerClassName
      )}
    >
      {startIcon}
      <TextInput
        className={cn("flex-1 text-sm font-medium text-foreground", className)}
        placeholderTextColor={
          placeholderTextColor ?? (isDark ? "#888888" : "#999999")
        }
        {...props}
      />
      {endIcon}
    </View>
  );
}
