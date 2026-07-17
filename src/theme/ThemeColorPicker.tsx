// src/theme/ThemeColorPicker.tsx
// ────────────────────────────────────────────────────────────────────────────
// A self-contained color picker section for ProfileSetupPage or Settings.
// Shows preset swatches + a custom hex input. Calls setThemeColor (from
// useTheme) on selection so the whole page updates live as a preview.
// ────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { isValidHex } from "./colors";

// ── Preset palette — curated for a professional SaaS look ───────────────────

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

interface ThemeColorPickerProps {
  /** Called with the selected hex whenever it changes.
   *  Wire this to your form state so it's included in the save payload. */
  onChange?: (hex: string) => void;
  /** Current value from form state (overrides internal state on mount) */
  value?: string;
}

export function ThemeColorPicker({ onChange, value }: ThemeColorPickerProps) {
  const { hex: currentTheme, setThemeColor } = useTheme();
  const [customHex, setCustomHex] = useState(value ?? currentTheme);
  const [activeHex, setActiveHex] = useState(value ?? currentTheme);

  // Sync if value prop changes externally
  useEffect(() => {
    if (value && isValidHex(value) && value !== activeHex) {
      setActiveHex(value);
      setCustomHex(value);
    }
  }, [value]);

  function select(hex: string) {
    setActiveHex(hex);
    setCustomHex(hex);
    setThemeColor(hex); // live preview
    onChange?.(hex);
  }

  function handleCustomInput(raw: string) {
    // Auto-prepend # if they type without it
    let v = raw;
    if (v && !v.startsWith("#")) v = "#" + v;
    setCustomHex(v);

    if (isValidHex(v)) {
      setActiveHex(v);
      setThemeColor(v);
      onChange?.(v);
    }
  }

  return (
    <div className="flex flex-col gap-6 items-start w-full">
      <div className="border-b border-[#f3f4f6] pb-[9px] w-full">
        <p className="font-semibold text-[#111827] text-[18px] leading-[28px]">
          Theme Color
        </p>
      </div>

      <p className="font-normal text-[#6b7280] text-[14px] leading-[21px]">
        Choose a color that will personalise your dashboard, buttons, and
        navigation throughout Vyuflo.
      </p>

      {/* Preset swatches */}
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((p) => {
          const isActive =
            activeHex.toLowerCase() === p.hex.toLowerCase();
          return (
            <button
              key={p.hex}
              type="button"
              title={p.name}
              onClick={() => select(p.hex)}
              className={`rounded-full size-10 transition-all duration-150 border-2 ${
                isActive
                  ? "border-[#111827] scale-110 shadow-md"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: p.hex }}
            >
              {isActive && (
                <svg
                  className="w-4 h-4 mx-auto"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke={
                      // Use white check on dark colors, dark on light
                      ["#d97706", "#059669"].includes(p.hex)
                        ? "#111827"
                        : "#ffffff"
                    }
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-3 w-full max-w-[320px]">
        {/* Preview circle */}
        <div
          className="rounded-full size-10 shrink-0 border border-[#e5e7eb]"
          style={{
            backgroundColor: isValidHex(customHex) ? customHex : "#e5e7eb",
          }}
        />
        <div className="flex flex-col gap-1 flex-1">
          <label className="font-medium text-[#111827] text-[14px] leading-[21px]">
            Custom Color
          </label>
          <input
            type="text"
            value={customHex}
            onChange={(e) => handleCustomInput(e.target.value)}
            placeholder="#4f46e5"
            maxLength={7}
            className={`bg-white border px-3 h-[42px] rounded-[8px] w-full font-mono text-[14px] focus:outline-none focus:ring-2 transition ${
              isValidHex(customHex)
                ? "border-[#e5e7eb] focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                : customHex.length > 1
                  ? "border-red-300 bg-red-50 focus:ring-red-400"
                  : "border-[#e5e7eb] focus:ring-[var(--theme-primary)]"
            }`}
          />
        </div>
      </div>

      {/* Live preview strip */}
      <div className="flex flex-col gap-3 items-start w-full">
        <p className="font-medium text-[#6b7280] text-[12px] leading-[18px] uppercase tracking-[0.5px]">
          Preview
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            className="h-9 px-4 rounded-[8px] font-medium text-[13px] text-[var(--theme-foreground)] transition"
            style={{
              background: `linear-gradient(to right, var(--theme-primary), var(--theme-gradient-end))`,
            }}
          >
            Primary Button
          </button>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium text-[12px] bg-[var(--theme-light)] text-[var(--theme-dark)]">
            Badge
          </span>
          <span className="text-[var(--theme-primary)] font-medium text-[13px] cursor-pointer">
            Text Link
          </span>
          <div className="w-24 bg-[#e5e7eb] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--theme-primary)] h-full rounded-full"
              style={{ width: "66%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}