import { Image, type ImageProps } from "expo-image";
import React, { useState } from "react";
import { Text, View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

export interface AvatarProps extends ViewProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({
  size = "md",
  className,
  children,
  ...props
}: AvatarProps) {
  const getSizeStyles = () => {
    switch (size) {
      case "sm": {
        return "h-8 w-8";
      }
      case "lg": {
        return "h-14 w-14";
      }
      case "xl": {
        return "h-20 w-20";
      }
      default: {
        return "h-10 w-10";
      }
    }
  };

  return (
    <View
      className={cn(
        "relative rounded-full overflow-hidden border border-border/80 bg-muted flex items-center justify-center",
        getSizeStyles(),
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

export function AvatarImage({
  className,
  source,
  ...props
}: ImageProps & { className?: string }) {
  const [error, setError] = useState(false);

  if (error || !source) return null;

  return (
    <Image
      className={cn("h-full w-full object-cover", className)}
      source={source}
      onError={() => setError(true)}
      {...props}
    />
  );
}

export function AvatarFallback({
  children,
  className,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      className={cn(
        "h-full w-full items-center justify-center bg-primary/20",
        className
      )}
      {...props}
    >
      <Text className="text-xs font-bold text-primary-foreground uppercase">
        {children}
      </Text>
    </View>
  );
}
