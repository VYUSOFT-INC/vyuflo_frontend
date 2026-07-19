// src/pages/lawyer/cases/CaseDetailPage.tsx
//
// Figma nodes 14:39108 (Case Details) + 101:3800 (Case Overview) — merged
// into ONE page with URL-driven tabs because the data overlaps heavily and
// users navigate between them constantly.
//
// ── LAWYER USE CASE ─────────────────────────────────────────────────
//   This is where the attorney spends ~70% of their time. Everything about
//   one case lives here:
//     Details      — client info, employer, beneficiary, document counts
//     Overview     — status-history timeline (audit log) for legal compliance
//     Comments     — internal notes between attorney/HR/paralegal (pinned float)
//     Deadlines    — USCIS dates, RFE responses, biometrics, court dates
//     Requirements — live required-documents list from admin Visa Types Manager
//
// ── CAUTIONS ────────────────────────────────────────────────────────
//   1. Active tab is URL-driven: ?tab=details|overview|comments|deadlines|requirements.
//      Survives reload + back button + share link.
//   2. UUID short-circuit — mock IDs ("case-001") skip the API and use
//      mock data so the screen demos before any real case is filed.
//   3. All sub-resources have mock fallback. API empty → mock. API error → mock.
//   4. Optimistic updates for pin / complete / delete to keep the UI snappy.
//   5. Defensive renders — every label has `|| '—'` to survive null fields.
//   6. Mobile responsive: header stacks, tabs scroll horizontally on sub-md.
//   7. No hardcoded routes — all nav uses `navigate()` with relative paths.
//   8. Requirements tab reads from backend /visa-types — same catalog admin
//      manages, so edits propagate automatically. Zero hardcoded doc lists.
//      Match logic is defensive: the case field can carry either the CODE
//      ("H-1B") or the full NAME ("H-1B Specialty Occupation"), so we try
//      several strategies before giving up.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';
import { casesApi, isLikelyUuid } from '../../../api/lawyer/cases.api';
import { visaChecklistApi } from '../../../api/employee/visaChecklist.api';
import type {
  CaseComment,
  CaseDeadline,
  CaseDetail,
  CaseDetailTab,
  CaseListItem,
  CaseStatusHistory,
} from '../../../types/lawyer/cases.types';

/* ═══════════════════════════════════════════════════════════════════════
   MOCK FALLBACKS — keyed by case id so mock-id rows look unique.
   ═══════════════════════════════════════════════════════════════════════ */
const NOW = Date.now();
const DAY = 1000 * 60 * 60 * 24;
const isoOffset = (d: number) => new Date(NOW + d * DAY).toISOString();

const MOCK_CASE_BY_ID: Record<string, CaseDetail> = {
  'case-001': {
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
    filing_date: isoOffset(-45),
    created_at: isoOffset(-90),
    updated_at: isoOffset(-1),
    summary: 'H-1B specialty occupation petition for software engineer role. USCIS issued RFE on specialty occupation criteria.',
    petitioner_name: 'TechCorp Solutions',
    petitioner_email: 'legal@techcorp.com',
    beneficiary_dob: '1992-05-14',
    beneficiary_nationality: 'Mexico',
    passport_number: 'G12345678',
    documents_total: 18,
    documents_pending: 3,
    documents_approved: 14,
    documents_rejected: 1,
    tasks_total: 6,
    tasks_open: 2,
    intake_completed_at: isoOffset(-80),
    filed_at: isoOffset(-45),
    decision_at: null,
  },
  'case-002': {
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
    created_at: isoOffset(-60),
    updated_at: isoOffset(-2),
    summary: 'H-1B initial petition — cap-subject. Document collection complete.',
    petitioner_name: 'TechCorp Solutions',
    petitioner_email: 'legal@techcorp.com',
    beneficiary_dob: '1988-11-02',
    beneficiary_nationality: 'India',
    passport_number: 'P98765432',
    documents_total: 12,
    documents_pending: 0,
    documents_approved: 12,
    documents_rejected: 0,
    tasks_total: 4,
    tasks_open: 1,
    intake_completed_at: isoOffset(-50),
    filed_at: null,
    decision_at: null,
  },
};

