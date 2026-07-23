// src/pages/lawyer/notifications/NotificationsRemindersPage.tsx
//
// Figma node 35:2385 — Notifications & Reminders (Screen 24).
//
// LAWYER USE CASE (why this exists):
//   Attorneys juggle 20-50 cases. Each has USCIS deadlines, document events,
//   status changes, task assignments. Missing ANY one = malpractice risk.
//   This screen is the lawyer's central inbox for case-related events.
//
// ── CAUTIONS ─────────────────────────────────────────────────────────
//   1. URL-driven tab state (?tab=all_updates|reminders|deadlines).
//   2. Cursor pagination — pass last item's created_at as `before` for Load Older.
//   3. Reminders tab can toggle past/upcoming via include_past param.
//   4. "Mark All as Read" optimistically clears badges; refetch counts on success.
//   5. Mock fallback when backend empty (realistic immigration scenarios).
//   6. Defensive badge/priority — handle null/undefined.
//   7. "+ New Reminder" uses POST /calendar/events (existing endpoint).
//   8. Click item → navigates to relevant case / document / task.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notifRemindersApi } from '../../../api/lawyer/notifReminders.api';
import { listLocalReminders } from '../../../utils/localReminders';
import {
  listLawyerNotifications,
  markLawyerNotificationRead,
  markAllLawyerNotificationsRead,
  unreadLawyerNotificationCount,
  LAWYER_NOTIFICATIONS_EVENT,
  type LawyerNotification,
  type LawyerNotificationType,
} from '../../../utils/lawyerNotifications';
import type {
  NotificationUpdate,
  NotificationCategory,
  NotificationPriority,
  ReminderCounts,
  ReminderItem,
  RemindersTab,
} from '../../../types/lawyer/notifReminders.types';

/* ════════════════════════════════════════════════════════════════════
   LOCAL-NOTIFICATION ADAPTER
   ─────────────────────────────────────────────────────────────────────
   The Notifications & Reminders page speaks `NotificationUpdate` (the
   shape /notifications-reminders returns).  Local synthesized events
   speak `LawyerNotification` (from lawyerNotifications.ts).  We adapt
   between the two so both sources can flow into the same "All Updates"
   list, and we keep a per-render map of local ids → link so clicking
   a local row still routes to the right screen.
   ════════════════════════════════════════════════════════════════════ */
const LOCAL_ID_PREFIX = 'local:';

const LOCAL_TYPE_TO_CATEGORY: Record<LawyerNotificationType, NotificationCategory> = {
  doc_upload:            'document',
  doc_reupload:          'document',
  doc_requested_reply:   'document',
  chat_message:          'case_update',
  new_case:              'case_update',
  deadline_approaching:  'deadline',
  deadline_passed:       'deadline',
  calendar_fire:         'deadline',
};

const LOCAL_TYPE_TO_BADGE: Record<LawyerNotificationType, string> = {
  doc_upload:            'Document Added',
  doc_reupload:          'Document Re-uploaded',
  doc_requested_reply:   'Requested Doc Received',
  chat_message:          'New Message',
  new_case:              'New Case Assigned',
  deadline_approaching:  'Deadline',
  deadline_passed:       'Urgent Deadline',
  calendar_fire:         'Reminder',
};

const LOCAL_TYPE_TO_PRIORITY: Record<LawyerNotificationType, NotificationPriority> = {
  doc_upload:            'normal',
  doc_reupload:          'normal',
  doc_requested_reply:   'normal',
  chat_message:          'normal',
  new_case:              'high',
  deadline_approaching:  'high',
  deadline_passed:       'urgent',
  calendar_fire:         'normal',
};

