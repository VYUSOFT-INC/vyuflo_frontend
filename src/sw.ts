/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

// injectManifest injects this; we intentionally do not precache the app
// (precaching the ~3MB bundle was freezing the browser).
void self.__WB_MANIFEST;

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Chrome requires a fetch handler for installability.
// Only handle navigations so we don't add latency to every asset request.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
  }
});

const APP_NAME = "Vyuflo";
const DEFAULT_ICON = "/pwa/icon-192.png";

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; icon?: string; url?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: APP_NAME, body: event.data.text(), url: "/" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || APP_NAME, {
      body: payload.body || "",
      icon: payload.icon || DEFAULT_ICON,
      badge: DEFAULT_ICON,
      data: { url: payload.url || "/" },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      tag: "vyuflo-notif",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            void client.focus();
            client.postMessage({ type: "PUSH_NAV", url: targetUrl });
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(self.location.origin + targetUrl);
        }
      })
  );
});
