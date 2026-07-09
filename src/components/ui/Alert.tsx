// src/components/ui/Alert.tsx
// Reusable alert component — matches Vyuflo design system
// Usage:
//   <Alert type="error"   message="Invalid email or password." />
//   <Alert type="success" message="Profile saved successfully." />
//   <Alert type="warning" message="Your session is about to expire." />
//   <Alert type="info"    message="Check your email for a verification code." />
//   <Alert type="error"   message={apiError} onClose={() => setApiError(null)} />

import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  type:       AlertType;
  message:    string | null;
  title?:     string;                // optional bold heading
  onClose?:   () => void;            // if provided, shows X button
  autoClose?: number;                // ms — auto-dismiss after this duration
  className?: string;                // extra tailwind classes
}

// ── Config per type ───────────────────────────────────────────────────────────
const CONFIG: Record<AlertType, {
  bg:     string;
  border: string;
  text:   string;
  icon:   React.ReactNode;
  defaultTitle: string;
}> = {
  error: {
    bg:           'bg-[#fef2f2]',
    border:       'border-[#fca5a5]',
    text:         'text-[#dc2626]',
    defaultTitle: 'Error',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  },
  success: {
    bg:           'bg-[#f0fdf4]',
    border:       'border-[#86efac]',
    text:         'text-[#16a34a]',
    defaultTitle: 'Success',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    bg:           'bg-[#fffbeb]',
    border:       'border-[#fcd34d]',
    text:         'text-[#d97706]',
    defaultTitle: 'Warning',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    bg:           'bg-[#eff6ff]',
    border:       'border-[#93c5fd]',
    text:         'text-[#2563eb]',
    defaultTitle: 'Info',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Alert({
  type,
  message,
  title,
  onClose,
  autoClose,
  className = '',
}: AlertProps) {
  const [visible, setVisible] = useState(true);

  // Reset visibility when message changes
  useEffect(() => {
    if (message) setVisible(true);
  }, [message]);

  // Auto-dismiss
  useEffect(() => {
    if (!autoClose || !message) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, autoClose);
    return () => clearTimeout(timer);
  }, [autoClose, message, onClose]);

  // Don't render if no message or dismissed
  if (!message || !visible) return null;

  const cfg = CONFIG[type];

  function handleClose() {
    setVisible(false);
    onClose?.();
  }

  return (
    <div
      role="alert"
      className={`
        w-full ${cfg.bg} border ${cfg.border} ${cfg.text}
        rounded-[12px] px-4 py-3 flex items-start gap-3
        animate-in fade-in duration-200
        ${className}
      `}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Icon */}
      <span className="mt-0.5">{cfg.icon}</span>

      {/* Content */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        {title && (
          <p className="font-semibold text-[14px] tracking-[-0.5px] leading-[20px]">
            {title}
          </p>
        )}
        <p className={`text-[13px] tracking-[-0.5px] leading-[20px] ${title ? 'opacity-90' : 'font-medium text-[14px]'}`}>
          {message}
        </p>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className={`shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5`}
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Convenience named exports ─────────────────────────────────────────────────
export const ErrorAlert   = (props: Omit<AlertProps, 'type'>) => <Alert type="error"   {...props} />;
export const SuccessAlert = (props: Omit<AlertProps, 'type'>) => <Alert type="success" {...props} />;
export const WarningAlert = (props: Omit<AlertProps, 'type'>) => <Alert type="warning" {...props} />;
export const InfoAlert    = (props: Omit<AlertProps, 'type'>) => <Alert type="info"    {...props} />;