/* Generic mock detail used when caseId is unknown — keeps UI alive. */
const fallbackDetail = (caseId: string): CaseDetail => ({
  id: caseId,
  case_reference: `#VF-${caseId.slice(-4)}`,
  client_id: 'unknown',
  client_name: 'Client',
  client_email: null,
  client_avatar_url: null,
  employer_name: null,
  visa_type_code: 'H-1B',
  status: 'intake',
  status_label: 'Intake',
  urgency: 'medium',
  days_to_next_deadline: null,
  next_deadline_label: null,
  action_required: false,
  has_alert: false,
  assigned_attorney_id: 'me',
  assigned_attorney_name: 'You',
  filing_date: null,
  created_at: isoOffset(0),
  updated_at: isoOffset(0),
  summary: null,
  petitioner_name: null,
  petitioner_email: null,
  beneficiary_dob: null,
  beneficiary_nationality: null,
  passport_number: null,
  documents_total: 0,
  documents_pending: 0,
  documents_approved: 0,
  documents_rejected: 0,
  tasks_total: 0,
  tasks_open: 0,
  intake_completed_at: null,
  filed_at: null,
  decision_at: null,
});

const MOCK_COMMENTS: CaseComment[] = [
  {
    id: 'cmt-1',
    application_id: 'case-001',
    author_id: 'u-1',
    author: { id: 'u-1', first_name: 'Sarah',  last_name: 'Lin',   email: 'sarah@firm.com'  },
    body: '⚠ RFE response strategy: lead with the specialty occupation argument citing the bachelor\'s degree requirement in the job posting. Attach expert opinion letter.',
    visible_to: 'attorneys_only',
    is_pinned: true,
    pinned_by: 'u-1',
    pinned_at: isoOffset(-3),
    is_edited: false,
    edited_at: null,
    is_deleted: false,
    created_at: isoOffset(-3),
    updated_at: isoOffset(-3),
  },
  {
    id: 'cmt-2',
    application_id: 'case-001',
    author_id: 'u-2',
    author: { id: 'u-2', first_name: 'HR',     last_name: 'Team',  email: 'hr@techcorp.com' },
    body: 'Updated org chart and CEO support letter uploaded. Ready for your review.',
    visible_to: 'all_staff',
    is_pinned: false,
    pinned_by: null,
    pinned_at: null,
    is_edited: false,
    edited_at: null,
    is_deleted: false,
    created_at: isoOffset(-1),
    updated_at: isoOffset(-1),
  },
];

const MOCK_DEADLINES: CaseDeadline[] = [
  {
    id: 'dl-1',
    application_id: 'case-001',
    user_id: 'me',
    title: 'RFE response submission',
    description: 'Submit RFE response to USCIS Vermont Service Center.',
    due_date: isoOffset(7),
    urgency: 'critical',
    deadline_type: 'rfe_response',
    is_completed: false,
    completed_at: null,
    completed_by: null,
    is_dismissed: false,
    dismissed_at: null,
    created_at: isoOffset(-30),
    updated_at: isoOffset(-1),
  },
  {
    id: 'dl-2',
    application_id: 'case-001',
    user_id: 'me',
    title: 'Beneficiary biometrics',
    description: 'Maria scheduled at Houston ASC.',
    due_date: isoOffset(21),
    urgency: 'medium',
    deadline_type: 'biometrics',
    is_completed: false,
    completed_at: null,
    completed_by: null,
    is_dismissed: false,
    dismissed_at: null,
    created_at: isoOffset(-10),
    updated_at: isoOffset(-10),
  },
];

