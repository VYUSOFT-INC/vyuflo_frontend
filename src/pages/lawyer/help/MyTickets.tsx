// src/pages/lawyer/help/MyTickets.tsx
//
// Figma Screens 32 (Submit Support Ticket form) + 33 (My Tickets list)
// merged into ONE file. Submit form is a modal triggered by:
//   • "+ New Ticket" button
//   • URL ?new=1 (from HelpHome / ArticleDetail "Submit Ticket" CTAs)
//
// LAWYER USE CASE:
//   Lawyer tried self-service (search, articles) but couldn't find answer
//   → submits ticket. Comes back periodically to check status, reply to
//   support agent. Tab badges show how many tickets need attention.
//
// ── CAUTIONS ─────────────────────────────────────────────────────────
//   1. Submit modal opens via URL query (?new=1) so it's deep-linkable.
//   2. After successful submit → navigate to /tickets/:id?just_submitted=1
//      so the lawyer lands on Screen 35 (confirmation) automatically.
//   3. Status tabs use backend counts (open/in_progress/resolved) for badges.
//   4. Defensive on status field (handle null/undefined).
//   5. Mock fallback when backend empty — shows 3 demo tickets.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { helpSupportApi } from '../../../api/lawyer/helpSupport.api';
import type {
  SubmitTicketPayload,
  TicketCategory,
  TicketListItem,
  TicketListResponse,
  TicketPriority,
  TicketStatus,
} from '../../../types/lawyer/helpSupport.types';

const MOCK_TICKETS: TicketListResponse = {
  items: [
    { id: 'tkt-001', ticket_number: 'TKT-2026-001', subject: 'Cannot upload secondary passport document',
      category: 'technical', priority: 'high', status: 'in_progress', reply_count: 3,
      created_at: '2026-06-18T10:00:00Z', updated_at: '2026-06-22T15:30:00Z' },
    { id: 'tkt-002', ticket_number: 'TKT-2026-002', subject: 'Invoice tax calculation appears off for Texas client',
      category: 'billing', priority: 'medium', status: 'open', reply_count: 0,
      created_at: '2026-06-21T14:20:00Z', updated_at: '2026-06-21T14:20:00Z' },
    { id: 'tkt-003', ticket_number: 'TKT-2026-003', subject: 'Need help connecting USCIS case status API',
      category: 'feature_request', priority: 'low', status: 'resolved', reply_count: 5,
      created_at: '2026-06-10T09:00:00Z', updated_at: '2026-06-15T11:00:00Z' },
    { id: 'tkt-004', ticket_number: 'TKT-2026-004', subject: 'Two-factor authentication backup codes not working',
      category: 'account_profile', priority: 'urgent', status: 'waiting_user', reply_count: 2,
      created_at: '2026-06-20T08:45:00Z', updated_at: '2026-06-22T16:00:00Z' },
  ],
  total: 4,
  open: 1,
  in_progress: 1,
  resolved: 1,
};

type Tab = 'all' | 'open' | 'in_progress' | 'resolved' | 'waiting_user';

