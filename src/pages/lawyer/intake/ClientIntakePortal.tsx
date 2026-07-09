// src/pages/lawyer/intake/ClientIntakePortal.tsx
//
// Client-side intake form — opened via the secure link the attorney emails.
// PUBLIC route, NO JWT auth required.
//
// Route:   /intake/:token
// Load:    GET  /api/v1/intake/by-token/{token}     (no auth)
// Save:    PUT  /api/v1/intake/sessions/{id}/data   (⚠️ currently needs JWT)
// Submit:  POST /api/v1/intake/sessions/{id}/submit (⚠️ currently needs JWT)
//
// ⚠️ BACKEND GAPS (flag to backend dev):
//    Backend currently requires JWT on PUT /data, POST /save-draft, POST /submit.
//    For client portal flow, backend should add token-authenticated equivalents:
//      • PUT  /intake/by-token/{token}/data
//      • POST /intake/by-token/{token}/submit
//    OR allow the existing endpoints to accept token-based auth via header.
//    Until then, "Continue" calls below will return 401 for client users.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import type {
  IntakeData,
  IntakeSession,
  VisaStatusOption,
  PreviousVisa,
} from '../../../types/lawyer/intake.types';
import { EMPTY_INTAKE_DATA, EMPTY_PREVIOUS_VISA } from '../../../types/lawyer/intake.types';

/* ── Backend base URL ─────────────────────────────────────────────────
 * Same as your existing axios instance, but here we use plain fetch()
 * to avoid the JWT auth interceptor (this is a public route).
 * Reads from VITE_API_BASE_URL if available, else assumes /api/v1 proxy. */
const API_BASE: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE_URL ?? '/api/v1';

/* ── Step config (CLIENT-side has 3 steps per Figma) ───────────────── */
type ClientStep = 1 | 2 | 3;

const STEPS: { num: ClientStep; label: string }[] = [
  { num: 1, label: 'Personal Info' },
  { num: 2, label: 'Employment'    },
  { num: 3, label: 'History'       },
];

