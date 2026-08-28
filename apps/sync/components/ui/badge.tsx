import React from "react";
import { Text, View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

export interface BadgeProps extends ViewProps {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "sugar"
    | "glass";
  children?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
  textClassName,
  ...props
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary": {
        return "bg-secondary border-border/40 text-secondary-foreground";
      }
      case "destructive": {
        return "bg-red-500/20 border-red-500/30 text-red-400";
      }
      case "outline": {
        return "border-border/80 bg-transparent text-foreground";
      }
      case "success": {
        return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
      }
      case "sugar": {
        return "bg-amber-500/20 border-amber-400/40 text-amber-300";
      }
      case "glass": {
        return "bg-white/10 dark:bg-white/5 border-white/20 text-foreground";
      }
      default: {
        return "bg-primary/20 border-primary/30 text-primary-foreground";
      }
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case "secondary": {
        return "text-secondary-foreground";
      }
      case "destructive": {
        return "text-red-400";
      }
      case "outline": {
        return "text-foreground";
      }
      case "success": {
        return "text-emerald-400";
      }
      case "sugar": {
        return "text-amber-400 font-bold";
      }
      case "glass": {
        return "text-foreground";
      }
      default: {
        return "text-primary-foreground font-semibold";
      }
    }
  };

  return (
    <View
      className={cn(
        "flex-row items-center self-start rounded-full border px-2.5 py-1",
        getVariantStyles(),
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "text-xs font-medium tracking-wide",
            getTextVariantStyles(),
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
