// src/pages/employee/EmployeeIntakePage.tsx
//
// Employee-facing editable intake wizard. Employee lands here from
// dashboard "Complete your intake" action item OR from email link.
// 5 steps mirror the lawyer review side: Personal, Employment,
// Immigration, Case Type, Review — all editable.
//
// Route: /intake/:sessionId

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../api/axios';
import { readIntakeRequests, markIntakeRequestComplete } from '../../lib/intakeRequests';
import type { PendingIntakeRequest } from '../../lib/intakeRequests';

type StepId = 'personal' | 'employment' | 'immigration' | 'case' | 'review';
const STEPS: { id: StepId; label: string; sub: string }[] = [
  { id: 'personal',    label: 'Personal Info',   sub: 'Your details'   },
  { id: 'employment',  label: 'Employment',      sub: 'Work history'   },
  { id: 'immigration', label: 'Immigration',     sub: 'Visa history'   },
  { id: 'case',        label: 'Case Type',       sub: 'Select visa'    },
  { id: 'review',      label: 'Review',          sub: 'Confirm details'},
];

interface Form {
  full_name:            string;
  date_of_birth:        string;
  nationality:          string;
  passport_number:      string;
  passport_expiry:      string;
  email:                string;
  phone:                string;
  is_student:           boolean;
  company_name:         string;
  job_title:            string;
  start_date:           string;
  annual_salary:        string;
  current_visa_status:  string;
  visa_expiration_date: string;
  has_visa_denial:      boolean | null;   // null = not answered yet
  has_overstay:         boolean | null;
  visa_type_code:       string;
}

const EMPTY: Form = {
  full_name: '', date_of_birth: '', nationality: '', passport_number: '',
  passport_expiry: '', email: '', phone: '',
  is_student: false, company_name: '', job_title: '', start_date: '', annual_salary: '',
  current_visa_status: '', visa_expiration_date: '',
  has_visa_denial: null, has_overstay: null,
  visa_type_code: '',
};

