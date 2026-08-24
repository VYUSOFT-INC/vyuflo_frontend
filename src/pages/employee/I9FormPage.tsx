// src/pages/employee/I9FormPage.tsx
//
// Digital I-9 (Employment Eligibility Verification) — employee-side.
// Reproduces USCIS Form I-9 Section 1 as an editable HTML form.
// Employee fills, previews, submits. Preview screen supports browser
// print → save as PDF. Data stored as JSON on backend + localStorage
// draft mirror.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  I9FormData, I9FormRecord, CitizenshipStatus, AuthorizedAlienKey,
} from '../../types/employee/i9.types';
import {
  EMPTY_I9, CITIZENSHIP_LABEL, US_STATES,
  isBaseSectionComplete, isAttestationComplete, isSignatureComplete, isReadyToSubmit,
} from '../../types/employee/i9.types';
import { loadOrCreateI9, saveI9Draft, submitI9 } from '../../api/employee/i9Form.api';
import I9PrintPreview from './I9PrintPreview';

export default function I9FormPage() {
  const { applicationId = '' } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [record,   setRecord]   = useState<I9FormRecord | null>(null);
  const [form,     setForm]     = useState<I9FormData>(EMPTY_I9);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview,  setPreview]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [savedAt,  setSavedAt]  = useState<string | null>(null);

  // ── Load on mount ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await loadOrCreateI9(applicationId || 'no-app');
        if (cancelled) return;
        setRecord(rec);
   setForm({
    ...EMPTY_I9,
    ...(rec.data ?? {}),
    });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load form.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);

  // ── Auto-save on change (debounced) ─────────────────────────────────
  const debounceTimer = useRef<number | null>(null);
  const scheduleSave = useCallback((nextForm: I9FormData) => {
    if (!record || record.status === 'submitted') return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const updated = await saveI9Draft(record, nextForm);
        setRecord(updated);
        setSavedAt(new Date().toLocaleTimeString());
      } catch { /* silent — local draft still safe */ }
      finally { setSaving(false); }
    }, 1200);
  }, [record]);

  const patch = (p: Partial<I9FormData>) => {
  setForm((f) => {
    const next = { ...EMPTY_I9, ...f, ...p };
    scheduleSave(next);
    return next;
  });
};

  // ── Submit ───────────────────────────────────────────────────────────

  const handlePreview = () => {
  if (!record) return;

  setRecord({
    ...record,
    data: {
      ...EMPTY_I9,
      ...(record.data ?? {}),
      ...form,
    },
  });

  setPreview(true);
  };
  const handleSubmit = async () => {
    if (!record) return;
    if (!isReadyToSubmit(form)) {
      setError('Please complete every required field, choose your citizenship attestation, and type your signature name.');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      // Auto-fill signature_date to today if empty
      const finalForm: I9FormData = {
        ...form,
        signature_date: form.signature_date || new Date().toISOString().slice(0, 10),
      };
      const updated = await submitI9(record, finalForm);
      setRecord(updated);
      setForm(finalForm);
      setPreview(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed.');
    } finally { setSubmitting(false); }
  };

  const isLocked = record?.status === 'submitted';

  // ── Preview mode ─────────────────────────────────────────────────────
  if (preview && record) {
    return (
      <I9PrintPreview
        record={record}
        onBack={() => setPreview(false)}
        onExit={() => navigate('/my-forms')}
      />
    );
  }

  if (loading) return <div className="p-10 text-center text-sm text-gray-500">Loading Form I-9…</div>;

  // ── Editor ───────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/my-forms')} className="mb-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          ← Back to My Forms
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Form I-9 — Employment Eligibility Verification</h1>
              <p className="mt-0.5 text-xs text-gray-500">USCIS Section 1 — Employee Information and Attestation</p>
            </div>
            <StatusBadge status={record?.status ?? 'draft'} savedAt={savedAt} saving={saving} />
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ You've submitted this form. Your attorney will complete Section 2 and share the final signed PDF with you.
          {' '}<button onClick={handlePreview} className="ml-1 font-semibold underline">
        Open preview
     </button>
        </div>
      )}

      {/* SECTION 1 — Employee Information */}
      <FormSection title="Section 1 — Employee Information and Attestation"
                   subtitle="Complete before your first day of employment. Federal law provides penalties for false statements.">

        {/* Name block */}
        <FieldRow>
          <Field label="Last Name (Family Name)" required>
            <TextInput value={form.last_name} onChange={(v) => patch({ last_name: v })} disabled={isLocked} />
          </Field>
          <Field label="First Name (Given Name)" required>
            <TextInput value={form.first_name} onChange={(v) => patch({ first_name: v })} disabled={isLocked} />
          </Field>
          <Field label="Middle Initial">
            <TextInput value={form.middle_initial} onChange={(v) => patch({ middle_initial: v.slice(0, 1) })} disabled={isLocked} placeholder="M" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Other Last Names Used (if any)" full>
            <TextInput value={form.other_last_names} onChange={(v) => patch({ other_last_names: v })} disabled={isLocked} placeholder="Maiden, alias, etc." />
          </Field>
        </FieldRow>

        {/* Address */}
        <FieldRow>
          <Field label="Address (Street Number and Name)" required col2>
            <TextInput value={form.address} onChange={(v) => patch({ address: v })} disabled={isLocked} />
          </Field>
          <Field label="Apt. Number">
            <TextInput value={form.apt_number} onChange={(v) => patch({ apt_number: v })} disabled={isLocked} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="City or Town" required>
            <TextInput value={form.city} onChange={(v) => patch({ city: v })} disabled={isLocked} />
          </Field>
          <Field label="State" required>
            <select
              value={form.state}
              onChange={(e) => patch({ state: e.target.value })}
              disabled={isLocked}
              className={inputCls + (isLocked ? ' bg-gray-50' : '')}
            >
              <option value="">— Select —</option>
              {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
            </select>
          </Field>
          <Field label="ZIP Code" required>
            <TextInput value={form.zip_code} onChange={(v) => patch({ zip_code: v.replace(/[^0-9-]/g, '') })} disabled={isLocked} placeholder="12345" />
          </Field>
        </FieldRow>

        {/* Personal identifiers */}
        <FieldRow>
          <Field label="Date of Birth" required>
            <input type="date" value={form.date_of_birth} onChange={(e) => patch({ date_of_birth: e.target.value })} disabled={isLocked}
              className={inputCls + (isLocked ? ' bg-gray-50' : '')} />
          </Field>
          <Field label="U.S. Social Security Number">
            <TextInput value={form.ssn} onChange={(v) => patch({ ssn: v })} disabled={isLocked} placeholder="123-45-6789" />
          </Field>
          <Field label="Email Address" required>
            <TextInput value={form.email} onChange={(v) => patch({ email: v })} disabled={isLocked} placeholder="you@company.com" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Telephone Number" full>
            <TextInput value={form.phone} onChange={(v) => patch({ phone: v })} disabled={isLocked} placeholder="+1 555 000 1234" />
          </Field>
        </FieldRow>
      </FormSection>

      {/* CITIZENSHIP ATTESTATION */}
      <FormSection title="Citizenship / Immigration Status Attestation" subtitle="Check exactly ONE box below.">
        <div className="space-y-2">
          {(['1', '2', '3', '4'] as CitizenshipStatus[]).map((k) => (
            <label key={k}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                form.citizenship_status === k
                  ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              } ${isLocked ? 'cursor-default opacity-70' : ''}`}
            >
              <input type="radio" name="citizenship" value={k} checked={form.citizenship_status === k}
                onChange={() => patch({ citizenship_status: k })} disabled={isLocked}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{k}. {CITIZENSHIP_LABEL[k]}</p>

                {/* (3) LPR — A-Number field */}
                {k === '3' && form.citizenship_status === '3' && (
                  <div className="mt-2">
                    <Field label="USCIS A-Number" required>
                      <TextInput value={form.lpr_uscis_a_number} onChange={(v) => patch({ lpr_uscis_a_number: v })} disabled={isLocked} placeholder="A123456789" />
                    </Field>
                  </div>
                )}

                {/* (4) Alien authorized — full sub-form */}
                {k === '4' && form.citizenship_status === '4' && (
                  <div className="mt-2 space-y-3">
                    <Field label="Authorized to work until (expiration date, if any)" required>
                      <input type="date" value={form.work_authorized_until}
                        onChange={(e) => patch({ work_authorized_until: e.target.value })}
                        disabled={isLocked}
                        className={inputCls + (isLocked ? ' bg-gray-50' : '')} />
                    </Field>

                    <div>
                      <p className="mb-2 text-xs font-semibold text-gray-700">Provide ONE of these identifiers <span className="text-red-500">*</span></p>
                      <div className="space-y-2">
                        <AuthOption
                          k="uscis_a_number" label="USCIS A-Number"
                          checked={form.auth_key === 'uscis_a_number'}
                          disabled={isLocked}
                          onPick={() => patch({ auth_key: 'uscis_a_number' })}
                        >
                          {form.auth_key === 'uscis_a_number' && (
                            <TextInput value={form.auth_uscis_a_number} onChange={(v) => patch({ auth_uscis_a_number: v })} disabled={isLocked} placeholder="A123456789" />
                          )}
                        </AuthOption>
                        <AuthOption
                          k="i94_admission_number" label="Form I-94 Admission Number"
                          checked={form.auth_key === 'i94_admission_number'}
                          disabled={isLocked}
                          onPick={() => patch({ auth_key: 'i94_admission_number' })}
                        >
                          {form.auth_key === 'i94_admission_number' && (
                            <TextInput value={form.auth_i94_number} onChange={(v) => patch({ auth_i94_number: v })} disabled={isLocked} placeholder="11-digit I-94" />
                          )}
                        </AuthOption>
                        <AuthOption
                          k="foreign_passport" label="Foreign Passport Number + Country of Issuance"
                          checked={form.auth_key === 'foreign_passport'}
                          disabled={isLocked}
                          onPick={() => patch({ auth_key: 'foreign_passport' })}
                        >
                          {form.auth_key === 'foreign_passport' && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <TextInput value={form.auth_passport_number} onChange={(v) => patch({ auth_passport_number: v })} disabled={isLocked} placeholder="Passport number" />
                              <TextInput value={form.auth_passport_country} onChange={(v) => patch({ auth_passport_country: v })} disabled={isLocked} placeholder="Country of issuance" />
                            </div>
                          )}
                        </AuthOption>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      </FormSection>

      {/* SIGNATURE */}
      <FormSection title="Signature of Employee" subtitle="Typing your full legal name below acts as your electronic signature. Today's date will be recorded on submit.">
        <FieldRow>
          <Field label="Type your full legal name" required col2>
            <TextInput value={form.signature_typed_name} onChange={(v) => patch({ signature_typed_name: v })} disabled={isLocked} placeholder="e.g. Gowtham Laveti" />
          </Field>
          <Field label="Today's Date">
            <input type="text" readOnly value={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              className={inputCls + ' bg-gray-50 text-gray-500'} />
          </Field>
        </FieldRow>

        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800">
          ⚠ <b>Federal law</b> provides for imprisonment and/or fines for false statements or use of false documents in connection with this form. By signing, you attest that all information is true and correct.
        </div>
      </FormSection>

      {/* Error banner */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Progress + Actions */}
      <div className="sticky bottom-0 mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center gap-4 text-xs text-gray-600">
          <StepDot done={isBaseSectionComplete(form)} label="Personal" />
          <span className="text-gray-300">→</span>
          <StepDot done={isAttestationComplete(form)} label="Attestation" />
          <span className="text-gray-300">→</span>
          <StepDot done={isSignatureComplete(form)} label="Signature" />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
      onClick={handlePreview}
      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
>
       👁 Preview
      </button>
          {!isLocked && (
            <button onClick={handleSubmit} disabled={!isReadyToSubmit(form) || submitting}
              className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Submitting…' : '✓ Submit I-9'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── UI helpers ─────────────────────────────────────────────────────── */

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

function TextInput({
  value, onChange, disabled, placeholder,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      disabled={disabled} placeholder={placeholder}
      className={inputCls + (disabled ? ' bg-gray-50' : '')} />
  );
}

function FormSection({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">{children}</div>;
}

function Field({
  label, required, full, col2, children,
}: { label: string; required?: boolean; full?: boolean; col2?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'sm:col-span-4' : col2 ? 'sm:col-span-2' : 'sm:col-span-1'}>
      <label className="mb-1 block text-xs font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function AuthOption({
  k, label, checked, disabled, onPick, children,
}: {
  k: AuthorizedAlienKey; label: string; checked: boolean; disabled?: boolean;
  onPick: () => void; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border p-2 ${checked ? 'border-indigo-400 bg-white' : 'border-gray-200 bg-gray-50'}`}>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="radio" name="auth_key" value={k} checked={checked} onChange={onPick} disabled={disabled}
          className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500" />
        <span className="text-xs font-medium text-gray-800">{label}</span>
      </label>
      {children && <div className="mt-2 pl-5">{children}</div>}
    </div>
  );
}

function StepDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${done ? 'text-emerald-700' : 'text-gray-400'}`}>
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${done ? 'bg-emerald-500' : 'bg-gray-300'}`}>
        {done ? '✓' : ''}
      </span>
      {label}
    </span>
  );
}

function StatusBadge({
  status, savedAt, saving,
}: { status: 'draft' | 'submitted'; savedAt: string | null; saving: boolean }) {
  if (status === 'submitted') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">✓ Submitted</span>;
  }
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-500">
      {saving ? '💾 Saving…' : savedAt ? `Saved ${savedAt}` : 'Draft'}
    </div>
  );
}

