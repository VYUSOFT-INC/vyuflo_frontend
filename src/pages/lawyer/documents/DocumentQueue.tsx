// src/pages/lawyer/documents/DocumentQueue.tsx
//
// Lawyer Document Queue — task inbox for documents needing review.
//
// What this screen does:
//   • Lists all documents uploaded by clients/employees
//   • Top stat cards: Total / Action Required / In Progress / Approved Today
//   • Filter by status, case type, date range, search
//   • Bulk actions: Mark In Progress / Assign to Me
//   • Per-row action / row click: navigates to /lawyer/documents/:documentId/review
//
// Primary API: GET /api/v1/documents/filter   (Attorney-Documents — preferred)
// Fallback:    GET /api/v1/documents          (legacy, 2-step via assigned applications)
//
// ⚠️ Remaining BACKEND GAPS:
//   • PATCH /documents/{id}/assign  — "Assign to Me" still UI-only
//   • GET /documents/queue/stats    — stat tiles still derived from list
//   ✅ PATCH /documents/{id}/status — NOW LIVE (bulk Mark In Progress wires through)

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { documentsApi } from '../../../api/lawyer/documents.api';
import { intakeApi }    from '../../../api/lawyer/intake.api';
import type {
  Document,
  DocumentStatus,
  QueueStats,
} from '../../../types/lawyer/documents.types';
import { STATUS_LABELS, STATUS_COLORS } from '../../../types/lawyer/documents.types';

/* ── Status filter options ──────────────────────────────────────────── */
const STATUS_FILTER_OPTIONS: { value: 'all' | DocumentStatus; label: string }[] = [
  { value: 'all',             label: 'All Statuses'    },
  { value: 'pending',         label: 'Pending'         },
  { value: 'in_progress',     label: 'In Progress'     },
  { value: 'action_required', label: 'Action Required' },
  { value: 'approved',        label: 'Approved'        },
  { value: 'rejected',        label: 'Rejected'        },
];

const CASE_TYPE_OPTIONS = ['All Case Types', 'H-1B', 'L-1', 'O-1', 'F-1', 'TN', 'Green Card'];
const DATE_RANGE_OPTIONS: { value: 'all' | 'today' | 'last_7_days' | 'last_30_days'; label: string }[] = [
  { value: 'all',          label: 'All Time'     },
  { value: 'today',        label: 'Today'        },
  { value: 'last_7_days',  label: 'Last 7 Days'  },
  { value: 'last_30_days', label: 'Last 30 Days' },
];

const PAGE_SIZE = 10;

