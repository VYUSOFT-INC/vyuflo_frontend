// src/components/lawyer/NotificationToaster.tsx
//
// Top-right toast for freshly-arrived attorney notifications.
//
// LIFECYCLE
//   • Subscribes to the LAWYER_NOTIFICATIONS_EVENT custom event.
//   • On event, reads the newest UNREAD entry — up to VISIBLE at once —
//     and renders them stacked top-right.
//   • Each toast auto-dismisses after AUTO_DISMISS_MS.
//   • Click → mark as read + navigate to the toast's link.
//   • Toaster itself is portalled (fixed positioning) so the app's scroll
//     context doesn't clip it.
//
// This component mounts alongside useLawyerNotificationWatcher in the
// DashboardLayout for the attorney role.  It handles rendering only —
// all state lives in lawyerNotifications.ts.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileUp,
  RefreshCw,
  MailCheck,
  MessageSquare,
  Briefcase,
  BellRing,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  LAWYER_NOTIFICATIONS_EVENT,
  listLawyerNotifications,
  markLawyerNotificationRead,
  dismissLawyerNotification,
  type LawyerNotification,
  type LawyerNotificationType,
} from '../../utils/lawyerNotifications';

const AUTO_DISMISS_MS = 5_000;
const VISIBLE         = 3;

/** Per-type visual metadata — icon + accent colour. */
const META: Record<LawyerNotificationType, { icon: LucideIcon; accent: string; ring: string; iconBg: string; iconFg: string }> = {
  doc_upload:            { icon: FileUp,        accent: 'border-l-indigo-500',   ring: 'ring-indigo-100',   iconBg: 'bg-indigo-50',   iconFg: 'text-indigo-600' },
  doc_reupload:          { icon: RefreshCw,     accent: 'border-l-amber-500',    ring: 'ring-amber-100',    iconBg: 'bg-amber-50',    iconFg: 'text-amber-600'  },
  doc_requested_reply:   { icon: MailCheck,     accent: 'border-l-emerald-500',  ring: 'ring-emerald-100',  iconBg: 'bg-emerald-50',  iconFg: 'text-emerald-600'},
  chat_message:          { icon: MessageSquare, accent: 'border-l-blue-500',     ring: 'ring-blue-100',     iconBg: 'bg-blue-50',     iconFg: 'text-blue-600'   },
  new_case:              { icon: Briefcase,     accent: 'border-l-violet-500',   ring: 'ring-violet-100',   iconBg: 'bg-violet-50',   iconFg: 'text-violet-600' },
  deadline_approaching:  { icon: BellRing,      accent: 'border-l-orange-500',   ring: 'ring-orange-100',   iconBg: 'bg-orange-50',   iconFg: 'text-orange-600' },
  deadline_passed:       { icon: BellRing,      accent: 'border-l-red-500',      ring: 'ring-red-100',      iconBg: 'bg-red-50',      iconFg: 'text-red-600'    },
  calendar_fire:         { icon: BellRing,      accent: 'border-l-cyan-500',     ring: 'ring-cyan-100',     iconBg: 'bg-cyan-50',     iconFg: 'text-cyan-600'   },
};

export default function NotificationToaster() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<LawyerNotification[]>([]);

  /** Recompute the visible slice from storage.  We compare against the
   *  current toasts by id and only APPEND new ones so a re-render doesn't
   *  reset the dismiss timers on existing toasts. */
  const refresh = useCallback(() => {
    const unread = listLawyerNotifications().filter((n) => !n.read).slice(0, VISIBLE);
    setToasts((prev) => {
      const prevIds = new Set(prev.map((t) => t.id));
      const additions = unread.filter((n) => !prevIds.has(n.id));
      if (additions.length === 0) return prev;
      return [...additions.reverse(), ...prev].slice(0, VISIBLE);
    });
  }, []);

  // Initial pull + subscribe to store changes.
  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(LAWYER_NOTIFICATIONS_EVENT, onChange);
    return () => window.removeEventListener(LAWYER_NOTIFICATIONS_EVENT, onChange);
  }, [refresh]);

  // Auto-dismiss timers — one per visible toast.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, AUTO_DISMISS_MS),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts]);

  const handleClick = (t: LawyerNotification) => {
    markLawyerNotificationRead(t.id);
    setToasts((prev) => prev.filter((x) => x.id !== t.id));
    if (t.link) navigate(t.link);
  };

  const handleDismiss = (e: React.MouseEvent, t: LawyerNotification) => {
    e.stopPropagation();
    dismissLawyerNotification(t.id);
    setToasts((prev) => prev.filter((x) => x.id !== t.id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-end gap-2 px-4 sm:top-6 sm:pr-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const meta = META[t.type] || META.new_case;
        const Icon = meta.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handleClick(t)}
            className={`pointer-events-auto w-full max-w-sm text-left rounded-xl border border-slate-200 border-l-4 ${meta.accent} bg-white shadow-lg ring-1 ${meta.ring} px-4 py-3 pr-10 relative hover:shadow-xl transition`}
          >
            <div className="flex items-start gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconBg} ${meta.iconFg}`}>
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                {t.body && (
                  <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{t.body}</p>
                )}
              </div>
            </div>
            <span
              role="button"
              tabIndex={0}
              aria-label="Dismiss notification"
              onClick={(e) => handleDismiss(e, t)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDismiss(e as unknown as React.MouseEvent, t); }}
              className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
