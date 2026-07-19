// src/components/PushNotificationBanner.tsx
// Shows a bottom banner the first time asking the user to enable push.
// Add <PushNotificationBanner /> inside DashboardLayout.tsx (inside the main content area).

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "../../hooks/employee/usePushNotifications";

export function PushNotificationBanner() {
  const { pushState, enable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("vf_push_banner_dismissed") === "1"
  );

  // Only show when the user hasn't decided yet and hasn't dismissed
  if (dismissed || pushState !== "default") return null;

  const handleEnable = async () => {
    setDismissed(true); // hide immediately regardless of outcome
    localStorage.setItem("vf_push_banner_dismissed", "1");
    await enable();
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("vf_push_banner_dismissed", "1");
  };

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[400px]
                 flex items-center gap-3 bg-white border border-slate-200
                 rounded-2xl shadow-xl px-4 py-3"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--theme-light)", color: "var(--theme-primary)" }}
      >
        <Bell size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 leading-tight">
          Enable push notifications
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Get instant alerts for case updates &amp; deadlines
        </p>
      </div>

      <button
        onClick={handleEnable}
        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                   text-white flex-shrink-0 hover:opacity-90 transition"
        style={{ background: "var(--theme-primary)" }}
      >
        Enable
      </button>

      <button
        onClick={handleDismiss}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-1 transition"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}