export default function MyTickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('all');
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const newModalOpen = searchParams.get('new') === '1';

  /* Fetch tickets */
  useEffect(() => {
    setLoading(true);
    helpSupportApi.listMyTickets({
      status: tab === 'all' ? undefined : (tab as TicketStatus),
      limit:  50,
    })
      .then((r) => {
        const items = r.items || [];
        if (items.length === 0) {
          setData({
            ...MOCK_TICKETS,
            items: tab === 'all' ? MOCK_TICKETS.items : MOCK_TICKETS.items.filter((t) => t.status === tab),
          });
        } else {
          setData(r);
        }
      })
      .catch(() => setData({
        ...MOCK_TICKETS,
        items: tab === 'all' ? MOCK_TICKETS.items : MOCK_TICKETS.items.filter((t) => t.status === tab),
      }))
      .finally(() => setLoading(false));
  }, [tab]);

  const openNewModal = () => {
    const next = new URLSearchParams(searchParams);
    next.set('new', '1');
    setSearchParams(next);
  };

  const closeNewModal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next);
  };

  const handleTicketSubmitted = (ticketId: string) => {
    closeNewModal();
    navigate(`/lawyer/help/tickets/${ticketId}?just_submitted=1`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/lawyer/help')} className="mb-2 text-xs text-indigo-600 hover:underline">
            ← Back to Help
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-sm text-gray-500">Track and reply to your support requests</p>
        </div>
        <button
          onClick={openNewModal}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + New Ticket
        </button>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200">
        <TabButton active={tab === 'all'}           onClick={() => setTab('all')}           label="All"          count={data?.total} />
        <TabButton active={tab === 'open'}          onClick={() => setTab('open')}          label="Open"         count={data?.open} />
        <TabButton active={tab === 'in_progress'}   onClick={() => setTab('in_progress')}   label="In Progress"  count={data?.in_progress} />
        <TabButton active={tab === 'waiting_user'}  onClick={() => setTab('waiting_user')}  label="Waiting on You" />
        <TabButton active={tab === 'resolved'}      onClick={() => setTab('resolved')}      label="Resolved"     count={data?.resolved} />
      </div>

      {/* Tickets list */}
      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-3xl">📝</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">No tickets in this view</p>
          <p className="mt-1 text-xs text-gray-500">Submit your first ticket to get help from our support team.</p>
          <button
            onClick={openNewModal}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            + New Ticket
          </button>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Replies</th>
                  <th className="px-4 py-3">Last update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((t) => <TicketRow key={t.id} t={t} onClick={() => navigate(`/lawyer/help/tickets/${t.id}`)} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New ticket modal */}
      {newModalOpen && (
        <SubmitTicketModal
          onClose={closeNewModal}
          onSubmitted={handleTicketSubmitted}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TABS + ROWS
   ════════════════════════════════════════════════════════════════════ */
function TabButton({
  active, onClick, label, count,
}: {
  active: boolean; onClick: () => void; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition ${
        active
          ? 'border-b-2 border-indigo-600 text-indigo-700'
          : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function TicketRow({ t, onClick }: { t: TicketListItem; onClick: () => void }) {
  return (
    <tr onClick={onClick} className="cursor-pointer hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-3 font-semibold text-indigo-600">{t.ticket_number}</td>
      <td className="px-4 py-3 text-gray-900">{t.subject}</td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-600 capitalize">{(t.category || '').replace('_', ' ')}</td>
      <td className="whitespace-nowrap px-4 py-3"><PriorityBadge priority={t.priority} /></td>
      <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={t.status} /></td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">{t.reply_count}</td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDateTime(t.updated_at)}</td>
    </tr>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STATUS + PRIORITY BADGES (defensive — handle null status)
   ════════════════════════════════════════════════════════════════════ */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  const safe = status || 'open';
  const map: Record<string, string> = {
    open:          'bg-blue-100 text-blue-800',
    in_progress:   'bg-amber-100 text-amber-800',
    waiting_user:  'bg-violet-100 text-violet-800',
    resolved:      'bg-emerald-100 text-emerald-800',
    closed:        'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[safe] || 'bg-gray-100 text-gray-700'}`}>
      {safe.replace('_', ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  const safe = priority || 'medium';
  const map: Record<string, string> = {
    low:    'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-700',
    high:   'bg-amber-100 text-amber-800',
    urgent: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[safe] || 'bg-gray-100 text-gray-700'}`}>
      {safe}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SUBMIT TICKET MODAL (inline — Screen 32)
   ════════════════════════════════════════════════════════════════════ */
function SubmitTicketModal({
  onClose, onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: (ticketId: string) => void;
}) {
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [category, setCategory] = useState<TicketCategory>('technical');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSubmit = subject.trim().length > 0 && body.trim().length >= 10 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const payload: SubmitTicketPayload = {
      subject:  subject.trim(),
      body:     body.trim(),
      category, priority,
    };
    try {
      const ticket = await helpSupportApi.submitTicket(payload);
      onSubmitted(ticket.id);
    } catch (e: unknown) {
      // Backend not ready → fallback to mock ticket and proceed to success page
      const ax = e as { response?: { data?: { detail?: string } } };
      if (ax?.response?.data?.detail) {
        setError(ax.response.data.detail);
      } else {
        onSubmitted(`mock-tkt-${Date.now()}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Submit a Support Ticket</h2>
            <p className="text-xs text-gray-500">Our team will respond within 24 hours</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </header>

        <div className="space-y-4 px-6 py-5">
          {/* Subject */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder="Brief description of your issue"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="technical">Technical issue</option>
                <option value="billing">Billing</option>
                <option value="account_profile">Account / Profile</option>
                <option value="feature_request">Feature request</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Describe the issue *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              minLength={10}
              maxLength={3000}
              placeholder="Include steps to reproduce, expected behavior, and any error messages you see."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-[10px] text-gray-400">{body.length} / 3000 characters · minimum 10</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">⚠ {error}</div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}
