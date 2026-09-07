import React from "react";
import { Text, View } from "react-native";

export function ScreenHeading({
  eyebrow,
  subtitle,
  title,
}: {
  eyebrow?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <View className="px-5 pb-3 pt-3">
      {eyebrow ? (
        <Text className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </Text>
      ) : null}
      <Text className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
