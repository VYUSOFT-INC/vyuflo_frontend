// src/components/settings/ThemeColorStrip.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Compact theme color picker for the Profile settings page header.
// Sits beside the "Edit" button.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { Palette, Check, ChevronDown } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { isValidHex } from "../../theme/colors";
import { useUpdateTheme } from "../../hooks/useTheme";

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { hex: "#4f46e5", name: "Indigo" },
  { hex: "#2563eb", name: "Blue" },
  { hex: "#0891b2", name: "Cyan" },
  { hex: "#059669", name: "Emerald" },
  { hex: "#d97706", name: "Amber" },
  { hex: "#dc2626", name: "Red" },
  { hex: "#9333ea", name: "Purple" },
  { hex: "#db2777", name: "Pink" },
  { hex: "#475569", name: "Slate" },
  { hex: "#0f172a", name: "Dark" },
];

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

export function ThemeColorStrip() {
  const { hex: currentHex } = useTheme();
  const { save, saving } = useUpdateTheme();

  const [open, setOpen] = useState(false);
  const [customHex, setCustomHex] = useState(currentHex);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Sync custom input when external theme changes
  useEffect(() => {
    setCustomHex(currentHex);
  }, [currentHex]);

  function handleSelect(hex: string) {
    save(hex);
    setOpen(false);
  }

  function handleCustomInput(raw: string) {
    let v = raw;
    if (v && !v.startsWith("#")) v = "#" + v;
    setCustomHex(v);
    if (isValidHex(v)) save(v);
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-[8px] border border-[#e5e7eb]
                   hover:bg-[#f9fafb] transition-colors text-[13px] font-medium text-[#6b7280]"
      >
        <div
          className="size-5 rounded-full border border-white shadow-sm shrink-0"
          style={{ backgroundColor: currentHex }}
        />
        <Palette size={14} className="text-[#9ca3af]" />
        <span className="hidden sm:inline">Theme</span>
        <ChevronDown
          size={12}
          className={`text-[#9ca3af] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 z-50 bg-white border border-[#e5e7eb]
                     rounded-[12px] shadow-lg p-4 w-[280px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-[#111827]">Theme Color</p>
            {saving && (
              <span className="text-[11px] text-[#9ca3af] animate-pulse">Saving…</span>
            )}
          </div>

          <p className="text-[12px] text-[#6b7280] mb-3 leading-[18px]">
            Changes your buttons, navigation, and accents across the app.
          </p>

          {/* Swatch grid */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {PRESETS.map((p) => {
              const active = currentHex.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  title={p.name}
                  onClick={() => handleSelect(p.hex)}
                  className={`size-10 rounded-full transition-all duration-150 border-2 flex items-center justify-center ${
                    active
                      ? "border-[#111827] scale-110 shadow-md"
                      : "border-transparent hover:scale-105 hover:shadow-sm"
                  }`}
                  style={{ backgroundColor: p.hex }}
                >
                  {active && (
                    <Check
                      size={14}
                      className={isDark(p.hex) ? "text-white" : "text-[#111827]"}
                      strokeWidth={2.5}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom hex input */}
          <div className="flex items-center gap-2">
            <div
              className="size-8 rounded-full border border-[#e5e7eb] shrink-0"
              style={{
                backgroundColor: isValidHex(customHex) ? customHex : "#e5e7eb",
              }}
            />
            <input
              type="text"
              value={customHex}
              onChange={(e) => handleCustomInput(e.target.value)}
              placeholder="#4f46e5"
              maxLength={7}
              className={`flex-1 px-2.5 h-8 rounded-[6px] border font-mono text-[13px]
                         focus:outline-none focus:ring-2 transition ${
                isValidHex(customHex)
                  ? "border-[#e5e7eb] focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                  : customHex.length > 1
                    ? "border-red-300 bg-red-50 focus:ring-red-400"
                    : "border-[#e5e7eb] focus:ring-[var(--theme-primary)]"
              }`}
            />
          </div>

          {/* Live preview */}
          <div className="mt-3 pt-3 border-t border-[#f3f4f6] flex items-center gap-2">
            <div
              className="h-6 px-3 rounded-[5px] flex items-center"
              style={{
                background: `linear-gradient(to right, var(--theme-primary), var(--theme-gradient-end))`,
              }}
            >
              <span className="text-[11px] font-medium text-[var(--theme-foreground)]">
                Button
              </span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--theme-light)] text-[var(--theme-dark)]">
              Badge
            </span>
            <span className="text-[var(--theme-primary)] text-[11px] font-medium">
              Link
            </span>
          </div>
        </div>
      )}
    </div>
  );
}