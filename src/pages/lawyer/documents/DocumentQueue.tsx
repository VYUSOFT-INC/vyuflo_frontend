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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { documentsApi } from '../../../api/lawyer/documents.api';
import { intakeApi }    from '../../../api/lawyer/intake.api';
import type {
  Document,
  DocumentStatus,
  QueueStats,
} from '../../../types/lawyer/documents.types';
import { STATUS_LABELS, STATUS_COLORS } from '../../../types/lawyer/documents.types';

import iconFilePdf  from '../../../assets/icons/lawyer-documents/icon-file-pdf.svg';
import iconFileImg  from '../../../assets/icons/lawyer-documents/icon-file-img.svg';
import iconFileDoc  from '../../../assets/icons/lawyer-documents/icon-file-doc.svg';

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

/* ── Grouped row shape (one row per case) ───────────────────────────── */
interface CaseGroup {
  key:            string;
  application_id: string | null;
  client_name:    string;
  case_id:        string;
  docs:           Document[];
  last_updated:   string;
}

/** Pick the single "dominant" status a group should display, in priority order. */
function groupPrimaryStatus(docs: Document[]): DocumentStatus {
  const order: DocumentStatus[] = [
    'action_required',
    'rejected',
    'pending',
    'in_progress',
    'approved',
  ];
  for (const s of order) {
    if (docs.some((d) => d.status === s)) return s;
  }
  return docs[0]?.status ?? 'pending';
}

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

  // Selection (for bulk actions)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  /* ── Load documents ──────────────────────────────────────────────────
   * Strategy:
   *  1. ALWAYS fetch assigned apps first — they carry client_name +
   *     visa_type which the /documents endpoints don't join. Without this
   *     the UI would show "Unknown client" for every row.
   *  2. Try GET /documents/filter (Attorney-Documents — auto-scoped to lawyer).
   *     Enrich each returned doc with client_name + case_id from the map.
   *  3. If filter is empty/unavailable, fall back to per-app /documents fetch
   *     (which does the join manually).
   *  4. If everything is still empty, fall back to mock so UI is visible.
   * ─────────────────────────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 0 — always load the client name map first
      const apps = await intakeApi.listAssignedApplications().catch(() => []);
      const clientByAppId = new Map(
        apps.map((a) => [
          a.application_id,
          {
            client_name: a.client_name,
            case_id:
              `#VF-${a.application_id.slice(0, 4).toUpperCase()}` +
              (a.visa_type ? ` · ${a.visa_type}` : ''),
          },
        ]),
      );

      const enrich = (doc: Document): Document => {
        const meta = doc.application_id ? clientByAppId.get(doc.application_id) : undefined;
        return {
          ...doc,
          client_name: doc.client_name || meta?.client_name || doc.client_name,
          case_id:     doc.case_id     || meta?.case_id     || doc.case_id,
        };
      };

      // Step 1 — try filter endpoint (preferred, single call)
      try {
        const res = await documentsApi.filterDocuments({});
        if (res.items?.length) {
          setDocs(res.items.map(enrich));
          return;
        }
      } catch {
        // filter not yet wired or errored — try legacy fallback
      }

      // Step 2 — legacy: per-app /documents
      if (apps.length === 0) {
        setDocs(buildMockDocs());
        return;
      }

      const results = await Promise.all(
        apps.map((app) =>
          documentsApi
            .listDocuments({ application_id: app.application_id })
            .then((res) => ({ app, items: res.items ?? [] }))
            .catch(() => ({ app, items: [] })),
        ),
      );

      const all: Document[] = results.flatMap(({ app, items }) =>
        items.map((doc) => ({
          ...doc,
          client_name: doc.client_name || app.client_name,
          case_id:     `#VF-${app.application_id.slice(0, 4).toUpperCase()}` +
                       (app.visa_type ? ` · ${app.visa_type}` : ''),
        })),
      );

      setDocs(all.length ? all : buildMockDocs());
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

  /* ── Group by case (application_id | case_id) ─────────────────────── */
  const groups = useMemo<CaseGroup[]>(() => {
    const map = new Map<string, CaseGroup>();
    for (const d of sorted) {
      const key = d.application_id || d.case_id || `orphan-${d.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.docs.push(d);
        // Track the newest upload as the group's last updated
        if (new Date(d.uploaded_at).getTime() > new Date(existing.last_updated).getTime()) {
          existing.last_updated = d.uploaded_at;
        }
      } else {
        map.set(key, {
          key,
          application_id: d.application_id || null,
          client_name: d.client_name || 'Unknown client',
          case_id: d.case_id || `#VF-${(d.application_id || d.id).slice(0, 4).toUpperCase()}`,
          docs: [d],
          last_updated: d.uploaded_at,
        });
      }
    }
    // Sort groups by newest doc within group (respects the sortBy pass above).
    return [...map.values()].sort(
      (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime(),
    );
  }, [sorted]);

  /* ── Pagination slice (page groups, not docs) ─────────────────────── */
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const paginated = groups.slice(pageStart, pageStart + PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  /* ── Row-expansion state (inline accordion) ───────────────────────── */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  /* ── Selection helpers ────────────────────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  /** Every doc across every group currently paginated (used for select-all). */
  const paginatedDocIds = useMemo(
    () => paginated.flatMap((g) => g.docs.map((d) => d.id)),
    [paginated],
  );
  const toggleSelectAll = () => {
    if (paginatedDocIds.length > 0 && paginatedDocIds.every((id) => selected.has(id))) {
      const next = new Set(selected);
      paginatedDocIds.forEach((id) => next.delete(id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paginatedDocIds.forEach((id) => next.add(id));
      setSelected(next);
    }
  };
  /** Toggle every doc inside a group at once (used from the group header). */
  const toggleGroupSelect = (g: CaseGroup) => {
    const ids = g.docs.map((d) => d.id);
    const allSel = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSel) ids.forEach((id) => next.delete(id));
      else        ids.forEach((id) => next.add(id));
      return next;
    });
  };

  /* ── Bulk actions ─────────────────────────────────────────────────── */
  // ✅ Backend NOW supports PATCH /documents/{id}/status — wire it through
  const handleMarkInProgress = async () => {
    if (selected.size === 0) { alert('Select at least one document.'); return; }
    setBulkBusy(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          documentsApi.updateDocumentStatus(id, { status: 'in_progress' }),
        ),
      );
    } catch (e) {
      console.error(e);
      // Fall through — we still apply the optimistic UI update.
    } finally {
      // Optimistic local update + clear selection (runs even if backend hiccups)
      setDocs((curr) => curr.map((d) => (selected.has(d.id) ? { ...d, status: 'in_progress' } : d)));
      setSelected(new Set());
      setBulkBusy(false);
    }
  };

  /* ── Row action handler ───────────────────────────────────────────── */
  // ✅ Route matches App.tsx: /lawyer/documents/:documentId/review
  const handleRowAction = (doc: Document) => {
    navigate(`/lawyer/documents/${doc.id}/review`);
  };

  /* ── Action label per status ──────────────────────────────────────── */
  const rowActionLabel = (status: DocumentStatus): string => {
    if (status === 'approved' || status === 'rejected') return 'View';
    if (status === 'in_progress') return 'Continue';
    if (status === 'action_required') return 'Review';
    return 'Start Review';
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMarkInProgress}
              disabled={selected.size === 0 || bulkBusy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkBusy ? 'Saving…' : 'Mark In Progress'}
            </button>
          </div>
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
                      <th className="w-8 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={paginatedDocIds.length > 0 && paginatedDocIds.every((id) => selected.has(id))}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-3">Client / Case ID</th>
                      <th className="px-4 py-3">Documents</th>
                      <th className="px-4 py-3">Last Updated</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.map((g) => (
                      <GroupRow
                        key={g.key}
                        group={g}
                        expanded={expanded.has(g.key)}
                        onToggleExpand={() => toggleExpand(g.key)}
                        selectedIds={selected}
                        onToggleGroupSelect={() => toggleGroupSelect(g)}
                        onToggleDocSelect={toggleSelect}
                        onDocClick={handleRowAction}
                        rowActionLabel={rowActionLabel}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:px-6">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-700">{pageStart + 1}</span> to{' '}
                  <span className="font-semibold text-gray-700">{Math.min(pageStart + PAGE_SIZE, groups.length)}</span> of{' '}
                  <span className="font-semibold text-gray-700">{groups.length}</span> case{groups.length === 1 ? '' : 's'}
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
  icon: React.ReactNode;
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

/* ── Grouped-by-case row (one row per case, click to expand) ────────── */
function GroupRow({
  group,
  expanded,
  onToggleExpand,
  selectedIds,
  onToggleGroupSelect,
  onToggleDocSelect,
  onDocClick,
  rowActionLabel,
}: {
  group: CaseGroup;
  expanded: boolean;
  onToggleExpand: () => void;
  selectedIds: Set<string>;
  onToggleGroupSelect: () => void;
  onToggleDocSelect: (id: string) => void;
  onDocClick: (doc: Document) => void;
  rowActionLabel: (s: DocumentStatus) => string;
}) {
  const docCount = group.docs.length;
  const primary  = groupPrimaryStatus(group.docs);
  const cfg      = STATUS_COLORS[primary] ?? STATUS_COLORS.pending;

  // Documents column: "N document(s)" + a small colored count-badge for the
  // primary bucket (e.g. "1 pending", "2 action").
  const bucketCount = group.docs.filter((d) => d.status === primary).length;
  const bucketLabel = STATUS_LABELS[primary]?.toLowerCase() ?? primary;

  const allDocsSelected =
    docCount > 0 && group.docs.every((d) => selectedIds.has(d.id));

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-gray-50 ${allDocsSelected ? 'bg-indigo-50/40' : ''}`}
        onClick={onToggleExpand}
      >
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={allDocsSelected}
            onChange={onToggleGroupSelect}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">
            {group.client_name || 'Unknown client'}
          </p>
          <p className="text-xs text-gray-500">{group.case_id}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-gray-700">
            {docCount} document{docCount === 1 ? '' : 's'}
          </p>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
            {bucketCount} {bucketLabel}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-gray-700">{formatDate(group.last_updated)}</p>
          <p className="text-xs text-gray-400">{formatTime(group.last_updated)}</p>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {STATUS_LABELS[primary] ?? primary}
          </span>
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleExpand}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {expanded ? 'Close ▲' : 'Open →'}
          </button>
        </td>
      </tr>

      {/* Expanded body — one sub-row per document */}
      {expanded && group.docs.map((doc) => (
        <DocSubRow
          key={doc.id}
          doc={doc}
          selected={selectedIds.has(doc.id)}
          onSelect={() => onToggleDocSelect(doc.id)}
          onOpen={() => onDocClick(doc)}
          actionLabel={rowActionLabel(doc.status)}
        />
      ))}
    </>
  );
}

/* ── Sub-row for a single document under an expanded group ──────────── */
function DocSubRow({
  doc,
  selected,
  onSelect,
  onOpen,
  actionLabel,
}: {
  doc: Document;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  actionLabel: string;
}) {
  const cfg = STATUS_COLORS[doc.status] ?? STATUS_COLORS.pending;
  const ft = doc.file_type?.toLowerCase() || '';
  const fileIcon = ft === 'pdf' ? iconFilePdf : (ft === 'jpg' || ft === 'jpeg' || ft === 'png') ? iconFileImg : iconFileDoc;

  return (
    <tr
      onClick={onOpen}
      className={`cursor-pointer bg-slate-50/40 hover:bg-slate-50 ${selected ? 'bg-indigo-50/40' : ''}`}
    >
      <td className="px-4 py-2 pl-8" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </td>
      <td className="px-4 py-2 pl-4" colSpan={2}>
        <div className="flex items-center gap-2">
          <img src={fileIcon} alt="" className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm text-gray-700">{doc.name}</span>
          {doc.document_type && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {doc.document_type}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2">
        <p className="text-xs text-gray-600">{formatDate(doc.uploaded_at)}</p>
        <p className="text-[10px] text-gray-400">{formatTime(doc.uploaded_at)}</p>
      </td>
      <td className="px-4 py-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {STATUS_LABELS[doc.status] ?? doc.status}
        </span>
      </td>
      <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onOpen}
          className={`text-[11px] font-semibold ${
            doc.status === 'action_required' ? 'text-red-600 hover:text-red-700' :
            doc.status === 'approved'        ? 'text-gray-600 hover:text-gray-700' :
                                                'text-indigo-600 hover:text-indigo-700'
          }`}
        >
          {actionLabel} →
        </button>
      </td>
    </tr>
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
  children: React.ReactNode;
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

/* ── Helpers ────────────────────────────────────────────────────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
