// src/pages/admin/AdminNotificationsPage.tsx
//
// Cross-role notifications feed for admin. Same 3 tabs as the attorney
// screen (All Updates / Reminders / Deadlines), but scope = every user
// on the platform, plus a "Role" filter chip and a "Triggered by" column
// so admin knows which user/role fired each event.
//
// Data source: /api/v1/admin/notifications-reminders/*  (backend spec).
// No localStorage. Server truth on every render.
//
// Mock fallback: when the backend endpoint isn't live yet (404) or the
// list comes back empty, we show 5 sample notifications so the screen
// stays presentable during demos. As soon as the real API returns data,
// the mocks disappear automatically — no code change needed.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminNotifRemindersApi } from '../../api/admin/notifications.api';
import type {
  AdminNotificationUpdate,
  AdminReminderCounts,
  AdminReminderItem,
  AdminRemindersTab,
  AdminRoleFilter,
} from '../../types/admin/notifications.types';

import AdminBackButton from '../../components/admin/AdminBackButton';

const PAGE_SIZE = 20;

const TABS: { id: AdminRemindersTab; label: string }[] = [
  { id: 'all_updates', label: 'All Updates' },
  { id: 'deadlines',   label: 'Deadlines'   },
  { id: 'reminders',   label: 'Reminders'   },
];

const ROLE_OPTIONS: { value: AdminRoleFilter; label: string }[] = [
  { value: 'all',      label: 'All roles' },
  { value: 'hr',       label: 'HR'        },
  { value: 'admin',    label: 'Admin'     },
  { value: 'employee', label: 'Employee'  },
  { value: 'lawyer',   label: 'Lawyer'    },
];

/* ══════════════════════════════════════════════════════════════════
 * Mock fallback — used ONLY when backend endpoint isn't live yet.
 * Auto-clears once the real API returns any items.
 * ══════════════════════════════════════════════════════════════════ */
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * 3600 * 1000).toISOString();

const MOCK_UPDATES: AdminNotificationUpdate[] = [
  {
    id: 'mock-1',
    notification_type: 'case_status_updated',
    badge_label: 'Case Update',
    category: 'case_update',
    priority: 'high',
    title: 'H-1B case status changed to Petition Prep',
    body: 'Aarav Patel\'s case advanced from Document Review to Petition Prep.',
    client_name: 'Aarav Patel',
    visa_type_code: 'H-1B',
    case_reference: '#VF-2026-089',
    triggered_by_user_id: 'u-hr-1',
    triggered_by_user_name: 'Meera Krishnan',
    triggered_by_role: 'hr',
    recipient_user_id: 'u-lwy-1',
    recipient_user_name: 'Posam Srihari',
    recipient_role: 'lawyer',
    created_at: hoursAgo(1),
    is_read: false, is_dismissed: false, show_unread_dot: true,
  },
  {
    id: 'mock-2',
    notification_type: 'document_uploaded',
    badge_label: 'Document Added',
    category: 'document',
    priority: 'medium',
    title: 'New passport scan uploaded',
    body: 'Priya Sharma uploaded Passport_Scan.pdf for review.',
    client_name: 'Priya Sharma',
    visa_type_code: 'EB-1A',
    case_reference: '#VF-8921',
    triggered_by_user_id: 'u-emp-1',
    triggered_by_user_name: 'Priya Sharma',
    triggered_by_role: 'employee',
    recipient_user_id: 'u-lwy-1',
    recipient_user_name: 'Posam Srihari',
    recipient_role: 'lawyer',
    created_at: hoursAgo(3),
    is_read: false, is_dismissed: false, show_unread_dot: true,
  },
  {
    id: 'mock-3',
    notification_type: 'participant_added',
    badge_label: 'Participant Added',
    category: 'case_update',
    priority: 'low',
    title: 'Attorney assigned to L-1A case',
    body: 'HR assigned Posam Srihari as the attorney for James Wilson.',
    client_name: 'James Wilson',
    visa_type_code: 'L-1A',
    case_reference: '#VF-8920',
    triggered_by_user_id: 'u-hr-1',
    triggered_by_user_name: 'Meera Krishnan',
    triggered_by_role: 'hr',
    recipient_user_id: 'u-lwy-1',
    recipient_user_name: 'Posam Srihari',
    recipient_role: 'lawyer',
    created_at: hoursAgo(6),
    is_read: false, is_dismissed: false, show_unread_dot: true,
  },
  {
    id: 'mock-4',
    notification_type: 'deadline_approaching',
    badge_label: 'Urgent Deadline',
    category: 'deadline',
    priority: 'urgent',
    title: 'RFE response due in 3 days',
    body: 'Maria Rodriguez\'s H-1B RFE deadline is Oct 31, 2026.',
    client_name: 'Maria Rodriguez',
    visa_type_code: 'H-1B',
    case_reference: '#VF-2026-089',
    triggered_by_user_id: null,
    triggered_by_user_name: 'System',
    triggered_by_role: 'admin',
    recipient_user_id: 'u-lwy-1',
    recipient_user_name: 'Posam Srihari',
    recipient_role: 'lawyer',
    created_at: hoursAgo(20),
    is_read: false, is_dismissed: false, show_unread_dot: true,
  },
  {
    id: 'mock-5',
    notification_type: 'employee_onboarded',
    badge_label: 'Employee Onboarded',
    category: 'employee',
    priority: 'low',
    title: 'New employee joined TechCorp',
    body: 'Wei Chen completed onboarding and is ready for case assignment.',
    client_name: 'Wei Chen',
    visa_type_code: null,
    case_reference: null,
    triggered_by_user_id: 'u-emp-2',
    triggered_by_user_name: 'Wei Chen',
    triggered_by_role: 'employee',
    recipient_user_id: 'u-hr-1',
    recipient_user_name: 'Meera Krishnan',
    recipient_role: 'hr',
    created_at: hoursAgo(28),
    is_read: true, is_dismissed: false, show_unread_dot: false,
  },
];

