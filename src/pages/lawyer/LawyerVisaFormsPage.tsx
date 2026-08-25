// src/pages/lawyer/LawyerVisaFormsPage.tsx
//
// Attorney landing for form review. Groups cases by employer with I-9 +
// I-983 status pills per case. Three filters up top:
//   • Employer   — dropdown of distinct employers whose forms are visible
//   • Visa type  — dropdown
//   • Status     — one of the 4 review states
// Backend endpoint: GET /lawyer/forms (see BACKEND_LAWYER_FORM_REVIEW.md).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLawyerForms } from '../../api/lawyer/forms.api';
import type { LawyerFormListItem, LawyerFormListResponse } from '../../api/lawyer/forms.api';
import FormStatusBadge from '../../components/forms/FormStatusBadge';
import type { FormReviewStatus } from '../../components/forms/FormStatusBadge';
import { removeLocalDraft as removeLocalI9Draft }   from '../../api/employee/i9Form.api';
import { removeLocalDraft as removeLocalI983Draft } from '../../api/employee/i983Form.api';

const STATUS_FILTERS: Array<{ value: '' | FormReviewStatus; label: string }> = [
  { value: '',                   label: 'All statuses' },
  { value: 'submitted',          label: 'In review' },
  { value: 'needs_corrections',  label: 'Needs corrections' },
  { value: 'approved',           label: 'Approved' },
  { value: 'draft',              label: 'Draft' },
];

export default function LawyerVisaFormsPage() {
  const navigate = useNavigate();

  const [data,    setData]    = useState<LawyerFormListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [employerFilter, setEmployerFilter] = useState<string>('');
  const [visaFilter,     setVisaFilter]     = useState<string>('');
  const [statusFilter,   setStatusFilter]   = useState<'' | FormReviewStatus>('');
  const [collapsed,      setCollapsed]      = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await listLawyerForms({
          employer_id:    employerFilter || undefined,
          visa_type_code: visaFilter || undefined,
          status:         statusFilter || undefined,
        });
        setData(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load forms.');
      } finally { setLoading(false); }
    })();
  }, [employerFilter, visaFilter, statusFilter]);

  // ── Group + derived data ────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (!data) return [];
    const byEmployer = new Map<string, { name: string; items: Map<string, LawyerFormListItem[]> }>();
    for (const it of data.items) {
      const empId = it.employer?.id || 'unknown';
      const empName = it.employer?.name || 'Unknown employer';
      if (!byEmployer.has(empId)) byEmployer.set(empId, { name: empName, items: new Map() });
      const empBucket = byEmployer.get(empId)!;
      if (!empBucket.items.has(it.application_id)) empBucket.items.set(it.application_id, []);
      empBucket.items.get(it.application_id)!.push(it);
    }
    return Array.from(byEmployer.entries()).map(([id, e]) => ({
      id, name: e.name,
      cases: Array.from(e.items.entries()).map(([app_id, forms]) => ({ app_id, forms })),
    }));
  }, [data]);

  const visaOptions = useMemo(() => {
    if (!data) return [] as Array<{ code: string; name: string }>;
    const seen = new Map<string, string>();
    for (const it of data.items) if (it.visa_type) seen.set(it.visa_type.code, it.visa_type.name);
    return Array.from(seen.entries()).map(([code, name]) => ({ code, name }));
  }, [data]);

  const counts = data?.counts_by_status;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Visa Forms — Review Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review I-9 and I-983 forms submitted by employees and HR. Approve or send back with corrections.
        </p>
      </header>

      {/* Status summary tiles */}
      {counts && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryTile label="In review"          value={counts.submitted}         color="#1d4ed8" />
          <SummaryTile label="Needs corrections"  value={counts.needs_corrections} color="#b45309" />
          <SummaryTile label="Approved"           value={counts.approved}          color="#15803d" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={employerFilter} onChange={(e) => setEmployerFilter(e.target.value)} className={selectCls}>
          <option value="">All employers</option>
          {data?.employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={visaFilter} onChange={(e) => setVisaFilter(e.target.value)} className={selectCls}>
          <option value="">All visa types</option>
          {visaOptions.map((v) => <option key={v.code} value={v.code}>{v.code} — {v.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | FormReviewStatus)} className={selectCls}>
          {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading forms…</div>}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && grouped.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">No forms in the queue.</p>
          <p className="mt-1 text-xs text-gray-500">Employees and HR haven't submitted anything to review yet.</p>
        </div>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map((emp) => {
            const isCollapsed = collapsed[emp.id];
            const total = emp.cases.length;
            return (
              <section key={emp.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <header
                  className="flex cursor-pointer items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3"
                  onClick={() => setCollapsed((c) => ({ ...c, [emp.id]: !c[emp.id] }))}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{emp.name}</p>
                      <p className="text-[11px] text-gray-500">{total} case{total === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{isCollapsed ? '▸' : '▾'}</span>
                </header>

                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {emp.cases.map(({ app_id, forms }) => {
                      const first = forms[0];
                      const i9   = forms.find((f) => f.form_type === 'i9');
                      const i983 = forms.find((f) => f.form_type === 'i983');
                      // Local-demo housekeeping: attorneys can dismiss a
                      // stale local row (e.g. from an earlier test) when
                      // the backend queue endpoint isn't shipped yet.
                      // Once backend ships, list items always come from
                      // the wire and this local delete is a no-op.
                      const dismissRow = () => {
                        if (!confirm('Remove this case from the local demo queue? The underlying case is untouched — this only clears the local draft.')) return;
                        removeLocalI9Draft(app_id);
                        removeLocalI983Draft(app_id);
                        // Trigger a refetch — reuse the effect's deps.
                        setEmployerFilter((v) => v);
                        // Also do a hard state refresh to hide immediately.
                        setData((d) => d ? { ...d, items: d.items.filter((it) => it.application_id !== app_id) } : d);
                      };
                      return (
                        <div key={app_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{first.employee?.full_name || 'Employee'}</p>
                            <p className="text-[11px] text-gray-500">
                              Case <span className="font-medium text-gray-700">{first.case_reference}</span>
                              {first.visa_type ? <> · <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">{first.visa_type.code}</span></> : null}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {i9 ? (
                              <button
                                onClick={() => navigate(`/lawyer/visa-forms/i9/${i9.application_id}`)}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                <span>I-9</span>
                                <FormStatusBadge role="attorney" status={i9.review_status} compact />
                              </button>
                            ) : <MutedPill text="I-9 · not started" />}
                            {i983 ? (
                              <button
                                onClick={() => navigate(`/lawyer/visa-forms/i983/${i983.application_id}`)}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                <span>I-983</span>
                                <FormStatusBadge role="attorney" status={i983.review_status} compact />
                              </button>
                            ) : <MutedPill text="I-983 · not started" />}
                            {/* Dismiss button — visible only in local demo mode.
                                first.employer.id === 'local' is set by
                                buildLocalDemoList; backend rows use real ids. */}
                            {first.employer?.id === 'local' && (
                              <button
                                onClick={dismissRow}
                                title="Remove this stale row from the local demo queue"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-red-600"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── UI atoms ───────────────────────────────────────────────────────── */

const selectCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

function SummaryTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function MutedPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
      {text}
    </span>
  );
}
