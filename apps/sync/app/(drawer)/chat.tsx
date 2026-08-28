import { useRouter } from "expo-router";
import { Hash, MessageCircle, Send } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  SYNC_COLORS,
  SyncEmpty,
  SyncError,
  SyncLocationSwitcher,
  SyncPage,
} from "@/components/sync-ui";
import { Input } from "@/components/ui/input";
import { useSyncWorkspace } from "@/contexts/sync-workspace-context";
import {
  venueApi,
  type ApiChatMessage,
  type VenueSyncChannel,
} from "@/lib/venue-api";

export default function ChatScreen() {
  const router = useRouter();
  const {
    error,
    loading: workspaceLoading,
    refresh,
    selectedLocation,
    selectedLocationId,
  } = useSyncWorkspace();
  const [channels, setChannels] = useState<VenueSyncChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    const loadChannels = async () => {
      setLoading(true);
      try {
        const { channels: next } =
          await venueApi.getChannels(selectedLocationId);
        if (!cancelled) {
          setChannels(next);
          setSelectedChannelId((current) => current || next[0]?.id || "");
        }
      } catch (error) {
        if (!cancelled)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Work chat could not be loaded."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadChannels();
    return () => {
      cancelled = true;
    };
  }, [selectedLocationId]);
  const channel = channels.find((item) => item.id === selectedChannelId);
  useEffect(() => {
    if (!channel) return;
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const { messages: next } = await venueApi.getMessages(channel.roomId);
        if (!cancelled) setMessages(next);
      } catch (error) {
        if (!cancelled)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Messages could not be loaded."
          );
      }
    };
    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [channel]);
  const send = async () => {
    if (!channel || !text.trim() || sending) return;
    setSending(true);
    try {
      const response = await venueApi.sendMessage(channel.roomId, {
        kind: "text",
        text: text.trim(),
      });
      setMessages((current) => [...current, response.message]);
      setText("");
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  };
  if (workspaceLoading)
    return (
      <SyncPage title="Work chat" icon={MessageCircle} scroll={false}>
        <View />
      </SyncPage>
    );
  if (error && !selectedLocation)
    return <SyncError message={error} onRetry={() => void refresh(true)} />;
  if (!selectedLocation || !selectedLocationId)
    return (
      <SyncPage title="Work chat" icon={MessageCircle}>
        <SyncEmpty title="No venue assigned" />
      </SyncPage>
    );
  return (
    <SyncPage
      title="Work chat"
      subtitle="Location-scoped announcements and staff conversation."
      icon={MessageCircle}
      scroll={false}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="gap-3 px-4 pt-4">
          <SyncLocationSwitcher />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {channels.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === selectedChannelId }}
                onPress={() => setSelectedChannelId(item.id)}
                className={`flex-row items-center gap-2 rounded-full border px-3.5 py-2.5 ${item.id === selectedChannelId ? "border-[#f4c95d] bg-[#f4c95d]" : "border-[#f4c95d]/20 bg-[#581631]"}`}
              >
                <Hash
                  size={13}
                  color={
                    item.id === selectedChannelId
                      ? SYNC_COLORS.burgundy
                      : SYNC_COLORS.gold
                  }
                />
                <Text
                  className={`text-xs font-black ${item.id === selectedChannelId ? "text-[#410d25]" : "text-[#fff6dd]"}`}
                >
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#f4c95d" />
          </View>
        ) : channels.length === 0 ? (
          <View className="flex-1 justify-center px-4">
            <SyncEmpty
              icon={MessageCircle}
              title="No work channel yet"
              detail="A venue admin can create the shared staff channel from the web workspace."
            />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-4"
            contentContainerStyle={{
              gap: 10,
              paddingBottom: 18,
              paddingTop: 16,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <Text className="py-8 text-center text-sm text-[#d9bda9]">
                No messages yet. Start the shift conversation.
              </Text>
            ) : (
              messages.map((message) => (
                <View
                  key={message.id}
                  className="self-start max-w-[88%] gap-1 rounded-2xl rounded-tl-md border border-[#f4c95d]/15 bg-[#581631] p-3"
                >
                  <Text className="text-[10px] font-black uppercase text-[#f4c95d]">
                    {message.senderId === "me" ? "You" : "Staff"}
                  </Text>
                  <Text className="text-sm leading-5 text-[#fff6dd]">
                    {message.text || "Attachment"}
                  </Text>
                  <Text className="text-[10px] text-[#d9bda9]">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
        {errorMessage ? (
          <Text className="px-4 pb-2 text-xs font-semibold text-[#ff9a91]">
            {errorMessage}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2 border-t border-[#f4c95d]/15 bg-[#410d25] px-4 pb-4 pt-3">
          <View className="flex-1">
            <Input
              accessibilityLabel="Chat message"
              onChangeText={setText}
              onSubmitEditing={() => void send()}
              placeholder="Message the team"
              returnKeyType="send"
              value={text}
            />
          </View>
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            disabled={sending || !text.trim() || !channel}
            onPress={() => void send()}
            className={`h-11 w-11 items-center justify-center rounded-full bg-[#f4c95d] ${sending || !text.trim() || !channel ? "opacity-50" : ""}`}
          >
            <Send size={17} color="#410d25" />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(drawer)/(tabs)/shifts" as never)}
          className="pb-2"
        >
          <Text className="text-center text-xs font-black text-[#f4c95d]">
            Open staff roster
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SyncPage>
  );
}
