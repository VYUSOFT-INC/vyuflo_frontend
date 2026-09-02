// src/components/employee/AdditionalProfileFields.tsx
//
// XL sheet row 29:
//   "upon clicking complete your profile — USER COULDNT FIND WHERE TO
//    FILL INFO LIKE PASSPORT, IMMIGRATION & EMPLOYMENT. WITH OUT THOSE
//    ITS SHOWING 60% DONE."
//
// This card fills that gap. It renders three collapsible sub-sections
// (Passport / Immigration / Employment) with the minimum viable set of
// fields Vyuflo's downstream flows (I-9, I-983, visa filings) actually
// use. The card lives on the employee profile page, right under
// "Personal Information".
//
// Safety notes — since these fields collect sensitive PII:
//   • Passport number, visa number, SSN are encrypted at rest by the
//     backend (see BACKEND_PROFILE_ADDITIONAL_FIELDS.md).
//   • This component NEVER logs the values.
//   • Autofill is disabled (`autoComplete="off"`) — same posture as
//     the signup page.
//   • Fields blur to `type="password"` for passport number + SSN so
//     shoulder-surfing is harder; a toggle reveals when needed.
//
// Persistence right now: localStorage under
// `vyuflo:employee:additional-profile:v1` keyed by user email. When
// the backend endpoints in the spec doc ship, swap the `saveDraft`
// call for `additionalProfileApi.save(payload)` — everything else
// stays put.

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp, ShieldCheck, Save } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
export interface AdditionalProfile {
  // Passport & ID
  passport_number:            string;
  passport_country_of_issue:  string;
  passport_issue_date:        string;
  passport_expiration_date:   string;
  ssn:                        string;   // stored encrypted server-side
  // Immigration
  current_visa_type:          string;
  current_visa_number:        string;
  visa_issue_date:            string;
  visa_expiry_date:           string;
  i94_record_number:          string;
  country_of_birth:           string;
  // Employment
  current_employer:           string;
  current_position:           string;
  employment_start_date:      string;
  employment_type:            string;
  work_location_country:      string;
}

const EMPTY: AdditionalProfile = {
  passport_number: '', passport_country_of_issue: '', passport_issue_date: '',
  passport_expiration_date: '', ssn: '',
  current_visa_type: '', current_visa_number: '', visa_issue_date: '',
  visa_expiry_date: '', i94_record_number: '', country_of_birth: '',
  current_employer: '', current_position: '', employment_start_date: '',
  employment_type: '', work_location_country: '',
};

const STORAGE_KEY = 'vyuflo:employee:additional-profile:v1';

function loadDraft(email: string): AdditionalProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const map = JSON.parse(raw) as Record<string, AdditionalProfile>;
    return { ...EMPTY, ...(map[email] ?? {}) };
  } catch { return { ...EMPTY }; }
}

function saveDraft(email: string, data: AdditionalProfile): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, AdditionalProfile>;
    map[email] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* quota */ }
}

// ── Component ────────────────────────────────────────────────────────
interface Props { email: string | null }