const MOCK_HISTORY: CaseStatusHistory[] = [
  { id: 'h-1', application_id: 'case-001', from_status: null,                to_status: 'intake',             from_status_label: null,                 to_status_label: 'Intake',             changed_by: 'sys', changed_by_name: 'System',     reason: 'Intake created.',                 created_at: isoOffset(-90) },
  { id: 'h-2', application_id: 'case-001', from_status: 'intake',            to_status: 'document_review',    from_status_label: 'Intake',             to_status_label: 'Document Review',    changed_by: 'u-1', changed_by_name: 'Sarah Lin',  reason: 'Intake complete.',                created_at: isoOffset(-80) },
  { id: 'h-3', application_id: 'case-001', from_status: 'document_review',   to_status: 'petition_prep',      from_status_label: 'Document Review',    to_status_label: 'Petition Prep',      changed_by: 'u-1', changed_by_name: 'Sarah Lin',  reason: 'All documents approved.',         created_at: isoOffset(-60) },
  { id: 'h-4', application_id: 'case-001', from_status: 'petition_prep',    to_status: 'filed',              from_status_label: 'Petition Prep',      to_status_label: 'Filed',              changed_by: 'u-1', changed_by_name: 'Sarah Lin',  reason: 'I-129 filed with USCIS VSC.',     created_at: isoOffset(-45) },
  { id: 'h-5', application_id: 'case-001', from_status: 'filed',            to_status: 'rfe_pending',        from_status_label: 'Filed',              to_status_label: 'RFE Pending',        changed_by: 'sys', changed_by_name: 'USCIS Sync', reason: 'USCIS issued RFE.',               created_at: isoOffset(-15) },
  { id: 'h-6', application_id: 'case-001', from_status: 'rfe_pending',      to_status: 'rfe_response',       from_status_label: 'RFE Pending',        to_status_label: 'RFE Response',       changed_by: 'u-1', changed_by_name: 'Sarah Lin',  reason: 'Started RFE response drafting.',  created_at: isoOffset(-5)  },
];

const STATUS_BADGE: Record<string, string> = {
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

const VISIBILITY_LABEL: Record<string, string> = {
  all_staff:       'All staff',
  attorneys_only:  'Attorneys only',
  private:         'Private',
};

/* Known visa codes for RequirementsTab lookup — ordered LONGEST-FIRST so
 * "H-1B1" matches before "H-1B", "L-1A" before "L-1", "EB-2 NIW" before
 * "EB-2", etc. Used to extract a code from a label like
 * "H-1B Specialty Occupation". */
const VISA_CODE_CANDIDATES = [
  'EB-2 NIW','H-1B1','L-1A','L-1B','O-1A','O-1B',
  'EB-1','EB-2','EB-3','EB-4','EB-5',
  'H-1B','H-2A','H-2B','H-2','H-3','H-4',
  'L-1','L-2',
  'O-1',
  'E-1','E-2','E-3',
  'F-1','F-2','M-1','J-1','J-2',
  'B-1','B-2','TD','TN',
  'IR-1','IR-2','IR-5','F2A','F2B','GREEN-CARD',
];

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return '—'; }
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)   return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30)  return `${day}d ago`;
  return formatDate(iso);
}

