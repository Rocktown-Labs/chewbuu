import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MessageCircle, RefreshCw, Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { datingApi, type NativeRoom } from "@/lib/dating-api";

const formatMessageTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "";

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rooms, setRooms] = useState<NativeRoom[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  const loadRooms = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const result = await datingApi.getRooms();
      setCurrentUserId(result.currentUserId);
      setRooms(result.rooms);
      setError(undefined);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your chats."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const openRoom = async (room: NativeRoom) => {
    try {
      await datingApi.markChatRead(room.id);
      setRooms((current) =>
        current.map((item) =>
          item.id === room.id ? { ...item, unreadCount: 0 } : item
        )
      );
    } catch (markError) {
      Alert.alert(
        "Could not mark chat read",
        markError instanceof Error ? markError.message : "Please try again."
      );
    }
    router.push({
      pathname: "/chat/[room-id]",
      params: { "room-id": room.id },
    });
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-5 pb-3 pt-2"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20">
            <MessageCircle color="#f59e0b" size={16} />
          </View>
          <Text className="text-xl font-extrabold tracking-tight text-foreground">
            Chats
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh chats"
          className="rounded-full p-2 active:bg-muted"
          disabled={isRefreshing}
          onPress={() => void loadRooms(true)}
        >
          <RefreshCw color="#f59e0b" size={18} />
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 16 }}
        data={rooms}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Card className="mt-3 p-4">
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#f59e0b" />
                <Text className="text-xs text-muted-foreground">
                  Loading conversations…
                </Text>
              </View>
            ) : error ? (
              <>
                <Text className="text-sm font-semibold text-red-400">
                  Chats are unavailable.
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {error}
                </Text>
                <Button
                  className="mt-3 h-9 self-start px-3"
                  onPress={() => void loadRooms(true)}
                  size="sm"
                  variant="outline"
                >
                  <Text className="text-xs font-semibold text-foreground">
                    Retry
                  </Text>
                </Button>
              </>
            ) : (
              <>
                <Sparkles color="#f59e0b" size={18} />
                <Text className="mt-2 text-sm font-semibold text-foreground">
                  No conversations yet.
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  Confirmed matches and date rooms will appear here.
                </Text>
              </>
            )}
          </Card>
        }
        ListHeaderComponent={
          <Card className="mb-4 border-amber-500/30 bg-amber-500/10 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-foreground">
                Match conversations
              </Text>
              <Badge variant="sugar">
                <Text className="text-[10px] font-bold text-amber-400">
                  {rooms.length} active
                </Text>
              </Badge>
            </View>
            <Text className="mt-1 text-xs text-muted-foreground">
              Chat with confirmed matches and keep date plans in one place.
            </Text>
          </Card>
        }
        renderItem={({ item }) => {
          const participant = item.participants.find(
            (candidate) => candidate.id !== currentUserId
          );
          const lastMessage = item.messages.at(-1);
          return (
            <Pressable className="mb-2" onPress={() => void openRoom(item)}>
              <Card className="flex-row items-center gap-3 p-4">
                {participant?.avatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: participant.avatarUrl }}
                    style={{ borderRadius: 24, height: 48, width: 48 }}
                  />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                    <Text className="text-sm font-bold text-amber-400">
                      {(participant?.displayName ?? item.title)
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-sm font-bold text-foreground">
                      {participant?.displayName ?? item.title}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {formatMessageTime(
                        lastMessage?.createdAt ?? item.updatedAt
                      )}
                    </Text>
                  </View>
                  <Text
                    className="mt-1 text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {lastMessage?.text ?? "Start the conversation."}
                  </Text>
                </View>
                {item.unreadCount > 0 ? (
                  <View className="h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1">
                    <Text className="text-[10px] font-bold text-black">
                      {item.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
