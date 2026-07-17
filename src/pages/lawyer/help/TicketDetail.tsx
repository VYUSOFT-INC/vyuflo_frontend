// src/pages/lawyer/help/TicketDetail.tsx
//
// Figma Screens 34 (Ticket Details) + 35 (Ticket Submitted confirmation) merged.
// Screen 35 is just a green success banner shown when URL has ?just_submitted=1.
//
// LAWYER USE CASE:
//   Lawyer opens a ticket to see what support said, replies if needed.
//   Reply automatically advances `open` → `in_progress` so support sees
//   that the lawyer responded (no manual status changes needed).
//
// ── CAUTIONS ─────────────────────────────────────────────────────────
//   1. Reply blocked when ticket is 'resolved' or 'closed' (backend 409).
//   2. URL ?just_submitted=1 → shows success banner (Screen 35 behavior).
//   3. Internal notes (is_internal_note=true) are HIDDEN from lawyer —
//      backend filters them out, but defensive UI check too.
//   4. Auto-scroll to bottom after a successful reply.
//   5. Mock ticket if backend doesn't have the id.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { helpSupportApi } from '../../../api/lawyer/helpSupport.api';
import type { Ticket, TicketReply } from '../../../types/lawyer/helpSupport.types';
import { PriorityBadge, StatusBadge } from './MyTickets';