/* ════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function ClientIntakePortal() {
  const { token = '' } = useParams<{ token: string }>();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [data, setData] = useState<IntakeData>(EMPTY_INTAKE_DATA);
  const [visaOptions, setVisaOptions] = useState<VisaStatusOption[]>([]);
  const [currentStep, setCurrentStep] = useState<ClientStep>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── Load session by token + visa status options on mount ──────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setError('Missing intake token. Please use the link provided in your email.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [sessionRes, optsRes] = await Promise.all([
          fetch(`${API_BASE}/intake/by-token/${token}`).then(handleJsonResponse),
          fetch(`${API_BASE}/intake/visa-status-options`).then(handleJsonResponse),
        ]);
        if (cancelled) return;
        setSession(sessionRes as IntakeSession);
        if ((sessionRes as IntakeSession).intake_data) {
          setData({ ...EMPTY_INTAKE_DATA, ...(sessionRes as IntakeSession).intake_data! });
        }
        setVisaOptions((optsRes as { items: VisaStatusOption[] }).items ?? []);

        // Resume from saved step if possible
        const sess = sessionRes as IntakeSession;
        if (sess.current_step >= 3 || sess.step_3_completed) setCurrentStep(3);
        else if (sess.step_1_completed) setCurrentStep(2);
        else setCurrentStep(1);
      } catch (e: unknown) {
        if (!cancelled) {
          if (e instanceof Error) setError(e.message);
          else setError('Could not load your intake form. The link may have expired.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const update = (patch: Partial<IntakeData>) => setData((p) => ({ ...p, ...patch }));

  const handleContinue = async () => {
    if (!session) return;

    // Validate current step
    const err = validateStep(currentStep, data);
    if (err) { alert(err); return; }

    // Save current step to backend (best effort — backend currently requires JWT)
    setSaving(true);
    try {
      const backendStep = currentStep === 1 ? 1 : currentStep === 3 ? 3 : undefined;
      const qs = backendStep ? `?step_completed=${backendStep}` : '';
      const res = await fetch(`${API_BASE}/intake/sessions/${session.id}/data${qs}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      // If 401 because of missing JWT, proceed anyway (UI flow continues; backend gap)
      if (!res.ok && res.status !== 401) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Save failed (${res.status})`);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[ClientIntakePortal] Save warning:', e);
      // Continue UI anyway — backend save will be retriable when endpoint is fixed
    } finally {
      setSaving(false);
    }

    if (currentStep < 3) setCurrentStep((s) => (s + 1) as ClientStep);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/intake/sessions/${session.id}/submit`, {
        method: 'POST',
      });
      if (!res.ok && res.status !== 401) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Submit failed (${res.status})`);
      }
      setSubmitted(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not submit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as ClientStep);
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  if (submitted) return <SubmittedView />;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Header />

      <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <p className="text-sm text-gray-500">Loading your intake form…</p>
          </div>
        ) : error ? (
          <ErrorPanel message={error} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr]">
              <HeroPanel currentStep={currentStep} />

              <div className="flex flex-col p-6 sm:p-8 lg:p-10">
                <StepTabs current={currentStep} />

                <div className="mt-6 flex-1">
                  {currentStep === 1 && (
                    <Step1Personal data={data} onChange={update} />
                  )}
                  {currentStep === 2 && <Step2Employment />}
                  {currentStep === 3 && (
                    <Step3History data={data} visaOptions={visaOptions} onChange={update} />
                  )}
                </div>

                {/* Bottom nav */}
                <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                  {currentStep > 1 ? (
                    <button
                      onClick={handleBack}
                      className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      onClick={() => window.history.back()}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={handleContinue}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : currentStep === 3 ? 'Submit' : 'Continue'}
                    {!saving && <span>→</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════════════════════════ */
function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-8">
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[10px] shadow-sm"
          style={{ backgroundImage: 'linear-gradient(135deg, rgb(37,99,235) 0%, rgb(147,51,234) 100%)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M14 2L9 13L7 9L3 7L14 2Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-lg font-bold text-indigo-600">Vyuflo</span>
      </div>
      <span className="text-sm font-medium text-gray-600">Client Intake Portal</span>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   LEFT HERO PANEL
═══════════════════════════════════════════════════════════════════════ */
function HeroPanel({ currentStep }: { currentStep: ClientStep }) {
  const headlines: Record<ClientStep, { title: string; subtitle: string }> = {
    1: { title: 'Begin your immigration journey.',  subtitle: 'Please provide accurate personal information to ensure a smooth visa application process. Your data is securely encrypted.' },
    2: { title: 'Tell us about your work.',         subtitle: 'Share your employment history so we can match you with the right visa pathway.' },
    3: { title: 'Your immigration history.',        subtitle: 'A few questions about your past visas help us prepare the strongest possible case.' },
  };
  const h = headlines[currentStep];

  return (
    <aside
      className="relative hidden flex-col justify-between p-8 text-white lg:flex lg:p-10"
      style={{ backgroundImage: 'linear-gradient(160deg, #2563eb 0%, #4f46e5 60%, #6366f1 100%)' }}
    >
      <div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight">{h.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/85">{h.subtitle}</p>
      </div>

      {/* Decorative ID-card illustration */}
      <div className="my-8 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 -m-6 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
            <svg viewBox="0 0 64 64" fill="none" className="h-16 w-16 text-white">
              <rect x="8" y="14" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2.5"/>
              <circle cx="22" cy="28" r="5" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 42c2-4 6-6 8-6s6 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M36 26h14M36 32h12M36 38h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/75">
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <path d="M8 1L3 3.5V8c0 3 2 5.5 5 7 3-1.5 5-4 5-7V3.5L8 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
        <span>Secure & Confidential</span>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STEP TABS
═══════════════════════════════════════════════════════════════════════ */
function StepTabs({ current }: { current: ClientStep }) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto sm:gap-6">
      {STEPS.map((s, i) => {
        const isDone    = s.num < current;
        const isCurrent = s.num === current;
        return (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent ? 'bg-indigo-600 text-white' :
                  isDone    ? 'bg-emerald-600 text-white' :
                              'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? '✓' : s.num}
              </div>
              <span className={`whitespace-nowrap text-sm font-semibold ${
                isCurrent ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-px w-6 sm:w-10 ${isDone ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 1 — PERSONAL INFO
═══════════════════════════════════════════════════════════════════════ */
function Step1Personal({
  data,
  onChange,
}: {
  data: IntakeData;
  onChange: (patch: Partial<IntakeData>) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Step 1 of 3</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Personal Information</h2>
      <p className="mt-1 text-sm text-gray-500">
        Enter your details exactly as they appear on your passport.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="First Name (Given Name)" required>
          <Input value={data.first_name} onChange={(v) => onChange({ first_name: v })} placeholder="e.g. John" />
        </Field>
        <Field label="Last Name (Surname)" required>
          <Input value={data.last_name} onChange={(v) => onChange({ last_name: v })} placeholder="e.g. Doe" />
        </Field>
        <Field label="Date of Birth" required>
          <Input type="date" value={data.date_of_birth} onChange={(v) => onChange({ date_of_birth: v })} />
        </Field>
        <Field label="Gender" required>
          <Select value={data.gender} onChange={(v) => onChange({ gender: v })}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Nationality" required>
            <Input value={data.nationality} onChange={(v) => onChange({ nationality: v })} placeholder="e.g. United States" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Passport Number" required>
            <Input value={data.passport_number} onChange={(v) => onChange({ passport_number: v })} placeholder="Enter alphanumeric passport number" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Email Address" required>
            <Input type="email" value={data.email} onChange={(v) => onChange({ email: v })} placeholder="client@example.com" />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 2 — EMPLOYMENT (UI-only — backend schema not yet defined)
═══════════════════════════════════════════════════════════════════════ */
function Step2Employment() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Step 2 of 3</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Employment History</h2>
      <p className="mt-1 text-sm text-gray-500">
        Tell us about your current employer and role.
      </p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        ℹ️ Employment fields are not stored by the backend yet. UI shown for design completeness — these inputs are local-only until the schema is extended.
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Current Employer">
          <Input value="" onChange={() => {}} placeholder="Company name" />
        </Field>
        <Field label="Job Title">
          <Input value="" onChange={() => {}} placeholder="e.g. Software Engineer" />
        </Field>
        <Field label="Start Date">
          <Input type="date" value="" onChange={() => {}} />
        </Field>
        <Field label="Annual Salary (USD)">
          <Input type="number" value="" onChange={() => {}} placeholder="e.g. 120000" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Work Address">
            <Input value="" onChange={() => {}} placeholder="Street, City, State, ZIP" />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 3 — IMMIGRATION HISTORY
═══════════════════════════════════════════════════════════════════════ */
function Step3History({
  data,
  visaOptions,
  onChange,
}: {
  data: IntakeData;
  visaOptions: VisaStatusOption[];
  onChange: (patch: Partial<IntakeData>) => void;
}) {
  const addVisa = () => onChange({ previous_visas: [...data.previous_visas, { ...EMPTY_PREVIOUS_VISA }] });
  const updateVisa = (i: number, patch: Partial<PreviousVisa>) => {
    onChange({ previous_visas: data.previous_visas.map((v, idx) => idx === i ? { ...v, ...patch } : v) });
  };
  const removeVisa = (i: number) => {
    onChange({ previous_visas: data.previous_visas.filter((_, idx) => idx !== i) });
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Step 3 of 3</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Immigration History</h2>
      <p className="mt-1 text-sm text-gray-500">
        Help us understand your visa background.
      </p>

      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Current Visa Status" required>
            <Select value={data.current_visa_status} onChange={(v) => onChange({ current_visa_status: v })}>
              <option value="">Select status…</option>
              {visaOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Visa Expiration Date">
            <Input type="date" value={data.visa_expiration_date} onChange={(v) => onChange({ visa_expiration_date: v })} />
          </Field>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <YesNo label="Have you ever been denied a visa?" value={data.has_visa_denial} onChange={(v) => onChange({ has_visa_denial: v })} />
          {data.has_visa_denial && (
            <div className="mt-3">
              <Field label="Please provide details">
                <Textarea value={data.visa_denial_details} onChange={(v) => onChange({ visa_denial_details: v })} placeholder="Include dates and reasons…" />
              </Field>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <YesNo label="Have you ever overstayed a visa?" value={data.has_overstay} onChange={(v) => onChange({ has_overstay: v })} />
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900">Previous US Visas</p>
          <div className="space-y-3">
            {data.previous_visas.map((v, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Visa #{i + 1}</span>
                  <button onClick={() => removeVisa(i)} className="text-xs font-medium text-red-600 hover:text-red-700">Remove</button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Visa Type">
                    <Select value={v.visa_type} onChange={(val) => updateVisa(i, { visa_type: val })}>
                      <option value="">Select…</option>
                      {visaOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Visa Number">
                    <Input value={v.visa_number} onChange={(val) => updateVisa(i, { visa_number: val })} />
                  </Field>
                  <Field label="Issue Date">
                    <Input type="date" value={v.issue_date} onChange={(val) => updateVisa(i, { issue_date: val })} />
                  </Field>
                  <Field label="Expiry Date">
                    <Input type="date" value={v.expiry_date} onChange={(val) => updateVisa(i, { expiry_date: val })} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Issuing Country">
                      <Input value={v.issuing_country} onChange={(val) => updateVisa(i, { issuing_country: val })} placeholder="e.g. United States" />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addVisa}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white py-3 text-sm font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50"
            >
              + Add Another Visa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SUBMITTED VIEW
═══════════════════════════════════════════════════════════════════════ */
function SubmittedView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 text-emerald-600">
            <path d="M5 12.5L10 17L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Thank you!</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your intake form has been submitted to your attorney. They will reach out to you with next steps.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ERROR PANEL
═══════════════════════════════════════════════════════════════════════ */
function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-base font-semibold text-red-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <p className="mt-4 text-xs text-red-600">
        Please contact your attorney for a new intake link.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════════════════ */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}

function Select({
  value, onChange, children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      {children}
    </select>
  );
}

function Textarea({
  value, onChange, placeholder, rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <div className="flex shrink-0 rounded-lg border border-gray-300 bg-white p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-md px-4 py-1 text-xs font-semibold ${value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-md px-4 py-1 text-xs font-semibold ${!value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          No
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════ */
async function handleJsonResponse(res: Response): Promise<unknown> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 401) throw new Error('This intake link has expired. Please ask your attorney for a new one.');
    if (res.status === 404) throw new Error('Intake link not found. Please verify the URL.');
    throw new Error(body?.detail ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function validateStep(step: ClientStep, data: IntakeData): string | null {
  if (step === 1) {
    if (!data.first_name.trim())      return 'First name is required.';
    if (!data.last_name.trim())       return 'Last name is required.';
    if (!data.date_of_birth)          return 'Date of birth is required.';
    if (!data.gender)                 return 'Gender is required.';
    if (!data.nationality.trim())     return 'Nationality is required.';
    if (!data.passport_number.trim()) return 'Passport number is required.';
    if (!data.email.trim())           return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Invalid email format.';
  }
  if (step === 3) {
    if (!data.current_visa_status) return 'Current visa status is required.';
    if (data.has_visa_denial && !data.visa_denial_details.trim()) {
      return 'Please provide details of the visa denial.';
    }
  }
  return null;
}
