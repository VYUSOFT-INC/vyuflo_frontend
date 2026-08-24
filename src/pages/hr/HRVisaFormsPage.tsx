// src/pages/hr/HRVisaFormsPage.tsx
//
// HR-side "Visa Forms" landing. Mirrors the employee-side MyFormsPage:
// lists all cases assigned to this HR user, and under each case shows a
// Form I-9 + Form I-983 card. Clicking a card opens the HR split editor
// (PDF on the left, Section 2 employer fields on the right, Section 1
// data pre-filled from the employee's submission).

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCaseApi } from '../../api/hr/createCase.api';
import type { HRCaseResponse } from '../../types/hr/createCase.types';
import { listLocalDrafts as listI9Drafts }   from '../../api/employee/i9Form.api';
import { listLocalDrafts as listI983Drafts } from '../../api/employee/i983Form.api';

type FormKind = 'i9' | 'i983';

const FORM_META: Record<FormKind, { name: string; description: string }> = {
  i9:   { name: 'Form I-9',   description: 'Employment Eligibility Verification' },
  i983: { name: 'Form I-983', description: 'STEM OPT Training Plan' },
};

export default function HRVisaFormsPage() {
  const navigate = useNavigate();
  const [cases,   setCases]   = useState<HRCaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await createCaseApi.listCases({ limit: 50 });
        setCases(res.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load cases.');
      } finally { setLoading(false); }
    })();
  }, []);

  const i9Drafts   = listI9Drafts();
  const i983Drafts = listI983Drafts();

  const statusFor = (kind: FormKind, applicationId: string): 'assigned' | 'draft' | 'submitted' => {
    const list = kind === 'i9' ? i9Drafts : i983Drafts;
    const d = list.find((x) => x.application_id === applicationId);
    if (!d) return 'assigned';
    return d.status === 'submitted' ? 'submitted' : 'draft';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Visa Forms</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every case has its own I-9 (Section 2) + I-983 (Employer sections) to complete on the employee's behalf. Employee submissions appear here automatically as read-only Section 1 data.
        </p>
      </div>

      {loading && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading cases…</div>}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && cases.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">No cases yet.</p>
          <p className="mt-1 text-xs text-gray-500">Create a case in the Cases screen to see visa forms here.</p>
        </div>
      )}

      {!loading && !error && cases.length > 0 && (
        <div className="space-y-6">
          {cases.map((c) => {
            const ref = c.application_number || `#${c.id.slice(0, 8).toUpperCase()}`;
            const employee = c.employee?.full_name || 'Employee';
            const visa = c.visa_type?.code || '—';
            return (
              <section key={c.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{visa}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{employee}</p>
                      <p className="text-[11px] text-gray-500">Case {ref} · {c.visa_type?.name ?? '—'}</p>
                    </div>
                  </div>
                </header>

                <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                  {(['i9', 'i983'] as FormKind[]).map((kind) => (
                    <FormCard
                      key={kind}
                      kind={kind}
                      status={statusFor(kind, c.id)}
                      onOpen={() => navigate(
                        kind === 'i9'
                          ? `/employer/visa-forms/i9/${c.id}/pdf`
                          : `/employer/visa-forms/i983/${c.id}/pdf`,
                      )}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FormCard({
  kind, status, onOpen,
}: {
  kind: FormKind;
  status: 'assigned' | 'draft' | 'submitted';
  onOpen: () => void;
}) {
  const meta = FORM_META[kind];
  const statusMeta = {
    assigned:  { label: 'Employee not started', bg: '#eef2ff', fg: '#4338ca', icon: '⏳' },
    draft:     { label: 'Employee drafting',    bg: '#fef3c7', fg: '#b45309', icon: '✏️' },
    submitted: { label: 'Employee submitted',   bg: '#dcfce7', fg: '#15803d', icon: '✓' },
  }[status];

  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">{meta.name}</p>
            <h3 className="mt-0.5 text-sm font-bold text-gray-900">{meta.description}</h3>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.fg }}>
            {statusMeta.icon} {statusMeta.label}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {kind === 'i9'
            ? 'Verify documents, sign as employer, and complete Section 2.'
            : 'Fill Sections 3–6 (employer + training plan) after employee finishes Sections 1–2.'}
        </p>
      </div>
      <button onClick={onOpen}
        className="mt-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90">
        Open {meta.name} →
      </button>
    </div>
  );
}
