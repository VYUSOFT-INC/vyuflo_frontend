// src/pages/employee/I983FormPage.tsx
//
// Digital ICE Form I-983 — STEM OPT Training Plan (student side).
// Employee fills Section 1 (Student Information) + Section 2 (Signature).
// Employer sections (3, 4, 5, 6) + DSO evaluations remain blank in preview.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { I983FormData, I983FormRecord } from '../../types/employee/i983.types';
import {
  EMPTY_I983, DEGREE_LEVELS,
  isI983StudentSectionComplete, isI983SignatureComplete, isI983ReadyToSubmit,
} from '../../types/employee/i983.types';
import { loadOrCreateI983, saveI983Draft, submitI983 } from '../../api/employee/i983Form.api';
import I983PrintPreview from './I983PrintPreview';

export default function I983FormPage() {
  const { applicationId = '' } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [record, setRecord]     = useState<I983FormRecord | null>(null);
  const [form,   setForm]       = useState<I983FormData>(EMPTY_I983);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [savedAt, setSavedAt]   = useState<string | null>(null);

  useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      if (!applicationId) {
        throw new Error('Application ID is missing.');
      }

      const rec = await loadOrCreateI983(applicationId);

      if (cancelled) return;

      setRecord(rec);

      // Always keep form as a valid I983FormData object.
      // Backend may return missing/null data for a new record.
      setForm({
        ...EMPTY_I983,
        ...(rec.data ?? {}),
      });
    } catch (e) {
      if (!cancelled) {
        setError(
          e instanceof Error ? e.message : 'Failed to load form.'
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}, [applicationId]);

  const debounceTimer = useRef<number | null>(null);
  const scheduleSave = useCallback((next: I983FormData) => {
    if (!record || record.status === 'submitted') return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try { const u = await saveI983Draft(record, next); setRecord(u); setSavedAt(new Date().toLocaleTimeString()); }
      catch { /* silent */ } finally { setSaving(false); }
    }, 1200);
  }, [record]);

  const patch = (p: Partial<I983FormData>) => setForm((f) => { const next = { ...f, ...p }; scheduleSave(next); return next; });

  

  const handleSubmit = async () => {
    if (!record) return;
    if (!isI983ReadyToSubmit(form)) { setError('Complete every required field and type your signature.'); return; }
    setSubmitting(true); setError(null);
    try {
      const finalForm: I983FormData = { ...form, student_signature_date: form.student_signature_date || new Date().toISOString().slice(0, 10) };
      const u = await submitI983(record, finalForm);
      setRecord(u); setForm(finalForm); setPreview(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Submit failed.'); }
    finally { setSubmitting(false); }
  };

  const isLocked = record?.status === 'submitted';

  if (preview && record) {
  return (
    <I983PrintPreview
      record={{ ...record, data: form }}
      onBack={() => setPreview(false)}
      onExit={() => navigate('/my-forms')}
    />
  );
}
  if (loading) return <div className="p-10 text-center text-sm text-gray-500">Loading Form I-983…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <button onClick={() => navigate('/my-forms')} className="mb-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800">← Back to My Forms</button>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Form I-983 — Training Plan for STEM OPT Students</h1>
              <p className="mt-0.5 text-xs text-gray-500">Section 1 (Student Information) + Section 2 (Certification)</p>
            </div>
            <StatusBadge status={record?.status ?? 'draft'} savedAt={savedAt} saving={saving} />
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ You've submitted this form. Your employer and DSO will complete the remaining sections.
          {' '}<button onClick={() => setPreview(true)} className="ml-1 font-semibold underline">Open preview</button>
        </div>
      )}

      {/* SECTION 1 — Student Information */}
      <FormSection title="Section 1 — Student Information" subtitle="Complete every field. Federal law requires accurate reporting.">
        <FieldRow>
          <Field label="Student Name — Surname / Primary Name" required col2><TextInput v={form.student_surname} on={(v) => patch({ student_surname: v })} d={isLocked} /></Field>
          <Field label="Student Name — Given Name" required col2><TextInput v={form.student_given_name} on={(v) => patch({ student_given_name: v })} d={isLocked} /></Field>
        </FieldRow>
        <FieldRow>
          <Field label="Student Email Address" required col2><TextInput v={form.student_email} on={(v) => patch({ student_email: v })} d={isLocked} placeholder="you@school.edu" /></Field>
          <Field label="Employment Authorization Number (from EAD)" required col2><TextInput v={form.employment_authorization_number} on={(v) => patch({ employment_authorization_number: v })} d={isLocked} placeholder="EAC/MSC/…" /></Field>
        </FieldRow>

        <FieldRow>
          <Field label="Name of School Recommending STEM OPT" required col2><TextInput v={form.school_recommending} on={(v) => patch({ school_recommending: v })} d={isLocked} /></Field>
          <Field label="Name of School Where STEM Degree Was Earned" required col2><TextInput v={form.school_stem_degree} on={(v) => patch({ school_stem_degree: v })} d={isLocked} /></Field>
        </FieldRow>
        <FieldRow>
          <Field label="SEVIS School Code (including 3-digit suffix)" required col2><TextInput v={form.sevis_school_code} on={(v) => patch({ sevis_school_code: v })} d={isLocked} placeholder="XXX00000000-000" /></Field>
          <Field label="Student SEVIS ID Number" required col2><TextInput v={form.student_sevis_id} on={(v) => patch({ student_sevis_id: v })} d={isLocked} placeholder="N0000000000" /></Field>
        </FieldRow>

        <FieldRow>
          <Field label="DSO Name" required col2><TextInput v={form.dso_name} on={(v) => patch({ dso_name: v })} d={isLocked} /></Field>
          <Field label="DSO Email" required col2><TextInput v={form.dso_email} on={(v) => patch({ dso_email: v })} d={isLocked} placeholder="dso@school.edu" /></Field>
        </FieldRow>
        <FieldRow>
          <Field label="DSO Phone Number" col2><TextInput v={form.dso_phone} on={(v) => patch({ dso_phone: v })} d={isLocked} placeholder="+1 555 000 1234" /></Field>
          <Field label="STEM OPT Requested Period — From" required>
            <input type="date" value={form.stem_opt_from} onChange={(e) => patch({ stem_opt_from: e.target.value })} disabled={isLocked} className={inputCls + (isLocked ? ' bg-gray-50' : '')} />
          </Field>
          <Field label="To" required>
            <input type="date" value={form.stem_opt_to} onChange={(e) => patch({ stem_opt_to: e.target.value })} disabled={isLocked} className={inputCls + (isLocked ? ' bg-gray-50' : '')} />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Qualifying Major" required col2><TextInput v={form.qualifying_major} on={(v) => patch({ qualifying_major: v })} d={isLocked} placeholder="Computer Science" /></Field>
          <Field label="Classification of Instructional Programs (CIP) Code" col2><TextInput v={form.cip_code} on={(v) => patch({ cip_code: v })} d={isLocked} placeholder="11.0701" /></Field>
        </FieldRow>
        <FieldRow>
          <Field label="Level / Type of Qualifying Degree" required>
            <select value={form.degree_level_type} onChange={(e) => patch({ degree_level_type: e.target.value })} disabled={isLocked} className={inputCls + (isLocked ? ' bg-gray-50' : '')}>
              <option value="">— Select —</option>
              {DEGREE_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
          </Field>
          <Field label="Date Awarded"><input type="date" value={form.degree_date_awarded} onChange={(e) => patch({ degree_date_awarded: e.target.value })} disabled={isLocked} className={inputCls + (isLocked ? ' bg-gray-50' : '')} /></Field>
          <Field label="Based on Prior Degree?" col2>
            <div className="flex gap-2 pt-1">
              {(['yes', 'no'] as const).map((v) => (
                <label key={v} className={`flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-center text-sm font-semibold transition ${form.based_on_prior_degree === v ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200' : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'} ${isLocked ? 'cursor-default opacity-70' : ''}`}>
                  <input type="radio" checked={form.based_on_prior_degree === v} onChange={() => patch({ based_on_prior_degree: v })} disabled={isLocked} className="hidden" />
                  {v === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </Field>
        </FieldRow>
      </FormSection>

      {/* SECTION 2 — Signature */}
      <FormSection title="Section 2 — Student Certification"
                   subtitle="By typing your name below, you attest under penalty of perjury that all information in this Plan is true and correct.">
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800">
          <p>I certify that: (1) I have reviewed and will adhere to this Training Plan; (2) I will notify my DSO if my employer isn't providing training as delineated; (3) DHS may deny/revoke my STEM OPT if I or my employer don't comply; (4) my training is directly related to my STEM degree; (5) I will notify my DSO of any material changes to this Plan.</p>
        </div>
        <FieldRow>
          <Field label="Type your full legal name" required col2><TextInput v={form.student_signature_typed_name} on={(v) => patch({ student_signature_typed_name: v })} d={isLocked} placeholder="e.g. Gowtham Laveti" /></Field>
          <Field label="Today's Date" col2>
            <input readOnly value={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} className={inputCls + ' bg-gray-50 text-gray-500'} />
          </Field>
        </FieldRow>
      </FormSection>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="sticky bottom-0 mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center gap-4 text-xs text-gray-600">
          <StepDot done={isI983StudentSectionComplete(form)} label="Student Info" />
          <span className="text-gray-300">→</span>
          <StepDot done={isI983SignatureComplete(form)} label="Signature" />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => setPreview(true)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">👁 Preview</button>
          {!isLocked && (
            <button onClick={handleSubmit} disabled={!isI983ReadyToSubmit(form) || submitting}
              className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Submitting…' : '✓ Submit I-983'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── UI helpers ─────────────────────────────────────────────────────── */
const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

function TextInput({ v, on, d, placeholder }: { v: string; on: (x: string) => void; d?: boolean; placeholder?: string }) {
  return <input type="text" value={v} onChange={(e) => on(e.target.value)} disabled={d} placeholder={placeholder} className={inputCls + (d ? ' bg-gray-50' : '')} />;
}

function FormSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
function FieldRow({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">{children}</div>; }
function Field({ label, required, full, col2, children }: { label: string; required?: boolean; full?: boolean; col2?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'sm:col-span-4' : col2 ? 'sm:col-span-2' : 'sm:col-span-1'}>
      <label className="mb-1 block text-xs font-semibold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  );
}
function StepDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${done ? 'text-emerald-700' : 'text-gray-400'}`}>
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${done ? 'bg-emerald-500' : 'bg-gray-300'}`}>{done ? '✓' : ''}</span>{label}
    </span>
  );
}
function StatusBadge({ status, savedAt, saving }: { status: 'draft' | 'submitted'; savedAt: string | null; saving: boolean }) {
  if (status === 'submitted') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">✓ Submitted</span>;
  return <div className="flex items-center gap-2 text-[11px] text-gray-500">{saving ? '💾 Saving…' : savedAt ? `Saved ${savedAt}` : 'Draft'}</div>;
}