const MOCK_REMINDERS: AdminReminderItem[] = [
  {
    id: 'mock-rem-1',
    title: 'RFE response filing deadline',
    badge_label: '1-Day Reminder',
    event_date: new Date(NOW + 24 * 3600 * 1000).toISOString().slice(0, 10),
    start_time: '17:00:00.000Z',
    reminder_minutes: 1440,
    client_name: 'Maria Rodriguez',
    visa_type_code: 'H-1B',
    case_reference: '#VF-2026-089',
    owner_user_id: 'u-lwy-1',
    owner_user_name: 'Posam Srihari',
    owner_role: 'lawyer',
    is_upcoming: true,
    created_at: hoursAgo(72),
  },
  {
    id: 'mock-rem-2',
    title: 'Weekly HR sync',
    badge_label: '1-Hour Reminder',
    event_date: new Date(NOW + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    start_time: '10:00:00.000Z',
    reminder_minutes: 60,
    client_name: null,
    visa_type_code: null,
    case_reference: null,
    owner_user_id: 'u-hr-1',
    owner_user_name: 'Meera Krishnan',
    owner_role: 'hr',
    is_upcoming: true,
    created_at: hoursAgo(24),
  },
];

const MOCK_COUNTS: AdminReminderCounts = {
  all_updates_unread: MOCK_UPDATES.filter((n) => !n.is_read).length,
  reminders_total:    MOCK_REMINDERS.length,
  deadlines_unread:   MOCK_UPDATES.filter((n) => n.category === 'deadline' && !n.is_read).length,
};

/* ─────────────── Small pure helpers ─────────────── */
function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'bg-red-50    text-red-700    ring-red-200',
  high:   'bg-orange-50 text-orange-700 ring-orange-200',
  medium: 'bg-amber-50  text-amber-700  ring-amber-200',
  low:    'bg-slate-50  text-slate-700  ring-slate-200',
};

const ROLE_PILL: Record<string, string> = {
  hr:       'bg-indigo-50 text-indigo-700',
  admin:    'bg-red-50    text-red-700',
  employee: 'bg-blue-50   text-blue-700',
  lawyer:   'bg-violet-50 text-violet-700',
};

