// src/hooks/employee/usePushNotifications.ts
// NOTE: place this in src/hooks/employee/ (not src/hooks/)
// because PushNotificationBanner imports from '../hooks/employee/usePushNotifications'

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  initPushNotifications,
} from "../../utils/pushNotifications";
import { useNotificationPreferences } from "./useNotifications";

export type PushState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied"
  | "loading";

export function usePushNotifications() {
  const navigate = useNavigate();
  const { prefs, update: updatePrefs } = useNotificationPreferences();
  const [pushState, setPushState] = useState<PushState>("default");

  // Register the service worker once. navigator.serviceWorker.register()
  // resolves to the same registration if already registered, so this is
  // safe to call from every component that uses this hook.
  useEffect(() => {
    initPushNotifications(navigate);
  }, [navigate]);

  // Sync with actual browser permission on mount
  useEffect(() => {
    const perm = getPushPermission();
    if (perm === "unsupported") { setPushState("unsupported"); return; }
    if (perm === "granted")     { setPushState("granted");     return; }
    if (perm === "denied")      { setPushState("denied");      return; }
    setPushState("default");
  }, []);

  const enable = useCallback(async () => {
    setPushState("loading");
    const result = await subscribeToPush();
    if (result === "ok") {
      setPushState("granted");
      await updatePrefs({ push_enabled: true });
    } else if (result === "denied") {
      setPushState("denied");
    } else {
      setPushState("default");
    }
  }, [updatePrefs]);

  const disable = useCallback(async () => {
    await unsubscribeFromPush();
    setPushState("default");
    await updatePrefs({ push_enabled: false });
  }, [updatePrefs]);

  const toggle = useCallback(async () => {
    if (pushState === "granted") await disable();
    else await enable();
  }, [pushState, enable, disable]);

  return {
    pushState,
    isGranted:     pushState === "granted",
    isDenied:      pushState === "denied",
    isUnsupported: pushState === "unsupported",
    isLoading:     pushState === "loading",
    isPrefEnabled: prefs?.push_enabled ?? false,
    enable,
    disable,
    toggle,
  };
}