function localToUpdate(n: LawyerNotification): NotificationUpdate {
  return {
    id:               `${LOCAL_ID_PREFIX}${n.id}`,
    notification_type: n.type,
    badge_label:      LOCAL_TYPE_TO_BADGE[n.type] || 'Update',
    category:         LOCAL_TYPE_TO_CATEGORY[n.type] || 'case_update',
    priority:         LOCAL_TYPE_TO_PRIORITY[n.type] || 'normal',
    title:            n.title,
    body:             n.body,
    client_name:      null,
    visa_type_code:   null,
    case_reference:   null,
    created_at:       n.timestamp,
    is_read:          n.read,
    is_dismissed:     false,
    show_unread_dot:  !n.read,
  };
}

/* ════════════════════════════════════════════════════════════════════
   MOCK FALLBACK (same shape as backend) — kept inline like other modules.
   Used only when backend is empty or unreachable so the demo doesn't break.
   ════════════════════════════════════════════════════════════════════ */
const NOW = Date.now();
const MIN = 1000 * 60;
const HR  = MIN * 60;
const DAY = HR * 24;

const MOCK_UPDATES: NotificationUpdate[] = [
  {
    id: 'nu-1',
    notification_type: 'deadline_approaching',
    badge_label: 'Urgent Deadline',
    category: 'deadline',
    priority: 'urgent',
    title: 'H-1B RFE response due in 7 days',
    body: 'Maria Rodriguez\'s RFE response is due Oct 31. Draft has not been started yet.',
    client_name: 'Maria Rodriguez',
    visa_type_code: 'H-1B',
    case_reference: '#VF-2026-089',
    created_at: new Date(NOW - 30 * MIN).toISOString(),
    is_read: false,
    is_dismissed: false,
    show_unread_dot: true,
  },
  {
    id: 'nu-2',
    notification_type: 'document_approved',
    badge_label: 'Document Added',
    category: 'document',
    priority: 'normal',
    title: 'Aarav Patel uploaded Organizational_Chart_v2.pdf',
    body: 'New version of the org chart with executive titles added.',
    client_name: 'Aarav Patel',
    visa_type_code: 'H-1B',
    case_reference: '#VF-8915',
    created_at: new Date(NOW - 2 * HR).toISOString(),
    is_read: false,
    is_dismissed: false,
    show_unread_dot: true,
  },
  {
    id: 'nu-3',
    notification_type: 'case_status_updated',
    badge_label: 'Case Update',
    category: 'case_update',
    priority: 'normal',
    title: 'Elena Rodriguez — O-1A case moved to "Petition Prep"',
    body: 'Status changed from "Document Review" → "Petition Prep" by HR.',
    client_name: 'Elena Rodriguez',
    visa_type_code: 'O-1A',
    case_reference: '#VF-8916',
    created_at: new Date(NOW - DAY).toISOString(),
    is_read: true,
    is_dismissed: false,
    show_unread_dot: false,
  },
  {
    id: 'nu-4',
    notification_type: 'task_assigned',
    badge_label: 'Task Assigned',
    category: 'task',
    priority: 'high',
    title: 'Review TechCorp support letter draft',
    body: 'HR has assigned you a new task. Due: Tomorrow.',
    client_name: 'Wei Chen',
    visa_type_code: 'EB-2',
    case_reference: '#VF-8917',
    created_at: new Date(NOW - DAY - 2 * HR).toISOString(),
    is_read: false,
    is_dismissed: false,
    show_unread_dot: true,
  },
  {
    id: 'nu-5',
    notification_type: 'deadline_approaching',
    badge_label: 'Deadline',
    category: 'deadline',
    priority: 'high',
    title: 'L-1A filing window opens in 14 days',
    body: 'James Wilson\'s L-1A initial petition window opens Nov 10.',
    client_name: 'James Wilson',
    visa_type_code: 'L-1A',
    case_reference: '#VF-8920',
    created_at: new Date(NOW - 2 * DAY).toISOString(),
    is_read: true,
    is_dismissed: false,
    show_unread_dot: false,
  },
];

