// src/pages/hr/HRApprovalsOverview.tsx
// Route: /employer/approvals
// Case picker shown before drilling into a specific case's Approval Queue.
// Mirrors HRDocumentsOverview.tsx's pattern exactly — same case-list source
// (createCaseApi.listCases), same card layout, same search — just swapping
// per-case document counts for per-case approval counts.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Search, ChevronRight, AlertCircle } from 'lucide-react';
import { createCaseApi } from '../../api/hr/createCase.api';
import { hrApprovalApi } from '../../api/hr/hrApproval.api';
import { RouteErrorBoundary } from '../../components/layout/RouteErrorBoundary';

interface CaseApprovalSummary {
  application_id: string;
  case_name: string;
  employee_name: string;
  visa_type: string;
  total: number;
  approved: number;
  pending: number;
  edits_requested: number;
  pct_complete: number;
}

// Same helpers as HRDocumentsOverview.tsx — kept identical so both screens
// stay in sync if the case list response shape ever changes.

function toDisplayString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const v = value as Record<string, any>;
    return v.name ?? v.code ?? '';
  }
  return String(value);
}

function extractCaseMeta(raw: unknown): { application_id: string; case_name: string; employee_name: string; visa_type: string } {
  const c = (raw ?? {}) as Record<string, any>;

  const application_id = c.id ?? c.application_id ?? '';
  if (!application_id) {
    console.warn('[HRApprovalsOverview] Case row has no id/application_id field:', c);
  }

  return {
    application_id,
    case_name: toDisplayString(c.case_name ?? c.name) || 'Untitled Case',
    employee_name:
      toDisplayString(
        c.employee_name ??
        c.employee?.full_name ??
        [c.employee?.first_name, c.employee?.last_name].filter(Boolean).join(' ')
      ) || 'Unknown Employee',
    visa_type: toDisplayString(c.visa_type_name ?? c.visa_type_code ?? c.visa_type),
  };
}

function HRApprovalsOverviewInner() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseApprovalSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const caseList = await createCaseApi.listCases({ limit: 100 });

        const items: unknown[] = Array.isArray((caseList as any)?.items)
          ? (caseList as any).items
          : Array.isArray(caseList)
          ? (caseList as unknown[])
          : [];

        const summaries = await Promise.all(
          items.map(async (raw): Promise<CaseApprovalSummary> => {
            const meta = extractCaseMeta(raw);
            if (!meta.application_id) {
              return { ...meta, total: 0, approved: 0, pending: 0, edits_requested: 0, pct_complete: 0 };
            }
            try {
              // application_id filter is server-side (hr_list_approvals in
              // hr_approval_service.py already takes it — see
              // hr_case_overview_service.py's call into the same function).
              const res = await hrApprovalApi.list({ application_id: meta.application_id, status: 'all' });
              const approved = res.items.filter(i => i.status === 'approved').length;
              const pending = res.items.filter(i => i.status === 'pending').length;
              const edits_requested = res.items.filter(i => i.status === 'edits_requested').length;
              const total = res.items.length;
              return {
                ...meta,
                total,
                approved,
                pending,
                edits_requested,
                pct_complete: total > 0 ? Math.round((approved / total) * 100) : 0,
              };
            } catch (approvalErr) {
              console.warn(`[HRApprovalsOverview] Failed to load approvals for case ${meta.application_id}:`, approvalErr);
              return { ...meta, total: 0, approved: 0, pending: 0, edits_requested: 0, pct_complete: 0 };
            }
          })
        );

        if (!cancelled) setCases(summaries);
      } catch (err: unknown) {
        console.error('[HRApprovalsOverview] Failed to load cases:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cases');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const filtered = cases.filter(c =>
    !search ||
    c.case_name.toLowerCase().includes(search.toLowerCase()) ||
    c.employee_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex-1 overflow-y-auto p-[24px]">
        <div className="flex items-center justify-between mb-[20px]">
          <div>
            <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.5px]">Approval Queue</h1>
            <p className="text-[13px] text-[#64748b] mt-[3px]">Select a case to review its pending approvals</p>
          </div>
        </div>

        <div className="relative mb-[16px] max-w-[360px]">
          <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by case or employee..."
            className="w-full h-[40px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[30px] pr-[10px] text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[12px] p-[14px] text-[13px] text-[#dc2626] mb-[16px]">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-[120px] bg-white rounded-[14px] border border-[#f1f5f9] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[32px] text-center text-[#64748b] text-[13px]">
            No cases found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
            {filtered.map(c => (
              <button
                key={c.application_id}
                onClick={() => navigate(`/employer/approvals/${c.application_id}`)}
                className="text-left bg-white border border-[#f1f5f9] rounded-[14px] p-[18px] hover:border-indigo-200 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-[10px]">
                    <div className="size-[36px] rounded-[8px] bg-indigo-50 flex items-center justify-center shrink-0">
                      <ClipboardCheck size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#0f172a]">{c.case_name}</p>
                      <p className="text-[12px] text-[#64748b]">{c.employee_name} · {c.visa_type}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#cbd5e1] shrink-0 mt-[6px]" />
                </div>

                <div className="mt-[14px]">
                  <div className="flex items-center justify-between mb-[6px]">
                    <span className="text-[11px] font-medium text-[#64748b]">
                      {c.approved}/{c.total} approved
                    </span>
                    <span className="text-[12px] font-bold text-indigo-600">{c.pct_complete}%</span>
                  </div>
                  <div className="h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${c.pct_complete}%` }}
                    />
                  </div>
                  {c.pending > 0 && (
                    <div className="flex items-center gap-[4px] mt-[8px] text-[11px] text-red-600">
                      <AlertCircle size={11} />
                      {c.pending} pending approval{c.pending > 1 ? 's' : ''}
                    </div>
                  )}
                  {c.edits_requested > 0 && (
                    <div className="flex items-center gap-[4px] mt-[4px] text-[11px] text-[#a16207]">
                      <AlertCircle size={11} />
                      {c.edits_requested} edit{c.edits_requested > 1 ? 's' : ''} requested
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HRApprovalsOverview() {
  return (
    <RouteErrorBoundary fallbackTitle="Couldn't load Approval Queue">
      <HRApprovalsOverviewInner />
    </RouteErrorBoundary>
  );
}