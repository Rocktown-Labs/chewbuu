import { api as blocksApi } from "@chewbuu/aws-blocks";
import { env } from "@chewbuu/env/web";

import { triggerHaptic } from "./haptics";

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.codePointAt(i) ?? 0;
  }
  return outputArray;
};

export const isPushSupported = (): boolean => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

export const getPushPermissionState = (): NotificationPermission => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default";
  }
  return Notification.permission;
};

export const registerServiceWorker =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isPushSupported()) {
      return null;
    }
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      return registration;
    } catch (error) {
      console.error("Failed to register service worker:", error);
      return null;
    }
  };

export const subscribeUserToPush = async (
  customVapidKey?: string
): Promise<{
  error?: string;
  ok: boolean;
  subscription?: PushSubscription;
}> => {
  if (!isPushSupported()) {
    return {
      error: "Push notifications are not supported in this browser.",
      ok: false,
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        error: "Notification permission was denied or dismissed.",
        ok: false,
      };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return { error: "Service worker registration failed.", ok: false };
    }

    const sw = await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await sw.pushManager.getSubscription();

    if (!subscription) {
      let vapidKey = customVapidKey ?? env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        const res = (await blocksApi.getVapidPublicKey()) as {
          vapidPublicKey: string | null;
        };
        vapidKey = res.vapidPublicKey ?? undefined;
      }

      if (!vapidKey) {
        return {
          error: "VAPID public key is not configured.",
          ok: false,
        };
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      subscription = await sw.pushManager.subscribe({
        applicationServerKey: applicationServerKey as BufferSource,
        userVisibleOnly: true,
      });
    }

    const rawP256dh = subscription.getKey("p256dh");
    const rawAuth = subscription.getKey("auth");

    const p256dh = rawP256dh
      ? btoa(String.fromCodePoint(...new Uint8Array(rawP256dh)))
      : "";
    const auth = rawAuth
      ? btoa(String.fromCodePoint(...new Uint8Array(rawAuth)))
      : "";

    await blocksApi.savePushSubscription({
      auth,
      endpoint: subscription.endpoint,
      p256dh,
    });

    triggerHaptic("success");
    return { ok: true, subscription };
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to subscribe to push notifications.",
      ok: false,
    };
  }
};
