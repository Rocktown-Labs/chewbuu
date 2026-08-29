import type { RealtimeChannelClient } from "@chewbuu/aws-blocks";
import { useEffect } from "react";

export const useRealtimeChannel = <T>(
  channel: RealtimeChannelClient<T> | undefined,
  onMessage: (data: T) => void
) => {
  useEffect(() => {
    if (!channel) return;
    const subscription = channel.subscribe({
      onDisconnect: () => {},
      onMessage,
    });
    const waitForConnection = async () => {
      try {
        await subscription.established;
      } catch {
        // Realtime authorization failures should not crash the chat screen.
      }
    };
    void waitForConnection();
    return () => subscription.unsubscribe();
  }, [channel, onMessage]);
};