const MOCK_REMINDERS: ReminderItem[] = [
  {
    id: 'rm-1',
    title: 'Consultation with Aarav Patel',
    badge_label: '1-Hour Reminder',
    event_date: new Date(NOW + 6 * HR).toISOString().slice(0, 10),
    start_time: '14:00:00.000Z',
    reminder_minutes: 60,
    client_name: 'Aarav Patel',
    visa_type_code: 'H-1B',
    case_reference: '#VF-8915',
    is_upcoming: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rm-2',
    title: 'USCIS premium processing deadline — TechCorp',
    badge_label: '1-Day Reminder',
    event_date: new Date(NOW + 2 * DAY).toISOString().slice(0, 10),
    start_time: '17:00:00.000Z',
    reminder_minutes: 1440,
    client_name: 'Aarav Patel',
    visa_type_code: 'H-1B',
    case_reference: '#VF-8915',
    is_upcoming: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rm-3',
    title: 'Court date — Elena Rodriguez',
    badge_label: '2-Day Reminder',
    event_date: new Date(NOW + 5 * DAY).toISOString().slice(0, 10),
    start_time: '10:00:00.000Z',
    reminder_minutes: 2880,
    client_name: 'Elena Rodriguez',
    visa_type_code: 'O-1A',
    case_reference: '#VF-8916',
    is_upcoming: true,
    created_at: new Date().toISOString(),
  },
];

/* Derived from MOCK_UPDATES — keeps badges in sync with the items above. */
const MOCK_COUNTS: ReminderCounts = {
  all_updates_unread: MOCK_UPDATES.filter((u) => !u.is_read).length,
  reminders_total:    MOCK_REMINDERS.length,
  deadlines_unread:   MOCK_UPDATES.filter((u) => !u.is_read && u.category === 'deadline').length,
};

const MOCK_DEADLINES = MOCK_UPDATES.filter((u) => u.category === 'deadline');

/**
 * Merge two reminder lists, keeping uniqueness on id.
 * `secondary` wins on collision (used for the local-store overlay so the
 * user's freshly-created calendar reminders surface immediately, but get
 * replaced by the backend row once backend wires reminders to calendar_events).
 * Sort: upcoming first, soonest event_date wins.
 */
function mergeReminders(primary: ReminderItem[], secondary: ReminderItem[]): ReminderItem[] {
  const map = new Map<string, ReminderItem>();
  for (const r of primary)   if (r && r.id) map.set(r.id, r);
  for (const r of secondary) if (r && r.id) map.set(r.id, r);
  return Array.from(map.values()).sort((a, b) => {
    const ta = Date.parse(a.event_date || a.created_at || '');
    const tb = Date.parse(b.event_date || b.created_at || '');
    return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
  });
}

/**
 * Merge backend + local synthesized updates into a single feed.
 * De-duped by id (local ids are already namespaced with LOCAL_ID_PREFIX)
 * and sorted newest-first so client actions surface immediately.
 */
