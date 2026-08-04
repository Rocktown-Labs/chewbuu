import type { RealtimeChannelClient } from "@chewbuu/aws-blocks";
import { useEffect } from "react";

export const useChatRealtime = <T>({
  channels,
  enabled = true,
  onData,
}: {
  channels: RealtimeChannelClient<T>[];
  enabled?: boolean;
  onData: (payload: { channel: string; data: T }) => void;
}) => {
  useEffect(() => {
    if (!enabled) return;
    const subscriptions = channels.map((channel) =>
      channel.subscribe({
        onDisconnect: () => {},
        onMessage: (data) => onData({ channel: "", data }),
      })
    );
    for (const subscription of subscriptions) {
      void (async () => {
        try {
          await subscription.established;
        } catch {
          // The middleware reports channel authorization failures here.
        }
      })();
    }
    return () => {
      for (const subscription of subscriptions) subscription.unsubscribe();
    };
  }, [channels, enabled, onData]);
};
