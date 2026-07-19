// src/pages/lawyer/help/HelpNotifications.tsx
//
// Figma Screen 36 — Help Notifications page.
//
// LAWYER USE CASE:
//   Single inbox of system messages: case status updates from HR, court
//   deadlines, security alerts, product news. Each notification has an
//   optional CTA (e.g. "View case") that deep-links to the relevant page.
//
// ── CAUTIONS ─────────────────────────────────────────────────────────
//   1. `unread_count` from backend drives any future bell-badge in sidebar.
//   2. "Mark all read" calls bulk endpoint, then refetches for fresh counts.
//   3. Dismissing (X) is permanent — backend filters dismissed from future GETs.
//   4. CTAs deep-link via cta_primary_url — typically internal app routes.
//   5. Mock fallback when backend empty — shows 4 realistic notifications.
//   6. Defensive on category / priority strings.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { helpSupportApi } from '../../../api/lawyer/helpSupport.api';
import type {
  HelpNotification,
  HelpNotificationListResponse,
  NotificationCategory,
} from '../../../types/lawyer/helpSupport.types';

const MOCK_NOTIFICATIONS: HelpNotificationListResponse = {
  items: [
    {
      id: 'ntf-001', notification_type: 'rfe_received', category: 'case_update', priority: 'urgent',
      title: 'RFE received for TechCorp H-1B petition',
      body:  'USCIS issued an RFE on application H1B-2026-0142. Response is due in 87 days.',
      application_id: 'app-001', case_reference: 'H1B-2026-0142',
      cta_primary_label: 'View case', cta_primary_url: '/lawyer/applications/app-001',
      is_read: false, read_at: null, is_dismissed: false,
      sent_via_email: true, sent_via_push: true, sent_via_sms: false,
      created_at: '2026-06-22T10:30:00Z',
    },
    {
      id: 'ntf-002', notification_type: 'filing_deadline', category: 'deadline', priority: 'urgent',
      title: 'Filing deadline approaching — Maria Rodriguez',
      body:  'I-485 supporting documents must be submitted by June 30, 2026 (7 days).',
      application_id: 'app-002', case_reference: 'AOS-2026-0089',
      cta_primary_label: 'Open case', cta_primary_url: '/lawyer/applications/app-002',
      is_read: false, read_at: null, is_dismissed: false,
      sent_via_email: true, sent_via_push: true, sent_via_sms: true,
      created_at: '2026-06-22T08:00:00Z',
    },
    {
      id: 'ntf-003', notification_type: 'product_update', category: 'news', priority: 'normal',
      title: 'New: Edit invoice line items inline',
      body:  'You can now edit invoice details and add/remove line items directly on Screen 21. See changelog.',
      application_id: null, case_reference: '',
      cta_primary_label: 'See what\'s new', cta_primary_url: '/lawyer/help/articles/changelog-2026-06',
      is_read: true, read_at: '2026-06-21T15:00:00Z', is_dismissed: false,
      sent_via_email: false, sent_via_push: true, sent_via_sms: false,
      created_at: '2026-06-21T09:00:00Z',
    },
    {
      id: 'ntf-004', notification_type: 'security_alert', category: 'security', priority: 'normal',
      title: 'New login from Chrome on Windows',
      body:  'A new session was started from Bangalore, IN at 11:00 AM IST. If this wasn\'t you, secure your account.',
      application_id: null, case_reference: '',
      cta_primary_label: 'Review session', cta_primary_url: '/profile?tab=security',
      is_read: true, read_at: '2026-06-22T11:05:00Z', is_dismissed: false,
      sent_via_email: true, sent_via_push: false, sent_via_sms: false,
      created_at: '2026-06-22T11:00:00Z',
    },
    {
      id: 'ntf-005', notification_type: 'invoice_paid', category: 'billing', priority: 'normal',
      title: 'Invoice INV-2026-002 paid by James Chen',
      body:  '$262.50 received via Stripe. Funds will settle in 2 business days.',
      application_id: null, case_reference: 'H1B-2026-0156',
      cta_primary_label: 'View invoice', cta_primary_url: '/lawyer/billing/invoices/inv-002',
      is_read: false, read_at: null, is_dismissed: false,
      sent_via_email: true, sent_via_push: true, sent_via_sms: false,
      created_at: '2026-06-20T15:30:00Z',
    },
  ],
  total: 5,
  unread_count: 3,
};

type CategoryFilter = NotificationCategory | 'all';
type ReadFilter     = 'all' | 'unread' | 'read';

