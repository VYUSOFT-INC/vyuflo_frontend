import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [isIosDevice] = useState(() => isIos());

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      // Capture the event so our Install button can open Chrome's install dialog.
      // (The address-bar icon is unreliable and often missing.)
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canPrompt = Boolean(deferredPrompt) && !installed;
  const showIosHint = isIosDevice && !installed;

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") setInstalled(true);
      return outcome;
    } catch {
      setDeferredPrompt(null);
      return "unavailable";
    }
  }, [deferredPrompt]);

  return {
    canPrompt,
    showIosHint,
    installed,
    promptInstall,
  };
}