export default function EmployeeIntakePage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<StepId>('personal');
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isDemo = sessionId === 'mock-session-demo';

  const request = useMemo<PendingIntakeRequest | null>(
    () => {
      if (isDemo) {
        return {
          id:             'mock-session-demo',
          application_id: 'mock-app-demo',
          employee_email: '',
          employee_name:  '',
          visa_code:      'H-1B',
          case_reference: '#VF-DEMO-001',
          attorney_name:  'Your attorney',
          note:           'Your attorney has requested you fill out the initial intake form for your case. Please provide accurate details.',
          is_correction:  false,
          requested_at:   new Date().toISOString(),
          completed:      false,
        };
      }
      return readIntakeRequests().find(r => r.id === sessionId) ?? null;
    },
    [sessionId, isDemo],
  );

  // Pre-fill from local request + try backend (skip backend for demo)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!isDemo) {
        try {
          const res = await axios.get(`/intake/sessions/${sessionId}/data`, {
            validateStatus: () => true,
          });
          if (!cancelled && res.status === 200 && res.data) {
            // Map backend response → frontend form shape.
            // Backend returns first_name/last_name (not full_name) and
            // passport_expiry_date (not passport_expiry).
            const d = res.data;
            const full_name = [d.first_name, d.last_name].filter(Boolean).join(' ');
            setForm((f) => ({
              ...f,
              ...d,
              full_name:       full_name || f.full_name,
              passport_expiry: d.passport_expiry_date ?? f.passport_expiry,
            }));
          }
        } catch { /* ignore */ }
      }
      // Also seed from local request info
      if (request && !cancelled) {
        setForm((f) => ({
          ...f,
          full_name:      f.full_name    || request.employee_name,
          email:          f.email        || request.employee_email,
          visa_type_code: f.visa_type_code || (request.visa_code ?? ''),
        }));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sessionId, request, isDemo]);

  const update = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));
  const idx = STEPS.findIndex(s => s.id === step);
  const next = () => setStep(STEPS[Math.min(idx + 1, STEPS.length - 1)].id);
  const prev = () => setStep(STEPS[Math.max(idx - 1, 0)].id);

  const validPersonal    = form.full_name.trim() && form.email.trim();
  const validImmigration = form.has_visa_denial !== null && form.has_overstay !== null;
  const validCase        = !!form.visa_type_code;

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      if (!isDemo) {
        // Map the frontend form → backend IntakeDataSave schema.
        // Backend expects: first_name + last_name (not full_name),
        // passport_expiry_date (not passport_expiry). Fields not in the
        // backend schema (phone, employment info, visa_type_code) are
        // omitted here — they need to be added to the backend schema
        // (see BACKEND_INTAKE_SCHEMA_GAPS.md).
        const parts = (form.full_name || '').trim().split(/\s+/);
        const backendPayload = {
          first_name:           parts.slice(0, -1).join(' ') || parts[0] || null,
          last_name:            parts.length > 1 ? parts.slice(-1)[0] : null,
          date_of_birth:        form.date_of_birth || null,
          nationality:          form.nationality || null,
          passport_number:      form.passport_number || null,
          passport_expiry_date: form.passport_expiry || null,
          email:                form.email || null,
          current_visa_status:  form.current_visa_status || null,
          visa_expiration_date: form.visa_expiration_date || null,
          has_visa_denial:      form.has_visa_denial,
          has_overstay:         form.has_overstay,
        };

        // Save + submit to backend
        try {
          const putRes = await axios.put(
            `/intake/sessions/${sessionId}/data`,
            backendPayload,
            { validateStatus: () => true },
          );
          if (putRes.status >= 400) {
            console.warn('[intake PUT]', putRes.status, putRes.data);
          }
        } catch (e) { console.warn('[intake PUT] threw', e); }
        try {
          const submitRes = await axios.post(
            `/intake/sessions/${sessionId}/submit`,
            {},
            { validateStatus: () => true },
          );
          if (submitRes.status >= 400) {
            console.warn('[intake submit]', submitRes.status, submitRes.data);
          }
        } catch (e) { console.warn('[intake submit] threw', e); }
      }

      // For demo, ensure a completed marker exists in localStorage so
      // the dashboard tile disappears on refresh.
      if (isDemo) {
        try {
          const KEY = 'vyuflo:intake:pending-requests:v1';
          const raw = localStorage.getItem(KEY);
          const list = raw ? JSON.parse(raw) : [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const next = list.some((r: any) => r.id === sessionId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? list.map((r: any) => (r.id === sessionId ? { ...r, completed: true } : r))
            : [{ id: sessionId, completed: true, employee_email: '', employee_name: '', visa_code: 'H-1B', case_reference: '#VF-DEMO-001', attorney_name: 'Your attorney', note: '', is_correction: false, requested_at: new Date().toISOString(), application_id: 'mock-app-demo' }, ...list];
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch { /* ignore */ }
      } else {
        markIntakeRequestComplete(sessionId);
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading your intake…</div>;
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-3xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Intake submitted</h1>
        <p className="mt-1 text-sm text-gray-600">Your attorney will review it and get back to you shortly.</p>
        <button onClick={() => navigate('/')}
          className="mt-6 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white cursor-pointer">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      {/* Header + attorney note */}
      <button onClick={() => navigate('/')}
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer">
        ← Back to dashboard
      </button>

      <h1 className="text-2xl font-bold text-gray-900">Complete your intake</h1>
      <p className="mt-1 text-sm text-gray-600">
        Fill in the details below. All 5 steps are required.
      </p>

      {request?.note && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
            📝 Note from your attorney
          </p>
          <p className="mt-1 text-sm text-amber-900">{request.note}</p>
        </div>
      )}

      {/* Stepper */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white px-3 py-3">
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((s, i) => {
            const done = i < idx;
            const cur  = i === idx;
            return (
              <div key={s.id} className="flex items-center gap-1 min-w-0 shrink">
                <button type="button" onClick={() => setStep(s.id)}
                  className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 -mx-1 hover:bg-gray-50 cursor-pointer">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done ? 'bg-emerald-500 text-white'
                    : cur ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                  }`}>{done ? '✓' : i + 1}</div>
                  <p className={`text-xs font-semibold truncate ${done || cur ? 'text-gray-900' : 'text-gray-500'}`}>{s.label}</p>
                </button>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 min-w-[12px] ${done ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step body */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 md:p-6">
        {step === 'personal' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
            <Field label="Full legal name" required>
              <input value={form.full_name} onChange={e => update({ full_name: e.target.value })}
                className={inputCls} placeholder="John Doe" />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={form.date_of_birth} onChange={e => update({ date_of_birth: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Nationality">
              <input value={form.nationality} onChange={e => update({ nationality: e.target.value })} className={inputCls} placeholder="Indian" />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Passport number">
                <input value={form.passport_number} onChange={e => update({ passport_number: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Passport expiry">
                <input type="date" value={form.passport_expiry} onChange={e => update({ passport_expiry: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Email" required>
                <input type="email" value={form.email} onChange={e => update({ email: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Phone">
                <input type="tel" value={form.phone} onChange={e => update({ phone: e.target.value })} className={inputCls} placeholder="+1 555 000 0000" />
              </Field>
            </div>
          </div>
        )}

        {step === 'employment' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Employment</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_student} onChange={e => update({ is_student: e.target.checked })} />
              <span className="text-sm text-gray-700">I'm a student — not currently employed</span>
            </label>
            {!form.is_student && (
              <>
                <Field label="Employer / company name">
                  <input value={form.company_name} onChange={e => update({ company_name: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Job title">
                  <input value={form.job_title} onChange={e => update({ job_title: e.target.value })} className={inputCls} />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Start date">
                    <input type="date" value={form.start_date} onChange={e => update({ start_date: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Annual salary (USD)">
                    <input type="number" value={form.annual_salary} onChange={e => update({ annual_salary: e.target.value })} className={inputCls} placeholder="120000" />
                  </Field>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'immigration' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Immigration History</h2>
            <Field label="Current visa status">
              <input value={form.current_visa_status} onChange={e => update({ current_visa_status: e.target.value })} className={inputCls} placeholder="H-1B / F-1 / etc." />
            </Field>
            <Field label="Visa expiration date">
              <input type="date" value={form.visa_expiration_date} onChange={e => update({ visa_expiration_date: e.target.value })} className={inputCls} />
            </Field>

            <Field label="Have you ever been denied a US visa?" required>
              <YesNoPills
                value={form.has_visa_denial}
                onChange={(v) => update({ has_visa_denial: v })}
              />
            </Field>

            <Field label="Have you ever overstayed a visa?" required>
              <YesNoPills
                value={form.has_overstay}
                onChange={(v) => update({ has_overstay: v })}
              />
            </Field>

            {(form.has_visa_denial === null || form.has_overstay === null) && (
              <p className="text-xs text-amber-600">
                ⚠️ Please answer both questions before continuing.
              </p>
            )}
          </div>
        )}

        {step === 'case' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Case Type</h2>
            <Field label="Visa type" required>
              <select value={form.visa_type_code} onChange={e => update({ visa_type_code: e.target.value })} className={inputCls}>
                <option value="">— Select a visa type —</option>
                {['H-1B','L-1A','L-1B','O-1','TN','E-2','F-1','J-1','H-4','L-2','EB-1','EB-2','EB-5','K-1','Asylum'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
            {request?.visa_code && (
              <p className="text-xs text-gray-500">
                💡 Your attorney set up this case for <b>{request.visa_code}</b>. Keep it unless you're applying for something different.
              </p>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Review &amp; Submit</h2>
            <p className="text-sm text-gray-600">Confirm the details below before submitting. You can go back to any step to edit.</p>
            <ReviewBlock title="Personal" rows={[
              ['Full name',    form.full_name],
              ['DOB',          form.date_of_birth],
              ['Nationality',  form.nationality],
              ['Passport',     form.passport_number],
              ['Email',        form.email],
              ['Phone',        form.phone],
            ]} />
            <ReviewBlock title="Employment" rows={form.is_student ? [['Status', 'Student — not employed']] : [
              ['Employer',     form.company_name],
              ['Job title',    form.job_title],
              ['Start date',   form.start_date],
              ['Salary',       form.annual_salary],
            ]} />
            <ReviewBlock title="Immigration" rows={[
              ['Current visa', form.current_visa_status],
              ['Expiration',   form.visa_expiration_date],
              ['Denial',       form.has_visa_denial === null ? '' : (form.has_visa_denial ? 'Yes' : 'No')],
              ['Overstay',     form.has_overstay     === null ? '' : (form.has_overstay     ? 'Yes' : 'No')],
            ]} />
            <ReviewBlock title="Case type" rows={[['Visa', form.visa_type_code]]} />
            {error && <p className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</p>}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button onClick={prev} disabled={idx === 0}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer">
          ← Back
        </button>
        {step !== 'review' ? (
          <button onClick={next}
            disabled={
              (step === 'personal' && !validPersonal) ||
              (step === 'immigration' && !validImmigration) ||
              (step === 'case' && !validCase)
            }
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            Continue →
          </button>
        ) : (
          <button onClick={submit} disabled={submitting || !validPersonal || !validImmigration || !validCase}
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            {submitting ? 'Submitting…' : '✓ Submit intake'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
function YesNoPills({
  value, onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  const base = 'flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition cursor-pointer';
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`${base} ${
          value === true
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
            : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`${base} ${
          value === false
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
            : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
        }`}
      >
        No
      </button>
    </div>
  );
}

function ReviewBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{title}</p>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap justify-between gap-2 text-sm">
            <dt className="text-gray-500">{k}</dt>
            <dd className={v ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>{v || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}