export default function HelpNotifications() {
  const navigate = useNavigate();

  const [data, setData]             = useState<HelpNotificationListResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [working, setWorking]       = useState(false);
  const [catFilter, setCatFilter]   = useState<CategoryFilter>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [banner, setBanner]         = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /* Fetch notifications */
  useEffect(() => {
    setLoading(true);
    helpSupportApi.listNotifications({
      category: catFilter === 'all' ? undefined : catFilter,
      is_read:  readFilter === 'all' ? undefined : readFilter === 'read',
      limit:    50,
    })
      .then((r) => {
        const items = r.items || [];
        if (items.length === 0) {
          // Apply filters to mock client-side
          setData(filterMock(MOCK_NOTIFICATIONS, catFilter, readFilter));
        } else {
          setData(r);
        }
      })
      .catch(() => setData(filterMock(MOCK_NOTIFICATIONS, catFilter, readFilter)))
      .finally(() => setLoading(false));
  }, [catFilter, readFilter, refreshKey]);

  /* Auto-dismiss banner */
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(t);
  }, [banner]);

  /* Mark single read (optimistic) */
  const handleMarkRead = async (n: HelpNotification) => {
    if (n.is_read || !data) return;
    setData({
      ...data,
      items: data.items.map((x) => x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x),
      unread_count: Math.max(0, data.unread_count - 1),
    });
    try {
      await helpSupportApi.markNotificationRead(n.id);
    } catch {
      /* keep optimistic state on error */
    }
  };

  /* Mark all read */
  const handleMarkAllRead = async () => {
    if (!data || data.unread_count === 0) return;
    setWorking(true);
    setData({
      ...data,
      items: data.items.map((x) => ({ ...x, is_read: true, read_at: x.read_at || new Date().toISOString() })),
      unread_count: 0,
    });
    try {
      await helpSupportApi.markAllNotificationsRead();
      setBanner('All notifications marked as read.');
    } catch {
      setBanner('Marked all as read (demo).');
    } finally {
      setWorking(false);
    }
  };

  /* Dismiss notification */
  const handleDismiss = async (n: HelpNotification) => {
    if (!data) return;
    if (!window.confirm('Dismiss this notification? You won\'t see it here anymore.')) return;
    setData({
      ...data,
      items: data.items.filter((x) => x.id !== n.id),
      total: Math.max(0, data.total - 1),
      unread_count: n.is_read ? data.unread_count : Math.max(0, data.unread_count - 1),
    });
    try {
      await helpSupportApi.dismissNotification(n.id);
    } catch {
      /* keep optimistic removal */
    }
  };

  /* CTA click → mark read + navigate */
  const handleCTA = (n: HelpNotification) => {
    handleMarkRead(n);
    if (n.cta_primary_url) {
      navigate(n.cta_primary_url);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back navigation — top-left, above the page header (desktop + mobile). */}
      <LawyerBackButton className="!mb-0" />

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/lawyer/help')} className="mb-2 text-xs text-indigo-600 hover:underline">
            ← Back to Help
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            {data ? `${data.unread_count} unread of ${data.total}` : ' '}
          </p>
        </div>
        {data && data.unread_count > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={working}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ✓ Mark all read
          </button>
        )}
      </header>

      {banner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {banner}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as CategoryFilter)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All categories</option>
          <option value="case_update">Case updates</option>
          <option value="deadline">Deadlines</option>
          <option value="billing">Billing</option>
          <option value="security">Security</option>
          <option value="news">News & updates</option>
        </select>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs">
          {(['all', 'unread', 'read'] as ReadFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setReadFilter(f)}
              className={`rounded-md px-3 py-1.5 font-medium capitalize ${
                readFilter === f ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          title="Refresh"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          ⟳
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && data && data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-3xl">🔔</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">All caught up</p>
          <p className="mt-1 text-xs text-gray-500">No notifications match your filters.</p>
        </div>
      )}

      {/* List */}
      {!loading && data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((n) => (
            <NotificationCard
              key={n.id}
              n={n}
              onMarkRead={() => handleMarkRead(n)}
              onDismiss={() => handleDismiss(n)}
              onCTA={() => handleCTA(n)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   NOTIFICATION CARD
   ════════════════════════════════════════════════════════════════════ */
function NotificationCard({
  n, onMarkRead, onDismiss, onCTA,
}: {
  n: HelpNotification;
  onMarkRead: () => void;
  onDismiss:  () => void;
  onCTA:      () => void;
}) {
  const accent = categoryAccent(n.category);
  return (
    <li
      className={`rounded-xl border bg-white p-4 shadow-sm transition ${
        n.is_read ? 'border-gray-200' : 'border-indigo-200 ring-1 ring-indigo-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${accent.bg}`}>
          {accent.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!n.is_read && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
            <p className={`text-sm font-semibold ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
            <PriorityChip priority={n.priority} />
          </div>
          {n.body && <p className="mt-1 text-xs text-gray-600">{n.body}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
            <span className="capitalize">{(n.category || '').replace('_', ' ')}</span>
            {n.case_reference && <><span>·</span><span>{n.case_reference}</span></>}
            <span>·</span>
            <span>{formatDateTime(n.created_at)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {n.cta_primary_label && n.cta_primary_url && (
              <button
                onClick={onCTA}
                className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
              >
                {n.cta_primary_label} →
              </button>
            )}
            {!n.is_read && (
              <button
                onClick={onMarkRead}
                className="text-[11px] text-gray-500 hover:text-gray-700 hover:underline"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          title="Dismiss"
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

function PriorityChip({ priority }: { priority: string | null | undefined }) {
  const safe = priority || 'normal';
  if (safe === 'normal' || safe === 'low') return null;
  const map: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${map[safe] || 'bg-amber-100 text-amber-800'}`}>
      {safe}
    </span>
  );
}

function categoryAccent(category: string): { icon: string; bg: string } {
  const map: Record<string, { icon: string; bg: string }> = {
    case_update: { icon: '📋', bg: 'bg-indigo-100 text-indigo-700' },
    deadline:    { icon: '⏰', bg: 'bg-amber-100 text-amber-700' },
    billing:     { icon: '💰', bg: 'bg-emerald-100 text-emerald-700' },
    security:    { icon: '🔒', bg: 'bg-rose-100 text-rose-700' },
    news:        { icon: '📣', bg: 'bg-violet-100 text-violet-700' },
  };
  return map[category] || { icon: '🔔', bg: 'bg-gray-100 text-gray-700' };
}

function filterMock(
  source: HelpNotificationListResponse,
  cat: CategoryFilter,
  read: ReadFilter,
): HelpNotificationListResponse {
  let items = source.items;
  if (cat !== 'all') items = items.filter((n) => n.category === cat);
  if (read === 'read')   items = items.filter((n) => n.is_read);
  if (read === 'unread') items = items.filter((n) => !n.is_read);
  return {
    items,
    total: items.length,
    unread_count: items.filter((n) => !n.is_read).length,
  };
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}