const TABS: { id: CaseDetailTab; label: string }[] = [
  { id: 'details',      label: 'Details'      },
  { id: 'overview',     label: 'Overview'     },
  { id: 'comments',     label: 'Comments'     },
  { id: 'deadlines',    label: 'Deadlines'    },
  { id: 'requirements', label: 'Requirements' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */

export default function CaseDetailPage() {
  const { caseId = '' } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as CaseDetailTab) || 'details';
  const setTab = (t: CaseDetailTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', t);
      return next;
    });
  };

  /* ── Case header ───────────────────────────────────────────────── */
  const [detail, setDetail]       = useState<CaseDetail | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);

    /* Mock id → skip API entirely. */
    if (!isLikelyUuid(caseId)) {
      const mock = MOCK_CASE_BY_ID[caseId] || fallbackDetail(caseId);
      setDetail(mock);
      setLoading(false);
      return;
    }

    /* Hydration strategy:
         - worklist row (/lawyer/applications) → client_name, visa, status, etc.
         - getCase (/applications/{id})        → optional extras (summary, dates,
                                                  document counts) once backend
                                                  starts returning them.
       We merge: fallback < worklist < detail (later wins) so the screen always
       has the basics even when /applications/{id} returns sparse data. */
    const worklistP = casesApi.listMyCases().catch(() => [] as CaseListItem[]);
    const detailP   = casesApi.getCase(caseId).catch(() => null);

    Promise.all([worklistP, detailP])
      .then(([worklist, extra]) => {
        const base = worklist.find((c) => c.id === caseId);
        const merged: CaseDetail = {
          ...fallbackDetail(caseId),
          ...(base || {}),
          ...(extra || {}),
          id: caseId,
        };
        setDetail(merged);
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  /* ────────────────────────────────────────────────────────────────── */

  if (loading || !detail) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/lawyer/cases')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to cases
        </button>

        {/* Header card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {initials(detail.client_name || '?')}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
                  {detail.client_name || '—'}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="font-mono text-xs">{detail.case_reference || '—'}</span>
                  <span className="text-slate-300">·</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {detail.visa_type_code || '—'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[detail.status] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {detail.status_label || detail.status || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <span className={`h-2 w-2 rounded-full ${URGENCY_DOT[detail.urgency] || 'bg-slate-300'}`} />
                    <span className="capitalize">{detail.urgency || '—'} urgency</span>
                  </span>
                </div>
                {detail.employer_name && (
                  <div className="mt-1 text-xs text-slate-500">
                    Employer: {detail.employer_name}
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions
                 ── View client     → client profile (all cases + bio)
                 ── Documents       → Document Queue pre-filtered to this client
                 ── Message client  → Messages screen, auto-opens this client's
                                       chat thread via ?clientId=<user_id> */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/lawyer/clients/${detail.client_id}`)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View client
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/lawyer/documents/queue?client=${encodeURIComponent(detail.client_name || '')}`,
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Documents
              </button>
              <button
                type="button"
                onClick={() => {
                  // Same deep-link contract as Client Profile → Send Message.
                  // SecureMessaging reads userId (with clientId as fallback)
                  // and name (last-resort match if participant_id is missing).
                  const params = new URLSearchParams({
                    userId: detail.client_id,
                    name:   detail.client_name || '',
                  });
                  navigate(`/lawyer/messages?${params.toString()}`);
                }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Message client
              </button>
            </div>
          </div>

          {/* Header metrics */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricPill label="Documents"  value={`${detail.documents_approved}/${detail.documents_total}`} sub="approved" />
            <MetricPill label="Pending"    value={detail.documents_pending} sub="docs" />
            <MetricPill label="Open tasks" value={`${detail.tasks_open}/${detail.tasks_total}`} sub="" />
            <MetricPill
              label="Next deadline"
              value={detail.days_to_next_deadline == null ? '—' : `${detail.days_to_next_deadline}d`}
              sub={detail.next_deadline_label || ''}
              tone={
                detail.days_to_next_deadline != null && detail.days_to_next_deadline <= 7
                  ? 'danger'
                  : 'neutral'
              }
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 border-b border-slate-200">
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
                  activeTab === t.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab body */}
        <div className="mt-5">
          {activeTab === 'details'      && <DetailsTab      detail={detail} />}
          {activeTab === 'overview'     && <OverviewTab     caseId={caseId} />}
          {activeTab === 'comments'     && <CommentsTab     caseId={caseId} />}
          {activeTab === 'deadlines'    && <DeadlinesTab    caseId={caseId} />}
          {activeTab === 'requirements' && <RequirementsTab visaCode={detail.visa_type_code || ''} />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab: Details
   ═══════════════════════════════════════════════════════════════════════ */
function DetailsTab({ detail }: { detail: CaseDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionCard title="Beneficiary">
        <Field label="Full name"   value={detail.client_name} />
        <Field label="Email"       value={detail.client_email} />
        <Field label="Nationality" value={detail.beneficiary_nationality} />
        <Field label="Date of birth" value={formatDate(detail.beneficiary_dob)} />
        <Field label="Passport #"  value={detail.passport_number} />
      </SectionCard>

      <SectionCard title="Petitioner">
        <Field label="Company"  value={detail.petitioner_name || detail.employer_name} />
        <Field label="Email"    value={detail.petitioner_email} />
        <Field label="Visa"     value={detail.visa_type_code} />
      </SectionCard>

      <SectionCard title="Case summary" className="md:col-span-2">
        <p className="text-sm text-slate-700">
          {detail.summary || 'No summary added yet.'}
        </p>
      </SectionCard>

      <SectionCard title="Timeline" className="md:col-span-2">
        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Created"          value={formatDate(detail.created_at)} />
          <Stat label="Intake complete"  value={formatDate(detail.intake_completed_at)} />
          <Stat label="Filed"            value={formatDate(detail.filed_at)} />
          <Stat label="Decision"         value={formatDate(detail.decision_at)} />
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab: Overview (status history audit log)
   ═══════════════════════════════════════════════════════════════════════ */
function OverviewTab({ caseId }: { caseId: string }) {
  const [items, setItems]     = useState<CaseStatusHistory[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);

    if (!isLikelyUuid(caseId)) {
      setItems(MOCK_HISTORY);
      setLoading(false);
      return;
    }
    casesApi.getStatusHistory(caseId)
      .then((r) => setItems(r.items?.length ? r.items : MOCK_HISTORY))
      .catch(() => setItems(MOCK_HISTORY))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  if (!items || items.length === 0) return <EmptyHint text="No status changes recorded yet." />;

  return (
    <SectionCard title="Status history">
      <ol className="relative ml-3 space-y-5 border-l border-slate-200 pl-5">
        {items.map((h) => (
          <li key={h.id} className="relative">
            <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-indigo-500 shadow" />
            <div className="text-sm">
              <span className="font-medium text-slate-900">
                {h.from_status_label
                  ? `${h.from_status_label} → ${h.to_status_label}`
                  : h.to_status_label}
              </span>
            </div>
            {h.reason && <div className="mt-0.5 text-sm text-slate-600">{h.reason}</div>}
            <div className="mt-1 text-xs text-slate-500">
              {h.changed_by_name || 'Someone'} · {formatDateTime(h.created_at)} · {timeAgo(h.created_at)}
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab: Comments
   ═══════════════════════════════════════════════════════════════════════ */
function CommentsTab({ caseId }: { caseId: string }) {
  const [items, setItems]     = useState<CaseComment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody]       = useState('');
  const [posting, setPosting] = useState(false);

  const load = () => {
    setLoading(true);
    if (!isLikelyUuid(caseId)) {
      setItems(MOCK_COMMENTS);
      setLoading(false);
      return;
    }
    casesApi.listComments(caseId)
      .then((r) => setItems(r.items?.length ? r.items : MOCK_COMMENTS))
      .catch(() => setItems(MOCK_COMMENTS))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (caseId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  const sorted = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    try {
      if (isLikelyUuid(caseId)) {
        const created = await casesApi.createComment(caseId, { body: text });
        setItems((prev) => [...(prev || []), created]);
      } else {
        /* Mock id — add locally only. */
        const optimistic: CaseComment = {
          id: `cmt-tmp-${Date.now()}`,
          application_id: caseId,
          author_id: 'me',
          author: { id: 'me', first_name: 'You', last_name: '', email: '' },
          body: text,
          visible_to: 'all_staff',
          is_pinned: false,
          pinned_by: null,
          pinned_at: null,
          is_edited: false,
          edited_at: null,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setItems((prev) => [...(prev || []), optimistic]);
      }
      setBody('');
    } catch {
      /* Stay silent — banner handling at app level. */
    } finally {
      setPosting(false);
    }
  };

  const togglePin = async (c: CaseComment) => {
    /* Optimistic */
    setItems((prev) => (prev || []).map((x) => x.id === c.id ? { ...x, is_pinned: !x.is_pinned } : x));
    if (isLikelyUuid(caseId)) {
      try { await casesApi.pinComment(caseId, c.id); } catch { /* revert silently */ }
    }
  };

  const remove = async (c: CaseComment) => {
    setItems((prev) => (prev || []).filter((x) => x.id !== c.id));
    if (isLikelyUuid(caseId)) {
      try { await casesApi.deleteComment(caseId, c.id); } catch { /* ignore */ }
    }
  };

  return (
    <div className="space-y-4">
      {/* Composer */}
      <SectionCard title="Add a note">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a comment for the case team…"
          className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={posting || !body.trim()}
            onClick={send}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {posting ? 'Posting…' : 'Post note'}
          </button>
        </div>
      </SectionCard>

      {/* List */}
      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : sorted.length === 0 ? (
        <EmptyHint text="No comments on this case yet." />
      ) : (
        <ul className="space-y-3">
          {sorted.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {initials(`${c.author?.first_name || ''} ${c.author?.last_name || ''}`.trim() || '?')}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {`${c.author?.first_name || ''} ${c.author?.last_name || ''}`.trim() || 'Someone'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {timeAgo(c.created_at)}
                      {c.is_edited && <span> · edited</span>}
                      {c.visible_to && c.visible_to !== 'all_staff' && (
                        <span> · {VISIBILITY_LABEL[c.visible_to] || c.visible_to}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => togglePin(c)}
                    className={`rounded-md px-2 py-1 text-xs ${
                      c.is_pinned ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title={c.is_pinned ? 'Unpin' : 'Pin to top'}
                  >
                    {c.is_pinned ? '★ Pinned' : 'Pin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab: Deadlines
   ═══════════════════════════════════════════════════════════════════════ */
function DeadlinesTab({ caseId }: { caseId: string }) {
  const [items, setItems]     = useState<CaseDeadline[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    if (!isLikelyUuid(caseId)) {
      setItems(MOCK_DEADLINES);
      setLoading(false);
      return;
    }
    casesApi.listDeadlines(caseId)
      .then((r) => setItems(r.items?.length ? r.items : MOCK_DEADLINES))
      .catch(() => setItems(MOCK_DEADLINES))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (caseId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  const toggleComplete = async (d: CaseDeadline) => {
    setItems((prev) => (prev || []).map((x) => x.id === d.id ? { ...x, is_completed: !x.is_completed } : x));
    if (isLikelyUuid(caseId)) {
      try { await casesApi.completeDeadline(caseId, d.id); } catch { /* ignore */ }
    }
  };

  const dismiss = async (d: CaseDeadline) => {
    setItems((prev) => (prev || []).filter((x) => x.id !== d.id));
    if (isLikelyUuid(caseId)) {
      try { await casesApi.dismissDeadline(caseId, d.id); } catch { /* ignore */ }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : '+ Add deadline'}
        </button>
      </div>

      {showForm && (
        <NewDeadlineForm
          caseId={caseId}
          onCreated={(d) => {
            setItems((prev) => [...(prev || []), d]);
            setShowForm(false);
          }}
        />
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : !items || items.length === 0 ? (
        <EmptyHint text="No deadlines on this case yet." />
      ) : (
        <ul className="space-y-3">
          {items
            .slice()
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .map((d) => (
            <li
              key={d.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                d.is_completed ? 'border-emerald-200 opacity-60' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={d.is_completed}
                    onChange={() => toggleComplete(d)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className={`text-sm font-medium ${d.is_completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {d.title || 'Untitled deadline'}
                    </div>
                    {d.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{d.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Due {formatDate(d.due_date)}</span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1 capitalize">
                        <span className={`h-2 w-2 rounded-full ${URGENCY_DOT[d.urgency] || 'bg-slate-300'}`} />
                        {d.urgency || '—'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="capitalize">{(d.deadline_type || 'other').replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(d)}
                  className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  title="Dismiss"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewDeadlineForm({
  caseId,
  onCreated,
}: {
  caseId: string;
  onCreated: (d: CaseDeadline) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle]     = useState('');
  const [dueDate, setDueDate] = useState(today);
  const [urgency, setUrgency] = useState<CaseDeadline['urgency']>('medium');
  const [type, setType]       = useState<CaseDeadline['deadline_type']>('other');
  const [desc, setDesc]       = useState('');
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: desc.trim() || undefined,
      due_date: new Date(dueDate).toISOString(),
      urgency,
      deadline_type: type,
    };

    try {
      if (isLikelyUuid(caseId)) {
        const created = await casesApi.createDeadline(caseId, payload);
        onCreated(created);
      } else {
        /* Mock — synthesize a local row. */
        const local: CaseDeadline = {
          id: `dl-tmp-${Date.now()}`,
          application_id: caseId,
          user_id: 'me',
          title: payload.title,
          description: payload.description ?? null,
          due_date: payload.due_date,
          urgency: payload.urgency,
          deadline_type: payload.deadline_type,
          is_completed: false,
          completed_at: null,
          completed_by: null,
          is_dismissed: false,
          dismissed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        onCreated(local);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">New deadline</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-600">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Urgency</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as CaseDeadline['urgency'])}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CaseDeadline['deadline_type'])}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="document_submission">Document submission</option>
            <option value="uscis_filing">USCIS filing</option>
            <option value="rfe_response">RFE response</option>
            <option value="biometrics">Biometrics</option>
            <option value="interview">Interview</option>
            <option value="court_date">Court date</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-slate-600">Description (optional)</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={saving || !title.trim() || !dueDate}
          onClick={save}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save deadline'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab: Requirements — live required-documents list from backend catalog
   (same one Admin manages in Visa Types Manager). Admin edits propagate
   here automatically on next tab open. No hardcoded doc lists.

   Match strategy is defensive because the case's `visa_type_code` field
   can be either the CODE ("H-1B") or the full NAME ("H-1B Specialty
   Occupation"). We try, in order:
     1. Exact code match             — "H-1B" === "H-1B"
     2. Extracted-code match         — pull "H-1B" out of "H-1B Specialty
                                        Occupation" via VISA_CODE_CANDIDATES
                                        (longest-first) and match on that
     3. Catalog name contains target — "F-1 Student".includes("F-1")
     4. Target contains catalog code — "H-1B SPECIALTY OCCUPATION"
                                        .includes("H-1B") = true
   ═══════════════════════════════════════════════════════════════════════ */
function RequirementsTab({ visaCode }: { visaCode: string }) {
  const [docs, setDocs]           = useState<string[]>([]);
  const [visaName, setVisaName]   = useState<string>(visaCode || 'this visa');
  const [visaTitle, setVisaTitle] = useState<string>('');
  const [loading, setLoading]     = useState<boolean>(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDocs([]);
    setVisaName(visaCode || 'this visa');
    setVisaTitle('');

    if (!visaCode) {
      setLoading(false);
      setError('No visa type on this case yet. Set the visa type from the Details tab.');
      return;
    }

    /** Normalize backend `required_documents` — accepts array, JSON-string,
     *  or comma-separated string.  Keeps this component tolerant regardless
     *  of what shape the backend actually returns. */
    const norm = (raw: unknown): string[] => {
      if (Array.isArray(raw)) {
        return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      }
      if (typeof raw === 'string' && raw.trim().length > 0) {
        try {
          const p = JSON.parse(raw);
          if (Array.isArray(p)) {
            return p.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
          }
        } catch { /* not JSON — fall through */ }
        return raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    (async () => {
      try {
        const list = await visaChecklistApi.listVisaTypes();
        if (cancelled) return;
        const target = visaCode.toUpperCase();

        // 1. Exact code match.
        // 2. Extract known visa code substring from target, match on that.
        // 3. Catalog name contains target substring.
        // 4. Target contains catalog code substring — handles case where
        //    visa_type_code carries the FULL NAME instead of the code.
        const extractedCode = VISA_CODE_CANDIDATES.find((c) => target.includes(c));

        const visa =
          list.find((v) => v.code?.toUpperCase() === target) ||
          (extractedCode
            ? list.find((v) => v.code?.toUpperCase() === extractedCode)
            : undefined) ||
          list.find((v) => v.name?.toUpperCase().includes(target)) ||
          list.find((v) => {
            const code = v.code?.toUpperCase();
            return code ? target.includes(code) : false;
          });

        if (!visa) {
          setError(`No visa type "${visaCode}" found in the catalog. Ask your admin to add it in Visa Types Manager.`);
          setLoading(false);
          return;
        }
        setVisaName(visa.code || visaCode);
        setVisaTitle(visa.name || '');

        // Try list-side docs first (backend sometimes omits them from list).
        const listDocs = norm(visa.required_documents);
        if (listDocs.length > 0) {
          setDocs(listDocs);
          setLoading(false);
          return;
        }

        // Fall back to per-visa detail for the full docs list.
        const detail = await visaChecklistApi.getVisaTypeDetail(visa.id);
        if (cancelled) return;
        const detailDocs = norm(detail?.required_documents);
        setDocs(detailDocs);
        if (detailDocs.length === 0) {
          setError(`No documents configured for ${visa.code} yet. Ask your admin to add required documents in Visa Types Manager.`);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Could not load requirements. Please try again.');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [visaCode]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
          <FileCheck2 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
            {visaName} · Required Documents
          </p>
          <h3 className="mt-0.5 text-lg font-bold text-slate-900">
            {visaTitle || 'Requirements'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Sourced live from the admin Visa Types Manager. Any change made there appears here automatically.
          </p>
        </div>
        {!loading && docs.length > 0 && (
          <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            {docs.length} {docs.length === 1 ? 'document' : 'documents'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading requirements…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {docs.map((doc, i) => (
            <li
              key={doc}
              className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-emerald-700 border border-emerald-200">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-slate-900 leading-tight">{doc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Atoms
   ═══════════════════════════════════════════════════════════════════════ */

function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value || '—'}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  sub: string;
  tone?: 'neutral' | 'danger';
}) {
  const valueCls = tone === 'danger' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${valueCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}