const MOCK_TICKET: Ticket = {
  id:             'mock-tkt-001',
  ticket_number:  'TKT-2026-001',
  subject:        'Cannot upload secondary passport document',
  body:           'When I try to upload my client\'s passport on the document hub, I get an error after 80% upload. File is 8 MB PDF, well within limits. Tried Chrome and Firefox, same issue. Other documents upload fine for this same client.',
  category:       'technical',
  priority:       'high',
  status:         'in_progress',
  application_id: 'app-001',
  created_at:     '2026-06-18T10:00:00Z',
  updated_at:     '2026-06-22T15:30:00Z',
  replies: [
    {
      id: 'rep-001', ticket_id: 'mock-tkt-001', sender_id: 'agent-1', sender_type: 'support_agent',
      body: 'Hi Posam, thanks for reporting this. Could you share the file name and roughly when you last tried? We see one matching error in our logs that may be related to a CDN issue we hotfixed yesterday.',
      is_read: true, is_internal_note: false,
      created_at: '2026-06-19T11:00:00Z',
    },
    {
      id: 'rep-002', ticket_id: 'mock-tkt-001', sender_id: 'attr-1', sender_type: 'attorney',
      body: 'File is "passport_maria_rodriguez.pdf", last tried about an hour ago (around 2pm PT today).',
      is_read: true, is_internal_note: false,
      created_at: '2026-06-22T14:10:00Z',
    },
    {
      id: 'rep-003', ticket_id: 'mock-tkt-001', sender_id: 'agent-1', sender_type: 'support_agent',
      body: 'Got it — that confirms our suspicion. The CDN fix is being deployed now and should reach your region within 30 min. Could you retry then and let us know?',
      is_read: false, is_internal_note: false,
      created_at: '2026-06-22T15:30:00Z',
    },
  ],
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justSubmitted = searchParams.get('just_submitted') === '1';

  const [ticket, setTicket]   = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply]     = useState('');
  const [sending, setSending] = useState(false);
  const [banner, setBanner]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const repliesEndRef = useRef<HTMLDivElement>(null);

  /* Fetch ticket */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    helpSupportApi.getTicket(id)
      .then((r) => setTicket(r || { ...MOCK_TICKET, id }))
      .catch(() => setTicket({ ...MOCK_TICKET, id }))
      .finally(() => setLoading(false));
  }, [id]);

  /* Auto-scroll after replies render */
  useEffect(() => {
    if (!loading && !justSubmitted) {
      repliesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [loading, ticket?.replies.length, justSubmitted]);

  /* Auto-dismiss banner */
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const handleReply = async () => {
    if (!ticket || !reply.trim() || sending) return;
    setSending(true);
    try {
      const created = await helpSupportApi.replyToTicket(ticket.id, { body: reply.trim() });
      // 🔒 FORCE sender_type = 'attorney'. Reason: this reply was typed by THE LAWYER
      // from THIS lawyer-side UI — only the lawyer is logged in here. Backend may
      // return a default/blank/wrong sender_type if auth context isn't wired yet,
      // which would otherwise make the lawyer's own message appear as "Support Agent".
      const lawyerReply: TicketReply = {
        ...created,
        sender_type: 'attorney',
      };
      setTicket({
        ...ticket,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status,
        replies: [...ticket.replies, lawyerReply],
        updated_at: lawyerReply.created_at,
      });
      setReply('');
      setBanner({ type: 'success', text: 'Reply sent.' });
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { detail?: string } } };
      if (ax?.response?.status === 409) {
        setBanner({ type: 'error', text: 'Ticket is closed — cannot reply.' });
      } else {
        // Optimistic mock reply if backend isn't ready
        const mockReply: TicketReply = {
          id: `local-rep-${Date.now()}`,
          ticket_id: ticket.id,
          sender_id: 'attr-1',
          sender_type: 'attorney',
          body: reply.trim(),
          is_read: true,
          is_internal_note: false,
          created_at: new Date().toISOString(),
        };
        setTicket({
          ...ticket,
          status: ticket.status === 'open' ? 'in_progress' : ticket.status,
          replies: [...ticket.replies, mockReply],
          updated_at: mockReply.created_at,
        });
        setReply('');
        setBanner({ type: 'success', text: 'Reply sent (demo).' });
      }
    } finally {
      setSending(false);
    }
  };

  /* ── Loading / not-found ───────────────────────────────────────── */
  if (loading) {
    return <div className="p-6"><div className="h-96 animate-pulse rounded-xl bg-gray-100" /></div>;
  }
  if (!ticket) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/lawyer/help/tickets')} className="mb-4 text-xs text-indigo-600 hover:underline">
          ← Back to My Tickets
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">⚠ Ticket not found.</div>
      </div>
    );
  }

  const status      = String(ticket.status || 'open');
  const canReply    = status !== 'resolved' && status !== 'closed';
  const visibleReplies = ticket.replies.filter((r) => !r.is_internal_note);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back navigation — top-left, above the page header (desktop + mobile). */}
      <LawyerBackButton className="!mb-0" />

      {/* Just-submitted celebration banner (Screen 35) */}
      {justSubmitted && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-3xl">🎉</p>
          <h2 className="mt-2 text-xl font-bold text-emerald-900">Ticket Submitted Successfully</h2>
          <p className="mt-1 text-sm text-emerald-700">
            Your ticket <strong>{ticket.ticket_number}</strong> has been received. Our support team will respond within 24 hours.
          </p>
        </div>
      )}

      {/* Header */}
      <header>
        <button onClick={() => navigate('/lawyer/help/tickets')} className="mb-2 text-xs text-indigo-600 hover:underline">
          ← Back to My Tickets
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{ticket.ticket_number}</h1>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <p className="mt-1 text-base text-gray-800">{ticket.subject}</p>
          </div>
        </div>
      </header>

      {banner && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${
          banner.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>{banner.text}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Conversation */}
        <main className="space-y-3">
          {/* Original message */}
          <MessageBubble
            sender="attorney"
            body={ticket.body}
            timestamp={ticket.created_at}
            isOriginal
          />

          {/* Replies thread */}
          {visibleReplies.map((r) => (
            <MessageBubble
              key={r.id}
              sender={r.sender_type === 'attorney' ? 'attorney' : 'support_agent'}
              body={r.body}
              timestamp={r.created_at}
            />
          ))}

          <div ref={repliesEndRef} />

          {/* Reply box */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {canReply ? (
              <>
                <p className="mb-2 text-xs font-semibold text-gray-700">Add a reply</p>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={3000}
                  placeholder="Type your message…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">{reply.length} / 3000</p>
                  <button
                    onClick={handleReply}
                    disabled={!reply.trim() || sending}
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-center text-xs text-gray-500">
                🔒 This ticket is {status}. Replies are disabled.
              </p>
            )}
          </section>
        </main>

        {/* Sidebar — ticket meta */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Ticket Details</h3>
            <ul className="space-y-2 text-xs">
              <MetaRow label="Status"   value={<StatusBadge status={ticket.status} />} />
              <MetaRow label="Priority" value={<PriorityBadge priority={ticket.priority} />} />
              <MetaRow label="Category" value={(ticket.category || '').replace('_', ' ')} />
              <MetaRow label="Created"  value={formatDateTime(ticket.created_at)} />
              <MetaRow label="Updated"  value={formatDateTime(ticket.updated_at)} />
              {ticket.application_id && (
                <MetaRow label="Case" value={ticket.application_id.slice(0, 8) + '…'} />
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-xs text-indigo-900">
            <p className="font-semibold">Tip</p>
            <p className="mt-1">
              Replies are visible to our support team. For sensitive info, mark
              messages with attached files only.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════════ */
function MessageBubble({
  sender, body, timestamp, isOriginal,
}: {
  sender: 'attorney' | 'support_agent';
  body: string;
  timestamp: string;
  isOriginal?: boolean;
}) {
  const isAttorney = sender === 'attorney';
  return (
    <div className={`flex ${isAttorney ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
        isAttorney
          ? 'bg-indigo-600 text-white'
          : 'border border-gray-200 bg-white text-gray-800 shadow-sm'
      }`}>
        <div className="mb-1 flex items-center gap-2 text-[10px] opacity-80">
          <span className="font-semibold">
            {isAttorney ? 'You' : '🛟 Support Agent'}
            {isOriginal && ' · Original message'}
          </span>
          <span>·</span>
          <span>{formatDateTime(timestamp)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900">{value}</span>
    </li>
  );
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}
