import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  datingApi,
  type NativeMessage,
  type NativeRoom,
} from "@/lib/dating-api";
import { useRealtimeChannel } from "@/lib/realtime-client";

export default function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ "room-id": string }>();
  const roomId = params["room-id"];
  const [room, setRoom] = useState<NativeRoom>();
  const [messages, setMessages] = useState<NativeMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>();

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const rooms = await datingApi.getRooms();
      const nextRoom = rooms.rooms.find((candidate) => candidate.id === roomId);
      if (!nextRoom) throw new Error("Conversation not found.");
      const result = await datingApi.getMessages(roomId);
      setCurrentUserId(rooms.currentUserId);
      setRoom(nextRoom);
      setMessages(
        result.messages.length > 0 ? result.messages : nextRoom.messages
      );
      await datingApi.markChatRead(roomId);
      setError(undefined);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this conversation."
      );
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  const appendMessage = useCallback((message: NativeMessage) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message]
    );
  }, []);

  useRealtimeChannel(room?.realtimeChannel, appendMessage);

  const title = useMemo(() => {
    if (!room) return "Chat";
    return (
      room.participants.find((participant) => participant.id !== currentUserId)
        ?.displayName ?? room.title
    );
  }, [currentUserId, room]);

  const send = async () => {
    const value = text.trim();
    if (!roomId || !value || isSending) return;
    setIsSending(true);
    try {
      const result = await datingApi.sendMessage(roomId, { text: value });
      appendMessage(result.message);
      setText("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Message failed to send."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View
        className="flex-row items-center gap-3 border-b border-border/60 px-4 pb-3 pt-2"
        style={{ paddingTop: insets.top + 4 }}
      >
        <Pressable
          accessibilityLabel="Go back"
          className="rounded-full p-2 active:bg-muted"
          onPress={() => router.back()}
        >
          <ChevronLeft color="#f59e0b" size={22} />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-foreground">
          {title}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f59e0b" />
        </View>
      ) : error && !room ? (
        <View className="flex-1 items-center justify-center px-6">
          <Card className="p-4">
            <Text className="text-sm font-semibold text-red-400">{error}</Text>
            <Button
              className="mt-3 h-9 self-start px-3"
              onPress={() => void loadRoom()}
              size="sm"
              variant="outline"
            >
              <Text className="text-xs font-semibold text-foreground">
                Retry
              </Text>
            </Button>
          </Card>
        </View>
      ) : (
        <>
          <FlatList
            contentContainerStyle={{ gap: 8, padding: 16 }}
            data={messages}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text className="text-center text-xs text-muted-foreground">
                No messages yet. Say hello.
              </Text>
            }
            renderItem={({ item }) => {
              const isMine = item.senderId === currentUserId;
              return (
                <View
                  className={`max-w-[82%] ${isMine ? "self-end" : "self-start"}`}
                >
                  <View
                    className={`rounded-2xl px-3.5 py-2.5 ${
                      isMine
                        ? "rounded-br-sm bg-amber-500"
                        : "rounded-bl-sm bg-card"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isMine ? "text-black" : "text-foreground"
                      }`}
                    >
                      {item.text ?? "Shared media"}
                    </Text>
                  </View>
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
          <View
            className="flex-row items-end gap-2 border-t border-border/60 px-4 pb-3 pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <TextInput
              className="max-h-28 min-h-11 flex-1 rounded-2xl border border-border/60 bg-card px-3 py-2.5 text-sm text-foreground"
              multiline
              onChangeText={setText}
              placeholder="Write a message…"
              placeholderTextColor="#a1a1aa"
              value={text}
            />
            <Pressable
              accessibilityLabel="Send message"
              className="h-11 w-11 items-center justify-center rounded-full bg-amber-500 active:opacity-80"
              disabled={!text.trim() || isSending}
              onPress={() => void send()}
            >
              <Send color="#000000" size={17} />
            </Pressable>
          </View>
          {error ? (
            <Text className="px-4 pb-2 text-xs text-red-400">{error}</Text>
          ) : null}
        </>
      )}
    </KeyboardAvoidingView>
  );
}
