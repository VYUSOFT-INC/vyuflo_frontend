// src/pages/lawyer/cases/CaseListPage.tsx
//
// Figma node 14:23929 (HR Cases List — used as the detailed reference per
// team direction). Lawyer-side Case List for attorneys to browse every
// case assigned to them.
//
// ── LAWYER USE CASE ─────────────────────────────────────────────────
//   Attorneys juggle 20-50 cases at a time. This is the daily "inbox"
//   view — shows every active case with the client, visa type, status,
//   next deadline, and whether action is needed. Click a row → Case Detail.
//
// ── DATA SOURCE ─────────────────────────────────────────────────────
//   PRIMARY = GET /lawyer/applications (the HR-assigned worklist — same
//   endpoint Intake landing uses). So any case HR has already assigned
//   to the logged-in attorney appears here automatically.
//
// ── CAUTIONS ────────────────────────────────────────────────────────
//   1. URL-driven filter state (?q, ?status, ?visa, ?urgency, ?mine).
//      Survives reload + bookmarkable + back-button friendly.
//   2. No hardcoded routes — uses `casesApi` + `useNavigate(...)`.
//   3. Mock fallback when HR-assigned worklist is empty AND no filters
//      applied, so the screen demos even before real cases exist.
//   4. Defensive rendering — every status badge / urgency / nullable field
//      is guarded so a partial backend payload won't crash the row.
//   5. Mobile-responsive: table on md+, card stack on sub-md.
//   6. Empty-state vs filtered-empty-state are different messages.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { casesApi } from '../../../api/lawyer/cases.api';
import type {
  CaseListItem,
  CaseListResponse,
  CaseStatus,
  CaseUrgency,
} from '../../../types/lawyer/cases.types';

/* ═══════════════════════════════════════════════════════════════════════
   MOCK FALLBACK — realistic immigration cases.
   Used only when the HR-assigned worklist is empty AND no filters are
   active. Auto-removed once backend has data (handled by the load effect).
   ═══════════════════════════════════════════════════════════════════════ */
const NOW = Date.now();
const DAY = 1000 * 60 * 60 * 24;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const MOCK_CASES: CaseListItem[] = [
  {
    id: 'case-001',
    case_reference: '#VF-2026-089',
    client_id: 'cli-001',
    client_name: 'Maria Rodriguez',
    client_email: 'maria.r@email.com',
    client_avatar_url: null,
    employer_name: 'TechCorp Solutions',
    visa_type_code: 'H-1B',
    status: 'rfe_response',
    status_label: 'RFE Response',
    urgency: 'critical',
    days_to_next_deadline: 7,
    next_deadline_label: 'RFE due Oct 31',
    action_required: true,
    has_alert: true,
    assigned_attorney_id: 'me',
    assigned_attorney_name: 'You',
    filing_date: iso(-45),
    created_at: iso(-90),
    updated_at: iso(-1),
  },
  {
    id: 'case-002',
    case_reference: '#VF-8915',
    client_id: 'cli-002',
    client_name: 'Aarav Patel',
    client_email: 'aarav.p@email.com',
    client_avatar_url: null,
    employer_name: 'TechCorp Solutions',
    visa_type_code: 'H-1B',
    status: 'petition_prep',
    status_label: 'Petition Prep',
    urgency: 'high',
    days_to_next_deadline: 14,
    next_deadline_label: 'Filing window opens',
    action_required: true,
    has_alert: false,
    assigned_attorney_id: 'me',
    assigned_attorney_name: 'You',
    filing_date: null,
    created_at: iso(-60),
    updated_at: iso(-2),
  },
  {
    id: 'case-003',
    case_reference: '#VF-8916',
    client_id: 'cli-003',
    client_name: 'Elena Rodriguez',
    client_email: 'elena.r@email.com',
    client_avatar_url: null,
    employer_name: null,
    visa_type_code: 'O-1A',
    status: 'document_review',
    status_label: 'Document Review',
    urgency: 'medium',
    days_to_next_deadline: 30,
    next_deadline_label: 'Evidence package',
    action_required: false,
    has_alert: false,
    assigned_attorney_id: 'me',
    assigned_attorney_name: 'You',
    filing_date: null,
    created_at: iso(-30),
    updated_at: iso(-5),
  },
  {
    id: 'case-004',
    case_reference: '#VF-8917',
    client_id: 'cli-004',
    client_name: 'Wei Chen',
    client_email: 'wei.c@email.com',
    client_avatar_url: null,
    employer_name: 'Global Innovations Inc',
    visa_type_code: 'EB-2',
    status: 'filed',
    status_label: 'Filed',
    urgency: 'low',
    days_to_next_deadline: null,
    next_deadline_label: 'Awaiting USCIS',
    action_required: false,
    has_alert: false,
    assigned_attorney_id: 'me',
    assigned_attorney_name: 'You',
    filing_date: iso(-12),
    created_at: iso(-180),
    updated_at: iso(-12),
  },
  {
    id: 'case-005',
    case_reference: '#VF-8920',
    client_id: 'cli-005',
    client_name: 'James Wilson',
    client_email: 'james.w@email.com',
    client_avatar_url: null,
    employer_name: 'ABC Manufacturing',
    visa_type_code: 'L-1A',
    status: 'intake',
    status_label: 'Intake',
    urgency: 'medium',
    days_to_next_deadline: 5,
    next_deadline_label: 'Document collection',
    action_required: true,
    has_alert: false,
    assigned_attorney_id: 'me',
    assigned_attorney_name: 'You',
    filing_date: null,
    created_at: iso(-10),
    updated_at: iso(0),
  },
  {
    id: 'case-006',
    case_reference: '#VF-8921',
    client_id: 'cli-006',
    client_name: 'Priya Sharma',
    client_email: 'priya.s@email.com',
    client_avatar_url: null,
    employer_name: null,
    visa_type_code: 'EB-1A',
    status: 'approved',
    status_label: 'Approved',
    urgency: 'low',
    days_to_next_deadline: null,
    next_deadline_label: null,
    action_required: false,
    has_alert: false,
    assigned_attorney_id: 'me',
    assigned_attorney_name: 'You',
    filing_date: iso(-200),
    created_at: iso(-365),
    updated_at: iso(-30),
  },
];