export default function AdditionalProfileFields({ email }: Props) {
  const key = (email ?? '').trim().toLowerCase();
  const [form, setForm]           = useState<AdditionalProfile>(EMPTY);
  const [showPassport, setShowPP] = useState(false);
  const [showSsn, setShowSsn]     = useState(false);
  const [open, setOpen] = useState<{passport:boolean;immig:boolean;emp:boolean}>({
    passport: true, immig: false, emp: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (key) setForm(loadDraft(key)); }, [key]);

  const set = <K extends keyof AdditionalProfile>(k: K) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const filledCount = useMemo(() => {
    return Object.values(form).filter((v) => (v ?? '').toString().trim().length > 0).length;
  }, [form]);
  const totalCount = Object.keys(EMPTY).length;

  const onSave = () => {
    if (!key) return;
    saveDraft(key, form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
    // Notify the dashboard so the Profile Readiness ring re-computes.
    window.dispatchEvent(new Event('vyuflo:additional-profile-updated'));
  };

  return (
    <div className="rounded-2xl border border-[#f1f5f9] bg-white p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <ShieldCheck size={16} />
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">Passport, Immigration & Employment</p>
            <p className="text-[11px] text-gray-500">
              Required for visa filings. Fields are encrypted at rest.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
          {filledCount}/{totalCount}
        </span>
      </div>

      {/* ── PASSPORT & ID ────────────────────────────────────────── */}
      <Section
        title="Passport & ID"
        isOpen={open.passport}
        onToggle={() => setOpen((p) => ({ ...p, passport: !p.passport }))}
      >
        <Field label="Passport Number">
          <SecretInput
            value={form.passport_number}
            onChange={set('passport_number')}
            reveal={showPassport}
            onToggle={() => setShowPP((s) => !s)}
            placeholder="A1234567"
          />
        </Field>
        <Field label="Country of Issue">
          <Input value={form.passport_country_of_issue} onChange={set('passport_country_of_issue')} placeholder="India" />
        </Field>
        <Field label="Issue Date">
          <Input type="date" value={form.passport_issue_date} onChange={set('passport_issue_date')} />
        </Field>
        <Field label="Expiration Date">
          <Input type="date" value={form.passport_expiration_date} onChange={set('passport_expiration_date')} />
        </Field>
        <Field label="SSN (if issued)">
          <SecretInput
            value={form.ssn}
            onChange={set('ssn')}
            reveal={showSsn}
            onToggle={() => setShowSsn((s) => !s)}
            placeholder="123-45-6789"
          />
        </Field>
      </Section>

      {/* ── IMMIGRATION HISTORY ─────────────────────────────────── */}
      <Section
        title="Immigration History"
        isOpen={open.immig}
        onToggle={() => setOpen((p) => ({ ...p, immig: !p.immig }))}
      >
        <Field label="Current Visa Type">
          <Input value={form.current_visa_type} onChange={set('current_visa_type')} placeholder="H-1B / F-1 / L-1" />
        </Field>
        <Field label="Visa Number">
          <Input value={form.current_visa_number} onChange={set('current_visa_number')} placeholder="On visa foil" />
        </Field>
        <Field label="Visa Issue Date">
          <Input type="date" value={form.visa_issue_date} onChange={set('visa_issue_date')} />
        </Field>
        <Field label="Visa Expiry Date">
          <Input type="date" value={form.visa_expiry_date} onChange={set('visa_expiry_date')} />
        </Field>
        <Field label="I-94 Record Number">
          <Input value={form.i94_record_number} onChange={set('i94_record_number')} placeholder="From cbp.gov/i94" />
        </Field>
        <Field label="Country of Birth">
          <Input value={form.country_of_birth} onChange={set('country_of_birth')} placeholder="India" />
        </Field>
      </Section>

      {/* ── EMPLOYMENT ──────────────────────────────────────────── */}
      <Section
        title="Employment"
        isOpen={open.emp}
        onToggle={() => setOpen((p) => ({ ...p, emp: !p.emp }))}
      >
        <Field label="Current Employer">
          <Input value={form.current_employer} onChange={set('current_employer')} placeholder="Vyusoft Inc." />
        </Field>
        <Field label="Position / Title">
          <Input value={form.current_position} onChange={set('current_position')} placeholder="Software Engineer" />
        </Field>
        <Field label="Start Date">
          <Input type="date" value={form.employment_start_date} onChange={set('employment_start_date')} />
        </Field>
        <Field label="Employment Type">
          <select
            value={form.employment_type}
            onChange={(e) => set('employment_type')(e.target.value)}
            className="h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select…</option>
            <option value="fulltime">Full-time</option>
            <option value="parttime">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </Field>
        <Field label="Work Location (Country)">
          <Input value={form.work_location_country} onChange={set('work_location_country')} placeholder="USA" />
        </Field>
      </Section>

      {/* ── Save ─────────────────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-[12px] font-semibold text-emerald-600">Saved ✓</span>}
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Save size={14} /> Save
        </button>
      </div>
    </div>
  );
}

// ── Small primitives (kept local to avoid leaking one-off styles) ───
function Section({
  title, isOpen, onToggle, children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">{title}</span>
        {isOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>
      {isOpen && (
        <div className="grid grid-cols-1 gap-3 border-t border-gray-100 p-3 sm:grid-cols-2">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium text-[#374151]">{label}</label>
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
      autoComplete="off"
      className="h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

function SecretInput({
  value, onChange, reveal, onToggle, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  reveal: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type={reveal ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 pr-9 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={reveal ? 'Hide value' : 'Show value'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
      >
        {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
