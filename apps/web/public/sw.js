// Chewbuu Service Worker for Push Notifications, Haptics & PWA

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {
    badge: "/brand/chewbuu-logo-500-trans.png",
    body: "You have a new update on Chewbuu!",
    icon: "/brand/chewbuu-logo-500.png",
    title: "Chewbuu",
    url: "/me",
  };

  try {
    const data = event.data.json();
    payload = {
      ...payload,
      ...data,
      data: {
        url: data.url || payload.url,
        ...data.data,
      },
    };
  } catch {
    payload.body = event.data.text() || payload.body;
  }

  const notificationOptions = {
    actions: [
      { action: "open_url", title: "View Now" },
      { action: "dismiss", title: "Dismiss" },
    ],
    badge: payload.badge || "/brand/chewbuu-logo-500-trans.png",
    body: payload.body,
    data: payload.data || { url: payload.url || "/me" },
    icon: payload.icon || "/brand/chewbuu-logo-500.png",
    renotify: true,
    tag: payload.tag || "chewbuu-notification",
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title || "Chewbuu",
      notificationOptions
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/me";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      for (const client of clientList) {
        if ("focus" in client && client.url?.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});
