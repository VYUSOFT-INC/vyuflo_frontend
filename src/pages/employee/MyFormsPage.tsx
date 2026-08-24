// src/pages/employee/MyFormsPage.tsx
//
// Landing page for employee-side immigration forms (I-9, I-983, …).
// For MVP: shows one "Form I-9" card per active application. Later,
// HR/attorney will "assign" specific forms via an endpoint; the assignment
// call will just populate this list.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listApplications } from '../../api/employee/applications.api';
import { listLocalDrafts } from '../../api/employee/i9Form.api';
import { listLocalDrafts as listLocalI983Drafts } from '../../api/employee/i983Form.api';

type ApplicationLite = { id: string; visa_type_code?: string | null; case_reference?: string | null };

type FormCard = {
  id:              'i9' | 'i983';
  name:            string;
  full_name:       string;
  description:     string;
  application_id:  string;
  case_reference:  string;
  visa_code:       string;
  status:          'assigned' | 'draft' | 'submitted';
  updated_at?:     string | null;
};

const FORM_META: Record<'i9' | 'i983', { name: string; full_name: string; description: string }> = {
  i9:    { name: 'Form I-9',   full_name: 'Employment Eligibility Verification',
           description: 'USCIS Section 1 — required before your first day of work.' },
  i983:  { name: 'Form I-983', full_name: 'STEM OPT Training Plan',
           description: 'Complete Sections 1 & 2 as the student on STEM OPT.' },
};

export default function MyFormsPage() {
  const navigate = useNavigate();
  const [cards,   setCards]   = useState<FormCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        // Pull employee's applications so we know which cases exist
        let apps: ApplicationLite[] = [];
        try {
          const res = await listApplications({ limit: 20 });
          // Backend can return either { items: [...] }, { applications: [...] }, or [...].
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items: any[] = Array.isArray(res) ? res : (res?.items ?? res?.applications ?? []);
          // Backend's `visa_type` can be either a plain code string ("H-1B") or an
          // object { id, name, code }. Coerce to a string so it can be rendered.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const asCode = (v: any): string | null => {
            if (!v) return null;
            if (typeof v === 'string') return v;
            if (typeof v === 'object') return v.code ?? v.name ?? null;
            return null;
          };
          apps = items.map((a) => ({
            id: String(a.id ?? a.application_id ?? ''),
            visa_type_code: asCode(a.visa_type_code) ?? asCode(a.visa_type) ?? null,
            case_reference: a.case_reference ?? (a.id ? `#${String(a.id).slice(0, 8).toUpperCase()}` : null),
          }));
        } catch { /* silent — will fall back to a demo card */ }

        // Local drafts (offline fallback / dev)
        const i9Drafts   = listLocalDrafts();
        const i983Drafts = listLocalI983Drafts();

        // Compose I-9 + I-983 cards per application (MVP — HR-assignment API later)
        const built: FormCard[] = [];
        const addCards = (
          applicationId: string, caseRef: string, visaCode: string,
        ) => {
          const d9 = i9Drafts.find((d) => d.application_id === applicationId);
          built.push({
            id: 'i9', ...FORM_META.i9,
            application_id: applicationId, case_reference: caseRef, visa_code: visaCode,
            status: d9?.status === 'submitted' ? 'submitted' : d9 ? 'draft' : 'assigned',
            updated_at: d9?.updated_at ?? null,
          });

          const d983 = i983Drafts.find((d) => d.application_id === applicationId);
          built.push({
            id: 'i983', ...FORM_META.i983,
            application_id: applicationId, case_reference: caseRef, visa_code: visaCode,
            status: d983?.status === 'submitted' ? 'submitted' : d983 ? 'draft' : 'assigned',
            updated_at: d983?.updated_at ?? null,
          });
        };

        if (apps.length === 0) {
          setCards([]);
        } else {
        apps.forEach((a) => {
        addCards(
      a.id,
      a.case_reference ?? `#${a.id.slice(0, 8).toUpperCase()}`,
      a.visa_type_code ?? 'Visa',
         );
        });
     }

        setCards(built);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load forms.');
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">My Forms</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill and sign the immigration forms your attorney needs to process your case. Data auto-saves as you type.
        </p>
      </div>

      {loading && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading forms…</div>}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && cards.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">No forms assigned yet.</p>
          <p className="mt-1 text-xs text-gray-500">Your attorney will assign forms after your case is accepted.</p>
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((c, i) => (
            <FormCardView key={`${c.id}-${c.application_id}-${i}`} card={c}
              onOpen={() => navigate(
                // Both I-9 and I-983 use the split PDF editor (real form
                // on the left, editable fields on the right).
                c.id === 'i9'
                  ? `/employee/forms/i9/${c.application_id}/pdf`
                  : `/employee/forms/i983/${c.application_id}/pdf`,
              )} />
          ))}
        </div>
      )}
    </div>
  );
}

function FormCardView({ card, onOpen }: { card: FormCard; onOpen: () => void }) {
  const statusMeta: Record<FormCard['status'], { label: string; bg: string; fg: string; icon: string }> = {
    assigned:  { label: 'Ready to fill',  bg: '#eef2ff', fg: '#4338ca', icon: '📄' },
    draft:     { label: 'Draft saved',    bg: '#fef3c7', fg: '#b45309', icon: '✏️' },
    submitted: { label: 'Submitted',      bg: '#dcfce7', fg: '#15803d', icon: '✓' },
  };
  const s = statusMeta[card.status];

  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">{card.name}</p>
            <h3 className="mt-0.5 text-sm font-bold text-gray-900">{card.full_name}</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0"
                style={{ backgroundColor: s.bg, color: s.fg }}>
            {s.icon} {s.label}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">{card.description}</p>
        <p className="mt-2 text-[11px] text-gray-400">Case: <b className="text-gray-600">{card.case_reference}</b> · Visa: <b className="text-gray-600">{card.visa_code}</b></p>
        {card.updated_at && (
          <p className="text-[10px] text-gray-400">Last edited {new Date(card.updated_at).toLocaleString()}</p>
        )}
      </div>

      <button onClick={onOpen}
        className="mt-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90">
        {card.status === 'submitted' ? 'View submission →' : card.status === 'draft' ? 'Continue draft →' : 'Start form →'}
      </button>
    </div>
  );
}