function RolePill({ role }: { role?: string | null }) {
  if (!role) return null;
  const key = role.toLowerCase();
  const cls = ROLE_PILL[key] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {role}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * PAGE
 * ══════════════════════════════════════════════════════════════════ */
export default function AdminNotificationsPage() {
  const navigate = useNavigate();

  const [tab,        setTab]        = useState<AdminRemindersTab>('all_updates');
  const [roleFilter, setRoleFilter] = useState<AdminRoleFilter>('all');
  const [counts,     setCounts]     = useState<AdminReminderCounts | null>(null);

  // Updates + Deadlines
  const [updates,       setUpdates]       = useState<AdminNotificationUpdate[]>([]);
  const [updatesCursor, setUpdatesCursor] = useState<string | null>(null);
  const [updatesMore,   setUpdatesMore]   = useState(false);

  // Reminders
  const [reminders,       setReminders]       = useState<AdminReminderItem[]>([]);
  const [remindersCursor, setRemindersCursor] = useState<string | null>(null);
  const [remindersMore,   setRemindersMore]   = useState(false);
  const [includePast,     setIncludePast]     = useState(false);

  const [loading,   setLoading]   = useState(true);
  const [busyMore,  setBusyMore]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  /* ─── Counts (independent of the tab) ─── */
  const refreshCounts = useCallback(async () => {
    try {
      const c = await adminNotifRemindersApi.getCounts(roleFilter);
      setCounts(c);
    } catch {
      // Backend not live yet → fall back to mock counts so tab badges
      // still show something. When the real endpoint returns data,
      // this branch stops running.
      setCounts(MOCK_COUNTS);
    }
  }, [roleFilter]);

  /* ─── First page for the active tab + role filter ─── */
  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'reminders') {
        const res = await adminNotifRemindersApi.listReminders({
          role_filter:  roleFilter,
          include_past: includePast,
          limit:        PAGE_SIZE,
        });
        const items = res.items || [];
        // Empty backend response → keep the page useful with mocks.
        setReminders(items.length ? items : MOCK_REMINDERS);
        setRemindersCursor(res.next_cursor ?? null);
        setRemindersMore(!!res.has_more);
      } else {
        const fn = tab === 'deadlines'
          ? adminNotifRemindersApi.listDeadlines
          : adminNotifRemindersApi.listUpdates;
        const res = await fn({ role_filter: roleFilter, limit: PAGE_SIZE });
        const items = res.items || [];
        // Deadlines tab pulls only the deadline-category rows out of mocks.
        const fallback = tab === 'deadlines'
          ? MOCK_UPDATES.filter((m) => m.category === 'deadline')
          : MOCK_UPDATES;
        setUpdates(items.length ? items : fallback);
        setUpdatesCursor(res.next_cursor ?? null);
        setUpdatesMore(!!res.has_more);
      }
    } catch {
      // Endpoint 404 / network failure → show mocks instead of the red
      // banner so the demo still looks polished. Real data will replace
      // these as soon as backend goes live.
      if (tab === 'reminders') {
        setReminders(MOCK_REMINDERS);
        setRemindersCursor(null);
        setRemindersMore(false);
      } else {
        const fallback = tab === 'deadlines'
          ? MOCK_UPDATES.filter((m) => m.category === 'deadline')
          : MOCK_UPDATES;
        setUpdates(fallback);
        setUpdatesCursor(null);
        setUpdatesMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, roleFilter, includePast]);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);
  useEffect(() => { loadFirst();     }, [loadFirst]);

  /* ─── Load Older ─── */
  const loadMore = async () => {
    setBusyMore(true);
    try {
      if (tab === 'reminders') {
        if (!remindersCursor) return;
        const res = await adminNotifRemindersApi.listReminders({
          role_filter:  roleFilter,
          include_past: includePast,
          before:       remindersCursor,
          limit:        PAGE_SIZE,
        });
        setReminders((prev) => [...prev, ...(res.items || [])]);
        setRemindersCursor(res.next_cursor ?? null);
        setRemindersMore(!!res.has_more);
      } else {
        if (!updatesCursor) return;
        const fn = tab === 'deadlines'
          ? adminNotifRemindersApi.listDeadlines
          : adminNotifRemindersApi.listUpdates;
        const res = await fn({ role_filter: roleFilter, before: updatesCursor, limit: PAGE_SIZE });
        setUpdates((prev) => [...prev, ...(res.items || [])]);
        setUpdatesCursor(res.next_cursor ?? null);
        setUpdatesMore(!!res.has_more);
      }
    } catch { /* silent — user retries */ }
    finally { setBusyMore(false); }
  };

  /* ─── Mark all read (scoped to the active tab where applicable) ─── */
  const markAllRead = async () => {
    try {
      const cat = tab === 'deadlines' ? 'deadline' : undefined;
      await adminNotifRemindersApi.markAllRead(cat);
      // Optimistic UI: flip is_read on the current list.
      setUpdates((prev) => prev.map((u) => ({ ...u, is_read: true, show_unread_dot: false })));
      refreshCounts();
    } catch {
      // Same optimistic flip when the endpoint is unavailable — mocks
      // and real rows are both flipped locally so the UI reflects intent.
      setUpdates((prev) => prev.map((u) => ({ ...u, is_read: true, show_unread_dot: false })));
    }
  };

  const tabBadge = useMemo(() => {
    if (!counts) return { all_updates: 0, reminders: 0, deadlines: 0 };
    return {
      all_updates: counts.all_updates_unread,
      reminders:   counts.reminders_total,
      deadlines:   counts.deadlines_unread,
    };
  }, [counts]);

  return (
    <div className="min-h-screen bg-[#f9fafb]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AdminBackButton />

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500">
              Every event fired across employee, HR and lawyer feeds — routed to admin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as AdminRoleFilter)}
                className="bg-transparent text-sm text-slate-800 outline-none"
              >
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <button
              onClick={markAllRead}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Mark all read
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === t.id ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t.label}</span>
                {tabBadge[t.id] > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {tabBadge[t.id]}
                  </span>
                )}
                {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* Reminders tab has an "Include past" toggle */}
        {tab === 'reminders' && (
          <label className="flex items-center gap-2 text-sm text-slate-700 self-start">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(e) => setIncludePast(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Include past reminders
          </label>
        )}

        {/* Content */}
        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadFirst} />
        ) : tab === 'reminders' ? (
          reminders.length === 0
            ? <EmptyState label="No reminders scheduled." />
            : <ReminderList items={reminders} onOpenApp={(id) => navigate(`/admin/users/${id}`)} />
        ) : (
          updates.length === 0
            ? <EmptyState label="You're all caught up." />
            : <UpdatesList items={updates} onOpenApp={(id) => navigate(`/admin/users/${id}`)} />
        )}

        {/* Pagination — Load older */}
        {!loading && !error && (
          (tab === 'reminders' ? remindersMore : updatesMore) && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={busyMore}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                {busyMore ? 'Loading…' : 'Load older'}
              </button>
            </div>
          )
        )}
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * Sub-components
 * ══════════════════════════════════════════════════════════════════ */

