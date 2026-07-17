// src/theme/ThemedComponents.tsx
// ────────────────────────────────────────────────────────────────────────────
// Drop-in replacements for the hardcoded-color components scattered across
// ProfileSetupPage, Sidebar, DashboardLayout, etc.
//
// Every component reads from the CSS custom properties set by ThemeProvider,
// so they adapt automatically when the user's theme_color changes.
// ────────────────────────────────────────────────────────────────────────────

import type { ButtonHTMLAttributes, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// 1. ThemedButton — primary / outline / ghost
// ═══════════════════════════════════════════════════════════════════════════

type ButtonVariant = "primary" | "outline" | "ghost";

interface ThemedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-[8px] font-medium text-[14px] leading-[20px] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none";

export function ThemedButton({
  variant = "primary",
  loading = false,
  icon,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...rest
}: ThemedButtonProps) {
  const width = fullWidth ? "w-full" : "";

  const variantStyles: Record<ButtonVariant, string> = {
    primary: [
      "h-12 px-6",
      "text-[var(--theme-foreground)]",
      "drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]",
      // gradient bg via inline style below
    ].join(" "),
    outline: [
      "h-12 px-[25px]",
      "bg-white border border-[#e5e7eb]",
      "text-[#374151]",
      "hover:bg-gray-50",
    ].join(" "),
    ghost: [
      "px-3 py-2",
      "text-[var(--theme-primary)]",
      "hover:bg-[var(--theme-tint)]",
    ].join(" "),
  };

  // Primary uses an inline gradient so the CSS vars take effect
  const inlineStyle =
    variant === "primary"
      ? {
          background: `linear-gradient(to right, var(--theme-primary), var(--theme-gradient-end))`,
        }
      : undefined;

  return (
    <button
      className={`${btnBase} ${variantStyles[variant]} ${width} ${className}`}
      style={inlineStyle}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : icon ?? null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ThemedChip — toggle chip for visa types, languages, etc.
// ═══════════════════════════════════════════════════════════════════════════

interface ThemedChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function ThemedChip({ label, selected, onClick }: ThemedChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-[17px] py-[9px] rounded-full transition-colors duration-150 ${
        selected
          ? "bg-[var(--theme-light)] border-[var(--theme-border)]"
          : "border-[#e5e7eb] hover:border-[#d1d5db]"
      }`}
    >
      <span
        className={`font-medium text-[14px] leading-[20px] ${
          selected ? "text-[var(--theme-dark)]" : "text-[#4b5563]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ThemedRadioCard — primary visa selection, plan selection, etc.
// ═══════════════════════════════════════════════════════════════════════════

interface ThemedRadioCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
}

export function ThemedRadioCard({
  selected,
  onClick,
  title,
  subtitle,
}: ThemedRadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border flex isolate items-start p-[17px] rounded-[12px] text-left transition-colors duration-150 w-full ${
        selected
          ? "bg-[var(--theme-tint)] border-[var(--theme-primary)]"
          : "border-[#e5e7eb] hover:border-[#d1d5db]"
      }`}
    >
      {/* Radio dot */}
      <div className="h-5 w-7 shrink-0 z-[2] flex items-start">
        <div className="pt-1">
          {selected ? (
            <div className="border border-[var(--theme-primary)] flex flex-col items-center justify-center p-px rounded-full size-4">
              <div className="bg-[var(--theme-primary)] rounded-[4px] size-2" />
            </div>
          ) : (
            <div className="border border-[#d1d5db] rounded-full size-4" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 items-start relative z-[1]">
        <p className="font-medium text-[#111827] text-[14px] leading-[20px]">
          {title}
        </p>
        {subtitle && (
          <p className="font-normal text-[#6b7280] text-[12px] leading-[16px]">
            {subtitle}
          </p>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ThemedProgressBar — sidebar progress, onboarding stepper bar
// ═══════════════════════════════════════════════════════════════════════════

interface ThemedProgressBarProps {
  /** 0–100 */
  percent: number;
  height?: number;
}

export function ThemedProgressBar({
  percent,
  height = 8,
}: ThemedProgressBarProps) {
  return (
    <div
      className="bg-[#e5e7eb] rounded-full w-full overflow-hidden"
      style={{ height }}
    >
      <div
        className="bg-[var(--theme-primary)] h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ThemedStepIndicator — the 1/2/3 circles in the signup stepper
// ═══════════════════════════════════════════════════════════════════════════

type StepStatus = "completed" | "current" | "upcoming";

interface ThemedStepIndicatorProps {
  step: number;
  status: StepStatus;
  checkIcon?: ReactNode;
}

export function ThemedStepIndicator({
  step,
  status,
  checkIcon,
}: ThemedStepIndicatorProps) {
  if (status === "completed") {
    return (
      <div className="bg-[var(--theme-primary)] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center justify-center rounded-full size-8">
        {checkIcon ?? (
          <span className="text-[var(--theme-foreground)] font-semibold text-[14px]">
            ✓
          </span>
        )}
      </div>
    );
  }

  if (status === "current") {
    return (
      <div className="bg-[var(--theme-primary)] flex items-center justify-center relative rounded-full size-8">
        {/* Glow ring */}
        <div
          className="absolute -translate-x-1/2 left-1/2 rounded-full size-8 top-0 bg-transparent"
          style={{
            boxShadow: `0px 0px 0px 4px var(--theme-ring), 0px 4px 6px -1px rgba(0,0,0,0.1)`,
          }}
        />
        <span className="text-[var(--theme-foreground)] font-semibold text-[14px] leading-[20px] relative z-10">
          {step}
        </span>
      </div>
    );
  }

  // upcoming
  return (
    <div className="bg-[#f3f4f6] border-2 border-[#e5e7eb] flex items-center justify-center rounded-full size-8">
      <span className="font-semibold text-[#9ca3af] text-[14px] leading-[20px]">
        {step}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. ThemedBadge — small status badges / tags
// ═══════════════════════════════════════════════════════════════════════════

interface ThemedBadgeProps {
  children: ReactNode;
  variant?: "filled" | "soft" | "outline";
}

export function ThemedBadge({
  children,
  variant = "soft",
}: ThemedBadgeProps) {
  const styles: Record<string, string> = {
    filled:
      "bg-[var(--theme-primary)] text-[var(--theme-foreground)]",
    soft:
      "bg-[var(--theme-light)] text-[var(--theme-dark)]",
    outline:
      "bg-white border border-[var(--theme-border)] text-[var(--theme-dark)]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-[12px] leading-[18px] ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. ThemedLink — inline text links
// ═══════════════════════════════════════════════════════════════════════════

interface ThemedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ThemedLink({
  href,
  children,
  className = "",
}: ThemedLinkProps) {
  return (
    <a
      href={href}
      className={`text-[var(--theme-primary)] hover:text-[var(--theme-hover)] transition-colors font-medium ${className}`}
    >
      {children}
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. ThemedSidebarIcon — icon container with themed background
// ═══════════════════════════════════════════════════════════════════════════

interface ThemedSidebarIconProps {
  children: ReactNode;
  size?: number;
}

export function ThemedSidebarIcon({
  children,
  size = 40,
}: ThemedSidebarIconProps) {
  return (
    <div
      className="bg-[var(--theme-light)] flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. ThemedLogoBox — the gradient logo container in the header
// ═══════════════════════════════════════════════════════════════════════════

interface ThemedLogoBoxProps {
  children: ReactNode;
}

export function ThemedLogoBox({ children }: ThemedLogoBoxProps) {
  return (
    <div
      className="flex items-center justify-center rounded-[8px] size-8"
      style={{
        background: `linear-gradient(to right, var(--theme-primary), var(--theme-gradient-end))`,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. ThemedInput focus ring — utility class string
// ═══════════════════════════════════════════════════════════════════════════
//
// Tailwind can't use CSS vars inside ring-[...] reliably, so inputs
// keep the themed focus via an inline box-shadow. Use this as a helper:
//
//   <input
//     className={`${INPUT_BASE} ${themedFocusRing}`}
//     style={themedFocusStyle}
//   />
//
// Or simpler — just keep the existing focus:ring-2 + focus:ring-indigo-500
// and replace the color in tailwind.config.ts (see integration guide).

export const THEMED_FOCUS =
  "focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]";