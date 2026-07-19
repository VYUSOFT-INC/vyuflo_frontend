// src/hooks/usePushNotifications.ts
// React hook for push notification state.
// Use this in any component that needs to know/change push status.

import { useState, useEffect, useCallback } from "react";
import {
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  setPushNavigate,
} from "../../utils/pushNotifications";
import { useNavigate } from "react-router-dom";
import { useNotificationPreferences } from "../employee/useNotifications";

export type PushState =
  | "unsupported"  // browser doesn't support push
  | "default"      // user hasn't been asked yet
  | "granted"      // subscribed and active
  | "denied"       // user blocked it in browser settings
  | "loading";     // request in flight

export function usePushNotifications() {
  const navigate = useNavigate();
  const { prefs, update: updatePrefs } = useNotificationPreferences();
  const [pushState, setPushState] = useState<PushState>("default");

  // Register navigate so SW notification clicks route correctly
  useEffect(() => {
    setPushNavigate(navigate);
  }, [navigate]);

  // Sync with actual browser permission on mount
  useEffect(() => {
    const perm = getPushPermission();
    if (perm === "unsupported") { setPushState("unsupported"); return; }
    if (perm === "granted")     { setPushState("granted");     return; }
    if (perm === "denied")      { setPushState("denied");      return; }
    setPushState("default");
  }, []);

  // Enable: ask browser → subscribe → save pref
  const enable = useCallback(async () => {
    setPushState("loading");
    const result = await subscribeToPush();
    if (result === "ok") {
      setPushState("granted");
      await updatePrefs({ push_enabled: true });
    } else if (result === "denied") {
      setPushState("denied");
      // Don't save pref — user actively blocked it
    } else {
      setPushState("default"); // error — revert UI
    }
  }, [updatePrefs]);

  // Disable: unsubscribe → save pref
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