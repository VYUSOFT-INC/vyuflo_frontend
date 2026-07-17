// public/sw.js
// VisaFlow Service Worker — handles background push notifications.
// Must be plain JS (no JSX/ESM imports). Vite serves public/ at root.

const APP_NAME = "VisaFlow";

// ── Push received from backend ─────────────────────────────────────────────
self.addEventListener("push", function (event) {
  if (!event.data) return;

  var payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: APP_NAME, body: event.data.text(), url: "/" };
  }

  var options = {
    body:               payload.body  || "",
    icon:               payload.icon  || "/logo192.png",
    badge:              "/logo192.png",
    data:               { url: payload.url || "/" },
    vibrate:            [200, 100, 200],
    requireInteraction: false,
    tag:                "visaflow-notif",
    renotify:           true,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || APP_NAME, options)
  );
});

// ── User clicks the notification popup ────────────────────────────────────
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if ("focus" in client) {
            client.focus();
            client.postMessage({ type: "PUSH_NAV", url: targetUrl });
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(self.location.origin + targetUrl);
        }
      })
  );
});

// ── Activate immediately ──────────────────────────────────────────────────
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});