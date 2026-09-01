// src/components/ui/RenamePromptModal.tsx
//
// Shared modal for two purposes:
//   1. "Name this document" — shown right after picking/dropping a file,
//      before it uploads. Confirm renames the File object client-side
//      (no backend call); Skip uploads with the original filename.
//   2. "Rename document" — shown for an already-uploaded document. Confirm
//      calls the caller's onConfirm (which should hit the backend rename
//      endpoint); there's no Skip in this mode since there's nothing to
//      default to beyond just closing.
//
// Deliberately stays presentation-only — callers own what "confirm" and
// "skip" actually do (upload vs. rename-endpoint call), so this component
// doesn't need to know about documents.api.ts / documentHub.api.ts at all.

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface RenamePromptModalProps {
  open:         boolean;
  mode:         "upload" | "rename";
  initialValue: string;
  saving?:      boolean;
  onConfirm:    (newName: string) => void;
  onSkip?:      () => void;   // only used/shown in "upload" mode
  onCancel:     () => void;
}

export function RenamePromptModal({
  open, mode, initialValue, saving = false, onConfirm, onSkip, onCancel,
}: RenamePromptModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  const title = mode === "upload" ? "Name this document" : "Rename document";
  const confirmLabel = mode === "upload" ? "Upload" : "Save";

  function handleConfirm() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[90]" onClick={saving ? undefined : onCancel} />
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-2xl p-[24px] flex flex-col gap-[16px]">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#0f172a]">{title}</h3>
            <button onClick={onCancel} disabled={saving}
              className="text-[#94a3b8] hover:text-[#374151] transition disabled:opacity-40">
              <X size={18} />
            </button>
          </div>

          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleConfirm(); }}
            disabled={saving}
            placeholder="Document name"
            className="w-full h-[42px] px-[14px] rounded-[10px] border-2 border-[#e2e8f0] text-[14px] text-[#111827] focus:outline-none focus:border-indigo-600 disabled:opacity-60"
          />

          <div className="flex items-center justify-end gap-[10px]">
            {mode === "upload" && onSkip && (
              <button onClick={onSkip} disabled={saving}
                className="h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition disabled:opacity-50">
                Skip — use original name
              </button>
            )}
            <button onClick={handleConfirm} disabled={saving || !value.trim()}
              className="h-[38px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-[6px]"
              style={{ backgroundImage: "linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))" }}>
              {saving && (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}