function mergeUpdates(backend: NotificationUpdate[], local: NotificationUpdate[]): NotificationUpdate[] {
  const map = new Map<string, NotificationUpdate>();
  for (const u of backend) if (u && u.id) map.set(u.id, u);
  for (const u of local)   if (u && u.id) map.set(u.id, u);
  return Array.from(map.values()).sort((a, b) => {
    const ta = Date.parse(a.created_at || '');
    const tb = Date.parse(b.created_at || '');
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
}

const TABS: { id: RemindersTab; label: string }[] = [
  { id: 'all_updates', label: 'All Updates' },
  { id: 'reminders',   label: 'Reminders' },
  { id: 'deadlines',   label: 'Deadlines' },
];

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function NotificationsRemindersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'all_updates') as RemindersTab;
  /* Upcoming/Past toggle was removed — Reminders tab is always "upcoming only".
     If we need a "Past" view later, re-introduce a tab or filter. */
  const includePast = false;

  const [counts, setCounts]         = useState<ReminderCounts>({ all_updates_unread: 0, reminders_total: 0, deadlines_unread: 0 });
  const [updates, setUpdates]       = useState<NotificationUpdate[]>([]);
  const [deadlines, setDeadlines]   = useState<NotificationUpdate[]>([]);
  const [reminders, setReminders]   = useState<ReminderItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [banner, setBanner]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(t);
  }, [banner]);

  /* Counts — fetch on mount + after any read action. Falls back to MOCK_COUNTS
     (imported from the *.mocks file) so the badges still demo when backend
     is empty or unreachable. The Reminders pill always reflects the actual
     MERGED-AND-DEDUPED list length (backend + local calendar bridge) so a
     freshly-created reminder bumps the badge instantly without double-
     counting once the backend wires reminders to calendar_events. */
  const refetchCounts = () => {
    const local = listLocalReminders();
    Promise.all([
      notifRemindersApi.getCounts().catch(() => null),
      notifRemindersApi.listReminders({ limit: 30 }).catch(() => null),
    ]).then(([c, r]) => {
      const base = c || MOCK_COUNTS;
      const backend = r?.items?.length ? r.items : MOCK_REMINDERS;
      const merged = mergeReminders(backend, local);
      /* Include the local synthesized notifications' unread count in the
         All Updates pill so the sidebar bell and this tab match. */
      const localUnread = unreadLawyerNotificationCount();
      setCounts({
        ...base,
        all_updates_unread: (base.all_updates_unread || 0) + localUnread,
        reminders_total:    merged.length,
      });
    });
  };
  useEffect(() => {
    refetchCounts();
    /* Refresh count when the calendar bridge adds/removes a local reminder,
       AND when the local notification watcher pushes a new synthesized entry. */
    const onChanged = () => refetchCounts();
    window.addEventListener('Vyuflo:local-reminders-changed', onChanged);
    window.addEventListener(LAWYER_NOTIFICATIONS_EVENT, onChanged);
    return () => {
      window.removeEventListener('Vyuflo:local-reminders-changed', onChanged);
      window.removeEventListener(LAWYER_NOTIFICATIONS_EVENT, onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Tab data — backend first, mock fallback when empty or on error.
     We don't block the UI on 403/etc. — mocks render so the demo works. */
  useEffect(() => {
    setLoading(true);

    if (activeTab === 'reminders') {
      /* Merge order (later wins on id collision):
           1. MOCK_REMINDERS               — demo seed (lowest priority)
           2. backend /reminders items     — when API is wired
           3. local store (calendar bridge) — user's freshly-created reminders
         So a calendar event the user JUST created always surfaces, and once
         backend wires reminders to calendar_events, the backend version
         replaces it (same id → de-dup wins from backend). */
      notifRemindersApi.listReminders({ include_past: includePast, limit: 30 })
        .then((r) => {
          const backend = r.items?.length ? r.items : MOCK_REMINDERS;
          setReminders(mergeReminders(backend, listLocalReminders()));
        })
        .catch(() => {
          setReminders(mergeReminders(MOCK_REMINDERS, listLocalReminders()));
        })
        .finally(() => setLoading(false));
    } else if (activeTab === 'deadlines') {
      notifRemindersApi.listDeadlines({ limit: 30 })
        .then((r) => setDeadlines(r.items?.length ? r.items : MOCK_DEADLINES))
        .catch(() => setDeadlines(MOCK_DEADLINES))
        .finally(() => setLoading(false));
    } else {
      /* All Updates tab merges 3 sources:
           1. Backend /notifications-reminders/updates
           2. MOCK_UPDATES fallback when backend is empty
           3. Local synthesized notifications (uploads, chats, new cases…)
         Local entries are prepended (newest first) and de-duped by id.
         Sorted by created_at DESC after merge so ordering stays honest. */
      const localAsUpdates = listLawyerNotifications().map(localToUpdate);
      notifRemindersApi.listUpdates({ limit: 30 })
        .then((r) => {
          const backend = r.items?.length ? r.items : MOCK_UPDATES;
          setUpdates(mergeUpdates(backend, localAsUpdates));
        })
        .catch(() => setUpdates(mergeUpdates(MOCK_UPDATES, localAsUpdates)))
        .finally(() => setLoading(false));
    }
  }, [activeTab, includePast]);

  /* Refresh the All Updates list whenever the local store changes. */
  useEffect(() => {
    if (activeTab !== 'all_updates') return;
    const onChanged = () => {
      const localAsUpdates = listLawyerNotifications().map(localToUpdate);
      /* Preserve any backend items already present; add/remove locals. */
      setUpdates((prev) => {
        const backend = prev.filter((u) => !u.id.startsWith(LOCAL_ID_PREFIX));
        return mergeUpdates(backend, localAsUpdates);
      });
    };
    window.addEventListener(LAWYER_NOTIFICATIONS_EVENT, onChanged);
    return () => window.removeEventListener(LAWYER_NOTIFICATIONS_EVENT, onChanged);
  }, [activeTab]);

  const setTab = (id: RemindersTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    next.delete('past'); /* strip any legacy ?past= param from older URLs */
    setSearchParams(next);
  };

  const handleMarkAllRead = async () => {
    /* Scope to current tab if it's Deadlines */
    const category = activeTab === 'deadlines' ? 'deadline' : undefined;
    /* Optimistic */
    if (activeTab === 'deadlines') {
      setDeadlines((d) => d.map((x) => ({ ...x, is_read: true, show_unread_dot: false })));
      setCounts((c) => ({ ...c, deadlines_unread: 0 }));
    } else {
      setUpdates((u) => u.map((x) => ({ ...x, is_read: true, show_unread_dot: false })));
      setCounts((c) => ({ ...c, all_updates_unread: 0 }));
    }
    /* Local synthesized notifications (only relevant to the All Updates tab)
       need their read-flag flipped too so the bell count zeroes out. */
    if (activeTab === 'all_updates') {
      markAllLawyerNotificationsRead();
    }

    try {
      await notifRemindersApi.markAllRead(category);
      setBanner({ type: 'success', text: 'All marked as read.' });
      refetchCounts();
    } catch {
      /* Already optimistic — keep UI as-is, surface a soft error. */
      setBanner({ type: 'error', text: 'Could not sync read status with server.' });
      refetchCounts();
    }
  };

  /** Just marks a single notification as read locally — NO auto-navigate.
      The card has its own "View case →" link the user can click explicitly. */
  const markSingleRead = (n: NotificationUpdate) => {
    if (activeTab === 'deadlines') {
      setDeadlines((d) => d.map((x) => (x.id === n.id ? { ...x, is_read: true, show_unread_dot: false } : x)));
    } else {
      setUpdates((u) => u.map((x) => (x.id === n.id ? { ...x, is_read: true, show_unread_dot: false } : x)));
    }
    /* Also flip the underlying local-store entry so the toaster + bell
       count reflect the read state and don't re-fire. */
    if (n.id.startsWith(LOCAL_ID_PREFIX)) {
      markLawyerNotificationRead(n.id.slice(LOCAL_ID_PREFIX.length));
      refetchCounts();
    }
  };

  /** Explicit "View case" click — fired ONLY when user clicks the inline button,
      never on card expand. Routes by category to the most relevant existing page.
      ⚠ Backend currently doesn't return application_id on notifications, so we
      can't deep-link to a specific case. We use case_reference as a search hint
      where supported. Once backend adds application_id, switch to /lawyer/cases/{id}. */
  const navigateToTarget = (n: NotificationUpdate) => {
    markSingleRead(n);

    /* Local synthesized notifications carry an exact link in the store —
       use it verbatim instead of guessing from the category. */
    if (n.id.startsWith(LOCAL_ID_PREFIX)) {
      const rawId = n.id.slice(LOCAL_ID_PREFIX.length);
      const local = listLawyerNotifications().find((x) => x.id === rawId);
      if (local?.link) {
        navigate(local.link);
        return;
      }
    }

    /* Use case_reference as a search hint so the target page can filter to
       this case if it supports the `q` query param. */
    const searchHint = n.case_reference ? `?q=${encodeURIComponent(n.case_reference)}` : '';

    switch (n.category) {
      case 'document':
        /* Document Queue — lawyer can find the uploaded file here */
        navigate(`/lawyer/documents${searchHint}`);
        break;
      case 'deadline':
        /* Deadlines live on the Calendar page */
        navigate(`/lawyer/calendar${searchHint}`);
        break;
      case 'task':
        /* No dedicated tasks page — Client Intake list shows assigned cases */
        navigate(`/lawyer/intake${searchHint}`);
        break;
      case 'case_update':
        /* Case status changes — Client Intake shows current pipeline */
        navigate(`/lawyer/intake${searchHint}`);
        break;
      default:
        navigate('/lawyer/documents');
    }
  };

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Notifications &amp; Reminders</h1>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
            Stay on top of case events, deadlines, and assigned tasks
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'reminders' && (
            <button
              onClick={handleMarkAllRead}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              ✓ Mark All as Read
            </button>
          )}
          {activeTab === 'reminders' && (
            <button
              onClick={() => navigate('/lawyer/calendar?new_reminder=1')}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              + New Reminder
            </button>
          )}
        </div>
      </div>

      {banner && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${
          banner.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>{banner.text}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => {
          const count =
            t.id === 'all_updates' ? counts.all_updates_unread :
            t.id === 'reminders'   ? counts.reminders_total :
            counts.deadlines_unread;
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
              {(count || 0) > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Body — mock data is loaded into state on error too, so we always
          render the list and ignore loadError. Once backend is fixed, we can
          re-enable the ErrorState gate by adding `loadError ? <ErrorState/>` back. */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      ) : activeTab === 'reminders' ? (
        <ReminderList items={reminders} />
      ) : activeTab === 'deadlines' ? (
        <UpdatesList items={deadlines} onMarkRead={markSingleRead} onViewCase={navigateToTarget} />
      ) : (
        <UpdatesList items={updates} onMarkRead={markSingleRead} onViewCase={navigateToTarget} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════════ */

function UpdatesList({
  items, onMarkRead, onViewCase,
}: {
  items: NotificationUpdate[];
  onMarkRead: (n: NotificationUpdate) => void;
  onViewCase: (n: NotificationUpdate) => void;
}) {
  /* Track which card is expanded — collapsed state shows preview, expanded
     shows full body + action buttons. Clicking the card body just toggles
     this; no surprise navigation. */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (items.length === 0) {
    return <EmptyState icon="🔔" title="You're all caught up" subtitle="New case events will appear here." />;
  }

  const toggleExpand = (n: NotificationUpdate) => {
    /* DO NOT auto-mark as read on expand — keeps the "Mark as read"
       button visible in the expanded panel so the user can click it
       explicitly. Auto-mark only happens via View case OR explicit click. */
    setExpandedId(expandedId === n.id ? null : n.id);
  };

  const groups = groupByDay(items, (x) => x.created_at);
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.day}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{g.day}</p>
          <ul className="space-y-2">
            {g.items.map((n) => {
              const isOpen = expandedId === n.id;
              return (
                <li
                  key={n.id}
                  className={`group relative rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
                    n.show_unread_dot ? 'border-l-4 border-l-indigo-500 border-gray-200' : 'border-gray-200'
                  }`}
                >
                  {/* Card header — click toggles expand, NOT navigate */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(n)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <NotifBadge label={n.badge_label} priority={n.priority} category={n.category} />
                        {n.visa_type_code && (
                          <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {n.visa_type_code}
                          </span>
                        )}
                        {n.case_reference && (
                          <span className="text-[10px] text-gray-500">{n.case_reference}</span>
                        )}
                      </div>
                      <p className={`mt-1 font-semibold ${n.show_unread_dot ? 'text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      {!isOpen && n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.body}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                        {n.client_name && <span>{n.client_name}</span>}
                        {n.client_name && <span>·</span>}
                        <span>{formatRelative(n.created_at)}</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-base transition-transform ${
                        isOpen ? 'rotate-180 text-indigo-600' : 'text-gray-400'
                      }`}
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </button>

                  {/* Expanded panel — full body + explicit action buttons */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                      {n.body && (
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{n.body}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onViewCase(n); }}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          📁 View case
                        </button>
                        {!n.is_read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkRead(n); }}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            ✓ Mark as read
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ReminderList({ items }: { items: ReminderItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon="⏰" title="No reminders" subtitle='Click "+ New Reminder" to add one.' />;
  }
  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  ⏰ {r.badge_label}
                </span>
                {r.visa_type_code && (
                  <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {r.visa_type_code}
                  </span>
                )}
                {r.case_reference && <span className="text-[10px] text-gray-500">{r.case_reference}</span>}
              </div>
              <p className="mt-1 font-semibold text-gray-900">{r.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                {/* The Reminders tab shows when the reminder FIRES, not when
                    the event starts. So we subtract `reminder_minutes` from
                    the event start datetime. A "1-Hour Reminder" for a 19:35
                    event renders as 18:35. */}
                <span>📅 {formatReminderFireTime(r.event_date, r.start_time, r.reminder_minutes)}</span>
                {r.client_name && <span>· {r.client_name}</span>}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function NotifBadge({ label, priority, category }: { label: string; priority: string; category: string }) {
  const safe = label || '';
  let color = 'bg-gray-100 text-gray-700 border-gray-200';
  if (priority === 'urgent')                       color = 'bg-red-50 text-red-700 border-red-200';
  else if (category === 'deadline')                color = 'bg-amber-50 text-amber-700 border-amber-200';
  else if (category === 'document')                color = 'bg-blue-50 text-blue-700 border-blue-200';
  else if (category === 'case_update')             color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  else if (category === 'task')                    color = 'bg-violet-50 text-violet-700 border-violet-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {safe}
    </span>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
      <p className="text-4xl">{icon}</p>
      <p className="mt-3 text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════ */
function groupByDay<T>(items: T[], getDate: (x: T) => string): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  let last = '';
  for (const it of items) {
    const day = relativeDay(getDate(it));
    if (day !== last) { groups.push({ day, items: [] }); last = day; }
    groups[groups.length - 1].items.push(it);
  }
  return groups;
}

function relativeDay(iso: string): string {
  if (!iso) return 'Today';
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  } catch { return 'Earlier'; }
}

function formatRelative(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diffM = (Date.now() - d.getTime()) / 60000;
    if (diffM < 1)    return 'Just now';
    if (diffM < 60)   return `${Math.floor(diffM)}m ago`;
    if (diffM < 1440) return `${Math.floor(diffM / 60)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function formatEventDateTime(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time}`);
    return d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return `${date} ${time}`; }
}

/** Reminders tab shows when the reminder FIRES = event start - reminder_minutes.
 *  Example: event 7:35 PM with `reminder_minutes=60` → renders 6:35 PM. */
function formatReminderFireTime(date: string, time: string, reminderMinutes: number): string {
  try {
    const eventDt = new Date(`${date}T${time}`);
    if (Number.isNaN(eventDt.getTime())) return formatEventDateTime(date, time);
    const fireDt = new Date(eventDt.getTime() - (reminderMinutes || 0) * 60_000);
    return fireDt.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return formatEventDateTime(date, time);
  }
}
