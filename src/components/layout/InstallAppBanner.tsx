import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { usePwaInstall } from "../../hooks/usePwaInstall";

const DISMISS_KEY = "vf_pwa_install_dismissed";

export function InstallAppBanner() {
  const { canInstall, showIosHint, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1"
  );

  if (dismissed || (!canInstall && !showIosHint)) return null;

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome !== "unavailable") {
      setDismissed(true);
      localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px]
                 flex items-center gap-3 bg-white border border-slate-200
                 rounded-2xl shadow-xl px-4 py-3"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--theme-light, #eff6ff)", color: "var(--theme-primary, #2563eb)" }}
      >
        {showIosHint && !canInstall ? <Share size={16} /> : <Download size={16} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 leading-tight">
          Install Vyuflo
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {showIosHint && !canInstall
            ? "Tap Share, then “Add to Home Screen”"
            : "Install the app for quicker access"}
        </p>
      </div>

      {canInstall && (
        <button
          type="button"
          onClick={handleInstall}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                     text-white flex-shrink-0 hover:opacity-90 transition"
          style={{ background: "var(--theme-primary, #2563eb)" }}
        >
          Install
        </button>
      )}

      <button
        type="button"
        onClick={handleDismiss}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-1 transition"
        title="Dismiss"
        aria-label="Dismiss install prompt"
      >
        <X size={14} />
      </button>
    </div>
  );
}
