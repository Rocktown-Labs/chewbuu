import React from "react";
import { Text, View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

import { GlassView } from "./glass-view";

export interface CardProps extends ViewProps {
  variant?: "default" | "glass" | "outline";
  className?: string;
}

export function Card({
  children,
  variant = "default",
  className,
  ...props
}: CardProps) {
  if (variant === "glass") {
    return (
      <GlassView className={cn("p-5", className)} {...props}>
        {children}
      </GlassView>
    );
  }

  return (
    <View
      className={cn(
        "rounded-3xl border border-border/80 bg-card p-5 shadow-xs",
        variant === "outline" && "bg-transparent",
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View className={cn("flex-col gap-1.5 pb-3", className)} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Text className={cn("text-lg font-bold text-foreground", className)}>
      {children}
    </Text>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Text
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
    >
      {children}
    </Text>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View className={cn("py-1", className)} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      className={cn(
        "flex-row items-center justify-between pt-3 border-t border-border/40",
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}