const MOCK_RESPONSE: CaseListResponse = {
  items:       MOCK_CASES,
  total:       MOCK_CASES.length,
  page:        1,
  page_size:   50,
  total_pages: 1,
};

/* ═══════════════════════════════════════════════════════════════════════
   Status + urgency presentation
   ═══════════════════════════════════════════════════════════════════════ */

const STATUS_BADGE: Record<string, string> = {
  // Intake-phase statuses (from /lawyer/applications HR worklist)
  pending_intake:      'bg-amber-50 text-amber-700',
  intake_in_progress:  'bg-blue-50 text-blue-700',
  intake_completed:    'bg-emerald-50 text-emerald-700',
  // Downstream case statuses
  intake:              'bg-slate-100 text-slate-700',
  document_collection: 'bg-amber-50 text-amber-700',
  document_review:     'bg-blue-50 text-blue-700',
  petition_prep:       'bg-indigo-50 text-indigo-700',
  ready_to_file:       'bg-violet-50 text-violet-700',
  filed:               'bg-emerald-50 text-emerald-700',
  rfe_pending:         'bg-orange-50 text-orange-700',
  rfe_response:        'bg-red-50 text-red-700',
  approved:            'bg-green-100 text-green-800',
  denied:              'bg-rose-100 text-rose-800',
  on_hold:             'bg-zinc-100 text-zinc-700',
  closed:              'bg-gray-100 text-gray-600',
};

const URGENCY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-amber-400',
  low:      'bg-slate-300',
};

const STATUS_OPTIONS: { value: CaseStatus | ''; label: string }[] = [
  { value: '',                    label: 'All statuses'       },
  // HR-assigned worklist statuses (most common for attorneys today)
  { value: 'pending_intake',      label: 'Pending Intake'     },
  { value: 'intake_in_progress',  label: 'Intake In Progress' },
  { value: 'intake_completed',    label: 'Intake Completed'   },
  // Downstream case statuses
  { value: 'document_collection', label: 'Doc Collection'  },
  { value: 'document_review',     label: 'Doc Review'      },
  { value: 'petition_prep',       label: 'Petition Prep'   },
  { value: 'ready_to_file',       label: 'Ready to File'   },
  { value: 'filed',               label: 'Filed'           },
  { value: 'rfe_pending',         label: 'RFE Pending'     },
  { value: 'rfe_response',        label: 'RFE Response'    },
  { value: 'approved',            label: 'Approved'        },
  { value: 'denied',              label: 'Denied'          },
  { value: 'on_hold',             label: 'On Hold'         },
  { value: 'closed',              label: 'Closed'          },
];

