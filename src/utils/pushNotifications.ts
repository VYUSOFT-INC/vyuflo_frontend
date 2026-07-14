// src/utils/pushNotifications.ts

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// Fix: return Uint8Array directly — no intermediate type issue
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawBinary = atob(base64);
  const outputArray = new Uint8Array(rawBinary.length);
  for (let i = 0; i < rawBinary.length; i++) {
    outputArray[i] = rawBinary.charCodeAt(i);
  }
  return outputArray;
}

let _swReg:       ServiceWorkerRegistration | null = null;
let _navCallback: ((path: string) => void)  | null = null;

export async function initPushNotifications(
  navigateFn?: (path: string) => void
): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!VAPID_PUBLIC_KEY) {
    console.warn("[Push] VITE_VAPID_PUBLIC_KEY not set — push disabled.");
    return;
  }
  try {
    _swReg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    console.info("[Push] Service worker registered.");
    if (navigateFn) _navCallback = navigateFn;
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "PUSH_NAV" && _navCallback) {
        _navCallback(event.data.url as string);
      }
    });
  } catch (err) {
    console.error("[Push] SW registration failed:", err);
  }
}

export function setPushNavigate(fn: (path: string) => void): void {
  _navCallback = fn;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function subscribeToPush(): Promise<"ok" | "denied" | "unsupported" | "error"> {
  if (!("Notification" in window) || !("PushManager" in window)) return "unsupported";
  if (!_swReg || !VAPID_PUBLIC_KEY) return "error";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const existing = await _swReg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const sub = await _swReg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Post to backend — inline fetch so no import needed
    const json = sub.toJSON();
    await fetch("/api/v1/notifications/push-subscription", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });

    console.info("[Push] Subscribed ✓");
    return "ok";
  } catch (err) {
    console.error("[Push] Subscribe error:", err);
    return "error";
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!_swReg) return;
  try {
    const sub = await _swReg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch("/api/v1/notifications/push-subscription", {
        method: "DELETE",
        credentials: "include",
      });
      console.info("[Push] Unsubscribed ✓");
    }
  } catch (err) {
    console.error("[Push] Unsubscribe error:", err);
  }
}

export function showLocalNotification(
  title: string,
  body: string,
  url: string
): void {
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/logo192.png",
      tag:  "visaflow-msg",
    });
    n.onclick = () => {
      window.focus();
      if (_navCallback) _navCallback(url);
      n.close();
    };
  } catch {
    _swReg?.showNotification(title, {
      body,
      icon: "/logo192.png",
      data: { url },
    });
  }
}