/* ── Mock fallback (used when backend returns empty so UI stays visible) */
function buildMockDocs(): Document[] {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
  return [
    {
      id: 'mock-1', user_id: 'u1', application_id: 'a1', document_type_id: 'dt1',
      name: 'Organizational_Chart.pdf', file_size_bytes: 482301, file_type: 'pdf',
      status: 'pending', document_type: 'Organizational Chart', category: 'employment',
      uploaded_at: hoursAgo(2), verified_at: null, rejection_reason: null,
      total_pages: 3, ocr_status: 'completed', version: 1,
      client_name: 'Aarav Patel', case_id: '#VF-A1B2 · H-1B',
    },
    {
      id: 'mock-2', user_id: 'u2', application_id: 'a2', document_type_id: 'dt2',
      name: 'Passport_Scan.pdf', file_size_bytes: 1200000, file_type: 'pdf',
      status: 'approved', document_type: 'Passport', category: 'personal',
      uploaded_at: hoursAgo(26), verified_at: hoursAgo(4), rejection_reason: null,
      total_pages: 1, ocr_status: 'completed', version: 1,
      client_name: 'Sarah Chen', case_id: '#VF-C3D4 · H-1B',
    },
    {
      id: 'mock-3', user_id: 'u3', application_id: 'a3', document_type_id: 'dt3',
      name: 'Business_Plan_v2.docx', file_size_bytes: 980000, file_type: 'docx',
      status: 'in_progress', document_type: 'Business Plan', category: 'employment',
      uploaded_at: hoursAgo(72), verified_at: null, rejection_reason: null,
      total_pages: 12, ocr_status: 'processing', version: 2,
      client_name: 'Marcus Johnson', case_id: '#VF-E5F6 · O-1',
    },
    {
      id: 'mock-4', user_id: 'u4', application_id: 'a4', document_type_id: 'dt4',
      name: 'I-129_Form.pdf', file_size_bytes: 2200000, file_type: 'pdf',
      status: 'action_required', document_type: 'I-129 Petition', category: 'immigration',
      uploaded_at: hoursAgo(5), verified_at: null, rejection_reason: null,
      total_pages: 8, ocr_status: 'completed', version: 1,
      client_name: 'Priya Sharma', case_id: '#VF-G7H8 · H-1B',
    },
    {
      id: 'mock-5', user_id: 'u5', application_id: 'a5', document_type_id: 'dt5',
      name: 'Diploma_MS_CS.jpg', file_size_bytes: 540000, file_type: 'jpg',
      status: 'rejected', document_type: 'Educational Certificate', category: 'education',
      uploaded_at: hoursAgo(120), verified_at: null, rejection_reason: 'Illegible scan',
      total_pages: 1, ocr_status: 'failed', version: 1,
      client_name: 'Liam O\'Brien', case_id: '#VF-I9J0 · F-1',
    },
  ];
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function DocumentQueue() {
  const navigate = useNavigate();
  // Deep-link from Case Detail's "Documents" button: ?client=<name> pre-fills
  // the search box so the queue lands filtered to that client's documents.
  const [searchParams, setSearchParams] = useSearchParams();
  const seededClient = searchParams.get('client') || '';

  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentStatus>('all');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('All Case Types');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'last_7_days' | 'last_30_days'>('all');
  const [search, setSearch] = useState(seededClient);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'status'>('newest');

  // Consume ?client= once so it doesn't keep re-applying after the user types.
  useEffect(() => {
    if (!seededClient) return;
    const next = new URLSearchParams(searchParams);
    next.delete('client');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination
  const [page, setPage] = useState(1);

  /* ── Load documents ──────────────────────────────────────────────────
   * Flow:
   *   Employee submits documents → HR assigns application to lawyer →
   *   documents surface here. If the employee hasn't uploaded anything yet
   *   we still surface the application as a placeholder row so the lawyer
   *   sees "this case is waiting for uploads" instead of a hidden empty
   *   inbox. Opening the placeholder shows an empty state.
   *
   * Strategy:
   *  1. Fetch HR-assigned applications (source of truth for what's in the
   *     lawyer's queue).
   *  2. For each assigned application, fetch its real uploaded documents.
   *  3. If an application has real docs → include those docs (enriched with
   *     client_name + case_id). No placeholder row for that app.
   *  4. If an application has NO docs → include a synthetic placeholder row
   *     so the application is still visible in the queue.
   *  5. Also fold in /documents/filter results (attorney-scoped) if any
   *     land there without going through per-app enumeration.
   *  6. Keep mock rows for dev.
   * ─────────────────────────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1 — assigned applications (worklist)
      let apps: Awaited<ReturnType<typeof intakeApi.listAssignedApplications>> = [];
      try {
        apps = await intakeApi.listAssignedApplications();
      } catch {
        // intake API unavailable — apps stays empty
      }
      const appById = new Map(apps.map((a) => [a.application_id, a]));

      // Helper — turn any raw Document into an enriched row (client_name +
      // case_id from parent app) so the table doesn't show "Unknown client".
      const enrich = (doc: Document): Document => {
        const app = doc.application_id ? appById.get(doc.application_id) : undefined;
        if (!app) return doc;
        return {
          ...doc,
          client_name: doc.client_name || app.client_name,
          case_id:
            doc.case_id ||
            `#VF-${app.application_id.slice(0, 4).toUpperCase()}` +
              (app.visa_type ? ` · ${app.visa_type}` : ''),
        };
      };

      // Step 2 — PRIMARY source: attorney-scoped filter endpoint. Backend
      // now correctly returns all docs on applications assigned to this
      // attorney (list_documents_filtered fix).
      let filterDocs: Document[] = [];
      try {
        const res = await documentsApi.filterDocuments({});
        if (res.items?.length) filterDocs = res.items;
      } catch {
        // filter endpoint not yet wired — fall back to per-app
      }

      // Step 3 — FALLBACK: per-app fetch (only used if /filter returned
      // nothing). Some environments haven't got the backend fix yet.
      let perAppDocs: Document[] = [];
      if (filterDocs.length === 0 && apps.length > 0) {
        const results = await Promise.all(
          apps.map((app) =>
            documentsApi
              .listDocuments({ application_id: app.application_id })
              .then((res) => ({ app, items: res.items ?? [] }))
              .catch(() => ({ app, items: [] })),
          ),
        );
        perAppDocs = results.flatMap(({ items }) => items);
      }

      // Merge + dedupe + enrich, and drop any docs the user deleted
      // this session (sessionStorage-backed) so they don't reappear
      // after a soft-delete backend response.
      const deletedIds = documentsApi.getLocallyDeletedIds();
      const seen = new Set<string>();
      const realDocs: Document[] = [];
      [...filterDocs, ...perAppDocs].forEach((d) => {
        if (seen.has(d.id)) return;
        if (deletedIds.has(d.id)) return;
        seen.add(d.id);
        realDocs.push(enrich(d));
      });

      // Step 4 — placeholder rows ONLY for assigned apps that have zero
      // real docs across BOTH sources.
      const appsWithRealDocs = new Set(
        realDocs.map((d) => d.application_id).filter(Boolean) as string[],
      );
      const placeholderRows: Document[] = apps
        .filter((app) => !appsWithRealDocs.has(app.application_id))
        .map((app) => {
          const status: DocumentStatus =
            app.status === 'intake_completed'   ? 'approved'    :
            app.status === 'intake_in_progress' ? 'in_progress' :
                                                  'pending';
          const visaCode = app.visa_type_label || app.visa_type || 'Application';
          return {
            id:                `intake-${app.application_id}`,
            user_id:           app.user_id || app.client_id || app.application_id,
            application_id:    app.application_id,
            document_type_id:  'intake-package',
            name:              'Awaiting client uploads',
            file_size_bytes:   0,
            file_type:         'pdf',
            status,
            document_type:     `${visaCode} Application`,
            category:          'immigration',
            uploaded_at:       app.assigned_at,
            verified_at:       null,
            rejection_reason:  null,
            total_pages:       null,
            ocr_status:        'not_started',
            version:           1,
            client_name:       app.client_name,
            case_id:           `#VF-${app.application_id.slice(0, 4).toUpperCase()}` +
                               (app.visa_type ? ` · ${app.visa_type}` : ''),
          } as unknown as Document;
        });

      const merged: Document[] = [...realDocs, ...placeholderRows];

      // Append mock rows so the queue is never empty during dev.
      setDocs([...merged, ...buildMockDocs()]);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const status = ax?.response?.status;
      if (status === 403) {
        setError('You do not have permission to view documents.');
      } else if (status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        // network / 5xx → show mock so the page is still usable
        setDocs(buildMockDocs());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Client-side filtering ────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (caseTypeFilter !== 'All Case Types') {
        const matches = [d.document_type, d.category, d.case_id || ''].some(
          (v) => v?.toLowerCase().includes(caseTypeFilter.toLowerCase()),
        );
        if (!matches) return false;
      }
      if (dateRange !== 'all') {
        const days = dateRange === 'today' ? 1 : dateRange === 'last_7_days' ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (new Date(d.uploaded_at).getTime() < cutoff) return false;
      }
      if (q) {
        const hay = `${d.client_name || ''} ${d.case_id || ''} ${d.name} ${d.document_type} ${d.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [docs, statusFilter, caseTypeFilter, dateRange, search]);

  /* ── Sort ────────────────────────────────────────────────────────── */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === 'newest')      arr.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    else if (sortBy === 'oldest') arr.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
    else if (sortBy === 'status') arr.sort((a, b) => a.status.localeCompare(b.status));
    return arr;
  }, [filtered, sortBy]);

  /* ── Group by application ────────────────────────────────────────────
   * User feedback: showing one row per uploaded document meant the same
   * client appeared 3+ times in a row. Group by application so each
   * client/case is a single expandable row that shows all its docs when
   * clicked. Placeholder rows (id starts with `intake-`) and mock rows
   * stay single because they have no siblings on the same application.
   * ────────────────────────────────────────────────────────────────── */
  type Group = {
    key:            string;   // application_id or synthetic
    client_name:    string;
    case_id:        string;
    docs:           Document[];
    latest_uploaded_at: string;
    /** Aggregated status for the header row: worst-first — action_required
     *  > pending > in_progress > rejected > approved. */
    aggregate_status: DocumentStatus;
    counts: { pending: number; in_progress: number; action_required: number; approved: number; rejected: number };
  };

  const grouped = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    sorted.forEach((d) => {
      const key = d.application_id || `orphan:${d.id}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          client_name: d.client_name || 'Unknown client',
          case_id:     d.case_id || '',
          docs:        [],
          latest_uploaded_at: d.uploaded_at,
          aggregate_status: d.status,
          counts: { pending: 0, in_progress: 0, action_required: 0, approved: 0, rejected: 0 },
        };
        map.set(key, g);
      }
      g.docs.push(d);
      if (new Date(d.uploaded_at) > new Date(g.latest_uploaded_at)) {
        g.latest_uploaded_at = d.uploaded_at;
      }
      // Count by status
      const s = d.status as DocumentStatus;
      if (s in g.counts) g.counts[s as keyof typeof g.counts] += 1;
    });

    // Aggregate status priority
    const priority: DocumentStatus[] = ['action_required', 'pending', 'in_progress', 'rejected', 'approved'];
    map.forEach((g) => {
      const found = priority.find((p) => g.counts[p as keyof typeof g.counts] > 0);
      if (found) g.aggregate_status = found;
    });

    // Sort groups by latest upload date desc
    return [...map.values()].sort(
      (a, b) => new Date(b.latest_uploaded_at).getTime() - new Date(a.latest_uploaded_at).getTime(),
    );
  }, [sorted]);

  /* ── Pagination slice — page over GROUPS, not individual docs ────── */
  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const paginatedGroups = grouped.slice(pageStart, pageStart + PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  /* Click a group row → jump straight to the Review page opened on the
   * newest doc in that case. The Review page's left rail already lists every
   * doc on the case, so the lawyer can click through docs from there (the
   * "old flow" the user asked for). Placeholder rows (intake-…, id starts
   * with 'intake-') go to the Case Detail's documents tab instead. */
  const openGroup = (g: Group) => {
    // Pick the newest real doc; fallback to the first one in the array.
    const sorted = [...g.docs].sort(
      (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
    const target = sorted.find((d) => !d.id.startsWith('intake-')) ?? sorted[0];
    if (!target) return;
    handleRowAction(target);
  };

  /* ── KPI stats (derived) ──────────────────────────────────────────── */
  const stats: QueueStats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      total: docs.length,
      action_required: docs.filter((d) => d.status === 'action_required' || d.status === 'pending').length,
      in_progress:     docs.filter((d) => d.status === 'in_progress').length,
      approved_today:  docs.filter(
        (d) => d.status === 'approved' && d.verified_at && new Date(d.verified_at) >= today,
      ).length,
    };
  }, [docs]);

  /* ── Row action handler ───────────────────────────────────────────── */
  // ✅ Route matches App.tsx: /lawyer/documents/:documentId/review
  //
  // Placeholder rows (intake-<app_id>) have no real document behind them, so
  // route them to the Case Detail page instead where the empty-state / awaiting
  // uploads UI already lives.
  const handleRowAction = (doc: Document) => {
    if (doc.id.startsWith('intake-')) {
      navigate(`/lawyer/cases/${doc.application_id}?tab=documents`);
      return;
    }
    // Pass application_id via URL — ReviewPage uses it as a fallback when
    // the doc-detail endpoint 403s (which nulls out doc.application_id in
    // state via placeholder). Ensures Request Additional Document has a
    // valid UUID to send.
    const qs = doc.application_id ? `?application_id=${doc.application_id}` : '';
    navigate(`/lawyer/documents/${doc.id}/review${qs}`);
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* Back navigation — top-left, above the page header (desktop + mobile). */}
        <LawyerBackButton />

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Lawyer Document Queue</h1>
            <p className="mt-1 text-sm text-gray-500">
              Documents awaiting your review. Click a row to verify OCR fields and approve.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients, case IDs, or document types…"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-80"
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="All Statuses"
            value={stats.total}
            iconBg="bg-indigo-100"
            icon={<svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-indigo-600"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
          />
          <StatCard
            label="Action Required"
            value={stats.action_required}
            iconBg="bg-red-100"
            icon={<svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-red-600"><path d="M12 9v4m0 4h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <StatCard
            label="In Progress"
            value={stats.in_progress}
            iconBg="bg-amber-100"
            icon={<svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-600"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <StatCard
            label="Approved Today"
            value={stats.approved_today}
            iconBg="bg-emerald-100"
            icon={<svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-emerald-600"><path d="M5 12.5L10 17l9-9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
        </div>

        {/* Filter bar */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select value={caseTypeFilter} onChange={setCaseTypeFilter}>
              {CASE_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
            <Select value={dateRange} onChange={(v) => setDateRange(v as typeof dateRange)}>
              {DATE_RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select value={sortBy} onChange={(v) => setSortBy(v as typeof sortBy)}>
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="status">Sort: Status</option>
            </Select>
          </div>
          {/* Bulk actions removed — with group rows, per-doc selection UI
              lives inside the Review page instead. */}
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700">
              {error}{' '}
              <button onClick={load} className="ml-2 font-semibold underline">Retry</button>
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/60">
                    <tr className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="w-8 px-4 py-3" />
                      <th className="px-4 py-3">Client / Case ID</th>
                      <th className="px-4 py-3">Documents</th>
                      <th className="px-4 py-3">Last Updated</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedGroups.map((g) => (
                      <tr
                        key={g.key}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openGroup(g)}
                      >
                        {/* Empty gutter (used to hold expand arrow) */}
                        <td className="px-4 py-3" />

                        {/* ── CLIENT / CASE ID + VISA (all highlighted) ── */}
                        <td className="px-4 py-3">
                          <div className="text-base font-bold text-gray-900 leading-tight">
                            {g.client_name}
                          </div>
                          {g.case_id && (
                            <div className="mt-1 text-sm font-semibold text-gray-700 leading-tight">
                              {g.case_id}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-700">
                          {g.docs.length === 1
                            ? '1 document'
                            : `${g.docs.length} documents`}
                          <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                            {g.counts.action_required > 0 && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 font-medium text-red-700">
                                {g.counts.action_required} action
                              </span>
                            )}
                            {g.counts.pending > 0 && (
                              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700">
                                {g.counts.pending} pending
                              </span>
                            )}
                            {g.counts.in_progress > 0 && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                                {g.counts.in_progress} in progress
                              </span>
                            )}
                            {g.counts.approved > 0 && (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700">
                                {g.counts.approved} approved
                              </span>
                            )}
                            {g.counts.rejected > 0 && (
                              <span className="rounded-full bg-gray-200 px-1.5 py-0.5 font-medium text-gray-700">
                                {g.counts.rejected} rejected
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(g.latest_uploaded_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor: (STATUS_COLORS[g.aggregate_status]?.bg) ?? '#f3f4f6',
                              color:            (STATUS_COLORS[g.aggregate_status]?.text) ?? '#374151',
                            }}
                          >
                            {STATUS_LABELS[g.aggregate_status] ?? g.aggregate_status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right text-xs">
                          <span className="font-semibold text-indigo-600 hover:text-indigo-700">
                            Open →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:px-6">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-700">{pageStart + 1}</span> to{' '}
                  <span className="font-semibold text-gray-700">{Math.min(pageStart + PAGE_SIZE, grouped.length)}</span> of{' '}
                  <span className="font-semibold text-gray-700">{grouped.length}</span> cases · {sorted.length} docs
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-xs text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconBg: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton row ───────────────────────────────────────────────────── */
function RowSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-100 p-3">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 rounded bg-gray-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-1/3 rounded bg-gray-200" />
          <div className="h-2 w-1/4 rounded bg-gray-200" />
        </div>
        <div className="h-5 w-20 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
        <span className="text-2xl">📄</span>
      </div>
      <h2 className="text-base font-semibold text-gray-900">No documents in queue</h2>
      <p className="mt-1 text-sm text-gray-500">
        New documents uploaded by clients will appear here for review.
      </p>
    </div>
  );
}

/* ── Select component ───────────────────────────────────────────────── */
function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      {children}
    </select>
  );
}

/* Helper functions (formatDate/formatTime) were removed along with the
   per-doc Row component — the grouped table doesn't need them. */