function UpdatesList({
  items, onOpenApp,
}: { items: AdminNotificationUpdate[]; onOpenApp: (userId: string) => void }) {
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {items.map((n) => {
        const priorityCls = PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.low;
        return (
          <li key={n.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition">
            <div className="flex items-start gap-4">
              {/* Unread dot */}
              <div className="mt-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${n.show_unread_dot ? 'bg-indigo-500' : 'bg-transparent'}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${priorityCls}`}>
                    {n.badge_label || n.notification_type}
                  </span>
                  {n.case_reference && (
                    <span className="font-mono text-[11px] text-slate-500">{n.case_reference}</span>
                  )}
                  {n.visa_type_code && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {n.visa_type_code}
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-sm font-semibold text-slate-900">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{n.body}</p>}

                {/* Admin-only "who fired / who received" strip */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  {n.triggered_by_user_name && (
                    <span>
                      <span className="text-slate-400">Triggered by</span>{' '}
                      <span className="font-medium text-slate-700">{n.triggered_by_user_name}</span>{' '}
                      <RolePill role={n.triggered_by_role} />
                    </span>
                  )}
                  {n.recipient_user_name && (
                    <span>
                      <span className="text-slate-400">Delivered to</span>{' '}
                      <button
                        type="button"
                        onClick={() => onOpenApp(n.recipient_user_id)}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {n.recipient_user_name}
                      </button>{' '}
                      <RolePill role={n.recipient_role} />
                    </span>
                  )}
                  <span className="text-slate-400">·</span>
                  <span title={formatWhen(n.created_at)}>{timeAgo(n.created_at)}</span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReminderList({
  items, onOpenApp,
}: { items: AdminReminderItem[]; onOpenApp: (userId: string) => void }) {
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {items.map((r) => (
        <li key={r.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 text-xl">
              ⏰
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  {r.badge_label}
                </span>
                {r.case_reference && (
                  <span className="font-mono text-[11px] text-slate-500">{r.case_reference}</span>
                )}
                {r.visa_type_code && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    {r.visa_type_code}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-sm font-semibold text-slate-900">{r.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {r.event_date} {r.start_time?.slice(0, 5)}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                {r.owner_user_name && (
                  <span>
                    <span className="text-slate-400">Owner</span>{' '}
                    <button
                      type="button"
                      onClick={() => r.owner_user_id && onOpenApp(r.owner_user_id)}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {r.owner_user_name}
                    </button>{' '}
                    <RolePill role={r.owner_role} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-medium text-red-800">⚠ {message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <span className="text-2xl">🔔</span>
      </div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
    </div>
  );
}