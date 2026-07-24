// src/components/lawyer/NotificationBellDropdown.tsx
//
// Compact bell + unread-badge + click-to-expand popover.  Currently mounted
// only on the lawyer's Dashboard hero (per product decision), but built as
// a stand-alone component so we can drop it into other page headers later
// without any refactor.
//
// SOURCE OF TRUTH
//   Reads directly from `lawyerNotifications` (the same local store the
//   toaster + Notifications page use), so the count, the popover list,
//   and the toaster all stay in sync automatically via the
//   LAWYER_NOTIFICATIONS_EVENT broadcast.
//
// BEHAVIOUR
//   • Bell icon shows an unread pill (99+ cap) when unreadCount > 0.
//   • Click the bell → popover with the latest 5 UNREAD entries.
//   • Row click → mark read + navigate to the entry's link.
//   • "Mark all read" clears the store and closes the popover.
//   • "View all" jumps to /lawyer/notifications.
//   • Outside click / Escape → close the popover.
//
// A11Y
//   • Bell is a real <button> with aria-label + aria-expanded.
//   • Popover has role="menu" and rows are role="menuitem".

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  FileUp,
  RefreshCw,
  MailCheck,
  MessageSquare,
  Briefcase,
  BellRing,
  type LucideIcon,
} from 'lucide-react';
import {
  LAWYER_NOTIFICATIONS_EVENT,
  listLawyerNotifications,
  markLawyerNotificationRead,
  markAllLawyerNotificationsRead,
  unreadLawyerNotificationCount,
  type LawyerNotification,
  type LawyerNotificationType,
} from '../../utils/lawyerNotifications';

const VISIBLE_ROWS = 5;

/** Per-type visual metadata — mirrors the toaster's palette so the two
 *  surfaces look like siblings. */
const META: Record<LawyerNotificationType, { icon: LucideIcon; iconBg: string; iconFg: string }> = {
  doc_upload:            { icon: FileUp,        iconBg: 'bg-indigo-50',  iconFg: 'text-indigo-600'  },
  doc_reupload:          { icon: RefreshCw,     iconBg: 'bg-amber-50',   iconFg: 'text-amber-600'   },
  doc_requested_reply:   { icon: MailCheck,     iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600' },
  chat_message:          { icon: MessageSquare, iconBg: 'bg-blue-50',    iconFg: 'text-blue-600'    },
  new_case:              { icon: Briefcase,     iconBg: 'bg-violet-50',  iconFg: 'text-violet-600'  },
  deadline_approaching:  { icon: BellRing,      iconBg: 'bg-orange-50',  iconFg: 'text-orange-600'  },
  deadline_passed:       { icon: BellRing,      iconBg: 'bg-red-50',     iconFg: 'text-red-600'     },
  calendar_fire:         { icon: BellRing,      iconBg: 'bg-cyan-50',    iconFg: 'text-cyan-600'    },
};

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBellDropdown() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open,        setOpen]        = useState(false);
  const [unread,      setUnread]      = useState<number>(unreadLawyerNotificationCount);
  const [rows,        setRows]        = useState<LawyerNotification[]>([]);

  /** Recompute both the badge count and the popover slice from the store.
   *  Called on mount + on every LAWYER_NOTIFICATIONS_EVENT broadcast. */
  const refresh = useCallback(() => {
    setUnread(unreadLawyerNotificationCount());
    setRows(listLawyerNotifications().filter((n) => !n.read).slice(0, VISIBLE_ROWS));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(LAWYER_NOTIFICATIONS_EVENT, refresh);
    return () => window.removeEventListener(LAWYER_NOTIFICATIONS_EVENT, refresh);
  }, [refresh]);

  /** Close on outside click / Escape while open. */
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const badge = useMemo(() => (unread > 99 ? '99+' : String(unread)), [unread]);

  const handleRowClick = (n: LawyerNotification) => {
    markLawyerNotificationRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = () => {
    markAllLawyerNotificationsRead();
    setOpen(false);
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/lawyer/notifications');
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      {/* ── Bell button ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
            aria-hidden="true"
          >
            {badge}
          </span>
        )}
      </button>

      {/* ── Popover ────────────────────────────────────────────────── */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-100"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">
              Notifications
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {unread}
                </span>
              )}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Bell size={18} />
              </div>
              <p className="text-sm font-medium text-slate-700">You're all caught up</p>
              <p className="mt-0.5 text-xs text-slate-500">New updates will show up here.</p>
            </div>
          ) : (
            <ul className="max-h-[380px] overflow-y-auto py-1">
              {rows.map((n) => {
                const meta = META[n.type] || META.new_case;
                const Icon = meta.icon;
                return (
                  <li key={n.id} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleRowClick(n)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconBg} ${meta.iconFg}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{n.body}</p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.timestamp)}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-slate-100 px-4 py-2.5">
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