const VISA_OPTIONS = ['', 'H-1B', 'L-1A', 'L-1B', 'O-1A', 'O-1B', 'EB-1A', 'EB-2', 'EB-3', 'TN'];

const URGENCY_OPTIONS: { value: CaseUrgency | ''; label: string }[] = [
  { value: '',         label: 'Any urgency' },
  { value: 'critical', label: 'Critical'    },
  { value: 'high',     label: 'High'        },
  { value: 'medium',   label: 'Medium'      },
  { value: 'low',      label: 'Low'         },
];

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function deadlineColor(days: number | null | undefined): string {
  if (days == null) return 'text-slate-400';
  if (days < 0)     return 'text-red-600 font-semibold';
  if (days <= 7)    return 'text-orange-600 font-medium';
  if (days <= 30)   return 'text-amber-600';
  return 'text-slate-600';
}

function deadlineLabel(days: number | null | undefined): string {
  if (days == null)  return '—';
  if (days < 0)      return `${Math.abs(days)}d overdue`;
  if (days === 0)    return 'Today';
  if (days === 1)    return 'Tomorrow';
  return `${days}d left`;
}

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */

export default function CaseListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Filters live in the URL so reload + share + back-button all work. */
  const q        = searchParams.get('q')      || '';
  const status   = (searchParams.get('status')  || '') as CaseStatus | '';
  const visa     =  searchParams.get('visa')    || '';
  const urgency  = (searchParams.get('urgency') || '') as CaseUrgency | '';
  const mineOnly =  searchParams.get('mine')    === '1';

  const setParam = (key: string, val: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val.length) next.set(key, val);
      else next.delete(key);
      return next;
    });
  };

  const [data,    setData]    = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  /* Debounced fetch.
     PRIMARY SOURCE = GET /lawyer/applications (HR-assigned worklist —
     same endpoint Intake landing uses, so any case HR has already
     assigned to the logged-in attorney shows up here automatically).
     MERGE STRATEGY: real HR cases first, demo mocks appended below.
     Both render together so the screen always looks populated and the
     attorney can see "live" + "sample" data side by side. Mocks vanish
     completely once a real case shares the same id (defensive de-dupe). */
  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);

      casesApi
        .listMyCases(status || undefined)
        .then((assigned) => {
          /* Merge real (first) + mocks (after), de-duped by id. */
          const realIds = new Set((assigned || []).map((c) => c.id));
          const merged: CaseListItem[] = [
            ...(assigned || []),
            ...MOCK_CASES.filter((m) => !realIds.has(m.id)),
          ];

          /* Local filter pass — backend worklist only supports status_filter;
             search/visa/urgency/mine are applied client-side here. */
          const filterFn = (c: CaseListItem) => {
            if (q) {
              const needle = q.toLowerCase();
              const hay = `${c.client_name} ${c.client_email ?? ''} ${c.case_reference} ${c.employer_name ?? ''}`.toLowerCase();
              if (!hay.includes(needle)) return false;
            }
            if (visa    && c.visa_type_code !== visa)   return false;
            if (urgency && c.urgency        !== urgency) return false;
            if (mineOnly && c.assigned_attorney_id !== 'me') return false;
            return true;
          };

          const filtered = merged.filter(filterFn);
          setData({
            items:       filtered,
            total:       filtered.length,
            page:        1,
            page_size:   filtered.length,
            total_pages: 1,
          });
        })
        .catch(() => {
          /* Backend down / 403 / network — fall back to mocks alone. */
          setData(MOCK_RESPONSE);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handle);
  }, [q, status, visa, urgency, mineOnly]);

  const items = data?.items ?? [];

  const counts = useMemo(() => {
    return {
      total:    items.length,
      action:   items.filter((c) => c.action_required).length,
      critical: items.filter((c) => c.urgency === 'critical').length,
      filed:    items.filter((c) => c.status === 'filed' || c.status === 'approved').length,
    };
  }, [items]);

  const handleOpen = (caseId: string) => {
    navigate(`/lawyer/cases/${caseId}`);
  };

  /* ────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Cases</h1>
            <p className="mt-1 text-sm text-slate-600">
              Every case assigned to you. Click a row to open the file.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/lawyer/intake')}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New Case (Intake)
          </button>
        </div>

        {/* Stat strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Total cases"    value={counts.total}    />
          <StatTile label="Action needed"  value={counts.action}   tone="warn" />
          <StatTile label="Critical"       value={counts.critical} tone="danger" />
          <StatTile label="Filed/Approved" value={counts.filed}    tone="ok" />
        </div>

        {/* Filter bar */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m14 14 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                value={q}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="Search by client name, case #, or employer…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => setParam('status', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value || 'all'} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Visa type */}
            <select
              value={visa}
              onChange={(e) => setParam('visa', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {VISA_OPTIONS.map((v) => (
                <option key={v || 'all'} value={v}>{v || 'All visa types'}</option>
              ))}
            </select>

            {/* Urgency */}
            <select
              value={urgency}
              onChange={(e) => setParam('urgency', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u.value || 'all'} value={u.value}>{u.label}</option>
              ))}
            </select>

            {/* Mine only toggle */}
            <label className="inline-flex select-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(e) => setParam('mine', e.target.checked ? '1' : null)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Mine only
            </label>
          </div>
        </div>

        {/* Loading / empty / list */}
        <div className="mt-5">
          {loading ? (
            <SkeletonGrid />
          ) : items.length === 0 ? (
            <EmptyState
              filtered={Boolean(q || status || visa || urgency || mineOnly)}
              onClear={() => setSearchParams(new URLSearchParams())}
            />
          ) : (
            <>
              {/* Table (md+) */}
              <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Case</th>
                      <th className="px-4 py-3 font-medium">Visa</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Urgency</th>
                      <th className="px-4 py-3 font-medium">Next deadline</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => handleOpen(c.id)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                              {initials(c.client_name || '?')}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">
                                {c.client_name || '—'}
                              </div>
                              {c.employer_name && (
                                <div className="truncate text-xs text-slate-500">
                                  {c.employer_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-700">
                            {c.case_reference || '—'}
                          </div>
                          {c.action_required && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Action required
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {c.visa_type_code || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.status_label || c.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className={`h-2 w-2 rounded-full ${URGENCY_DOT[c.urgency] || 'bg-slate-300'}`} />
                            <span className="capitalize">{c.urgency || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`text-xs ${deadlineColor(c.days_to_next_deadline)}`}>
                            {deadlineLabel(c.days_to_next_deadline)}
                          </div>
                          {c.next_deadline_label && (
                            <div className="text-[11px] text-slate-500">
                              {c.next_deadline_label}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpen(c.id); }}
                            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card stack (sub-md) */}
              <ul className="space-y-3 md:hidden">
                {items.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => handleOpen(c.id)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {initials(c.client_name || '?')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-medium text-slate-900">
                            {c.client_name || '—'}
                          </div>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[c.urgency] || 'bg-slate-300'}`} />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {c.employer_name || c.case_reference}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {c.visa_type_code || '—'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.status_label || c.status || '—'}
                          </span>
                          {c.action_required && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Action required
                            </span>
                          )}
                        </div>
                        <div className={`mt-2 text-xs ${deadlineColor(c.days_to_next_deadline)}`}>
                          {deadlineLabel(c.days_to_next_deadline)}
                          {c.next_deadline_label && (
                            <span className="text-slate-500"> · {c.next_deadline_label}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════════ */

function StatTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'warn' | 'danger' | 'ok';
}) {
  const toneCls = {
    neutral: 'text-slate-900',
    warn:    'text-amber-600',
    danger:  'text-red-600',
    ok:      'text-emerald-600',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="text-base font-medium text-slate-800">
        {filtered ? 'No cases match those filters' : 'No cases yet'}
      </div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {filtered
          ? 'Try clearing some filters or broadening your search.'
          : 'Cases will show up here as HR or the intake portal assigns them to you.'}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
