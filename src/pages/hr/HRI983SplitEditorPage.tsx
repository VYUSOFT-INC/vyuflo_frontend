// src/pages/hr/HRI983SplitEditorPage.tsx
//
// HR-side split editor for Form I-983. Mirrors the employee I-983 editor:
//   • Left  — full 5-page ICE I-983 PDF, live-filled with pdf-lib.
//   • Right — employer-fillable sections only:
//         Section 3 — Employer Information
//         Section 5 — Training Plan
//         Section 6 — Employer Certification (typed signature)
//     Student Section 1 (and student certification in Section 2) are shown
//     as a compact read-only summary at the top; the student is the ONLY
//     party allowed to modify those fields.
//
// Same record (I983FormRecord) is shared between the student and HR
// editors — both sides call loadOrCreateI983(applicationId), and every
// draft persists via the same localStorage key so HR sees the student's
// submitted Section 1 pre-filled in the PDF preview.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import type {
  I983FormData, I983FormRecord,
} from '../../types/employee/i983.types';
import {
  EMPTY_I983, isI983EmployerReadyToSubmit,
} from '../../types/employee/i983.types';
import {
  loadOrCreateI983, saveI983Draft, submitI983, saveLocalDraft,
} from '../../api/employee/i983Form.api';
import { listFormCorrections } from '../../api/lawyer/forms.api';
import { buildPdfFieldValues } from '../employee/i983PdfFieldMap';
import FormStatusBadge from '../../components/forms/FormStatusBadge';

const I983_PDF_PATH = '/i983.pdf';

export default function HRI983SplitEditorPage() {
  const { applicationId = '' } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [record,     setRecord]     = useState<I983FormRecord | null>(null);
  const [form,       setForm]       = useState<I983FormData>(EMPTY_I983);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [savedAt,    setSavedAt]    = useState<string | null>(null);

  const templateRef            = useRef<ArrayBuffer | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Double-buffered iframes
  const [urlA,      setUrlA]      = useState<string | null>(null);
  const [urlB,      setUrlB]      = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<0 | 1>(0);
  const pendingIdxRef = useRef<0 | 1 | null>(null);
  const iframeARef    = useRef<HTMLIFrameElement>(null);
  const iframeBRef    = useRef<HTMLIFrameElement>(null);
  const scrollYRef    = useRef<number>(0);
  const hashRef       = useRef<string>('');
  const pdfUrl = activeIdx === 0 ? urlA : urlB;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await loadOrCreateI983(applicationId || 'no-app');
        if (cancelled) return;
        const safeData = { ...EMPTY_I983, ...(rec.data ?? {}) };
        const corrections = await listFormCorrections('i983', rec.id).catch(() => []);
        setRecord({ ...rec, data: safeData, open_corrections: corrections });
        setForm(safeData);

        const res = await fetch(I983_PDF_PATH);
        if (!res.ok) throw new Error(`Could not fetch I-983 template (${res.status})`);
        templateRef.current = await res.arrayBuffer();
      } catch (e) {
        if (!cancelled) {
          if (e instanceof Error && e.message.includes('template')) setPdfError(e.message);
          else setError(e instanceof Error ? e.message : 'Failed to load form.');
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);

  const activeIdxRef = useRef<0 | 1>(0);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const regenerate = useCallback(async (values: I983FormData) => {
    if (!templateRef.current) return;
    try {
      const bytes  = templateRef.current.slice(0);
      const pdfDoc = await PDFDocument.load(bytes);
      const pdfForm = pdfDoc.getForm();
      const { texts, checkboxes, dropdowns } = buildPdfFieldValues(values);

      for (const t of texts) {
        try {
          const tf = pdfForm.getTextField(t.name);
          tf.setText(t.value || '');
          // Force a sensible fixed font size — without this pdf-lib leaves
          // the field on auto-size, so short strings inside big text-area
          // fields (Section 5 training-plan boxes) render at 30-40pt.
          try { tf.setFontSize(9); } catch { /* not all fields accept it */ }
        } catch { /* absent */ }
      }
      for (const c of checkboxes) {
        try { const cb = pdfForm.getCheckBox(c.name); c.checked ? cb.check() : cb.uncheck(); } catch { /* absent */ }
      }
      for (const dd of dropdowns) {
        if (!dd.value) continue;
        try { pdfForm.getDropdown(dd.name).select(dd.value); } catch { /* absent */ }
      }

      pdfForm.updateFieldAppearances();
      const out  = await pdfDoc.save({ useObjectStreams: false });
      const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);

      const currentRef = activeIdxRef.current === 0 ? iframeARef : iframeBRef;
      try {
        const cw = currentRef.current?.contentWindow;
        if (cw) {
          scrollYRef.current = cw.scrollY || cw.pageYOffset || 0;
          const h = (cw.location && cw.location.hash) || '';
          if (h) hashRef.current = h;
        }
      } catch { /* ignore */ }

      const nextIdx: 0 | 1 = activeIdxRef.current === 0 ? 1 : 0;
      pendingIdxRef.current = nextIdx;
      if (nextIdx === 0) setUrlA((p) => { if (p) URL.revokeObjectURL(p); return url; });
      else               setUrlB((p) => { if (p) URL.revokeObjectURL(p); return url; });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[hr i983 split editor] fill failed', e);
    }
  }, []);

  useEffect(() => {
    if (!templateRef.current || urlA || urlB) return;
    regenerate(form);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleIframeLoad = useCallback((idx: 0 | 1) => {
    if (pendingIdxRef.current !== idx) return;
    setActiveIdx(idx);
    pendingIdxRef.current = null;
    const newRef = idx === 0 ? iframeARef : iframeBRef;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const cw = newRef.current?.contentWindow;
          if (cw && scrollYRef.current) cw.scrollTo(0, scrollYRef.current);
        } catch { /* ignore */ }
      });
    });
  }, []);

  useEffect(() => () => {
    if (urlA) URL.revokeObjectURL(urlA);
    if (urlB) URL.revokeObjectURL(urlB);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTimer = useRef<number | null>(null);
  const scheduleSave = useCallback((next: I983FormData) => {
    if (!record || record.status === 'submitted') return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const u = await saveI983Draft(record, next);
        setRecord(u); setSavedAt(new Date().toLocaleTimeString());
      } catch { /* local draft still safe */ }
      finally { setSaving(false); }
    }, 1200);
  }, [record]);

  const patch = (p: Partial<I983FormData>) => setForm((f) => {
    const next = { ...f, ...p };
    scheduleSave(next);
    return next;
  });

  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    await regenerate(form);
    setTimeout(() => setSyncing(false), 400);
  };

  const handleSave = async () => {
    if (!record) return;
    setSaving(true); setError(null);
    try {
      const u = await saveI983Draft(record, form);
      setRecord(u); setSavedAt(new Date().toLocaleTimeString());
      await regenerate(form);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!record) return;
    if (!isI983EmployerReadyToSubmit(form)) {
      setError('Please complete every required employer field, the training plan, and type your signature.');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const finalForm: I983FormData = {
        ...form,
        employer_signature_date:
          form.employer_signature_date || new Date().toISOString().slice(0, 10),
        section6_employer_date:
          form.section6_employer_date || new Date().toISOString().slice(0, 10),
      };
      const u = await submitI983(record, finalForm);
      const withReview = { ...u, review_status: 'hr_approved' as const };
      saveLocalDraft(withReview);
      setRecord(withReview); setForm(finalForm);
      await regenerate(finalForm);
    } catch (e) { setError(e instanceof Error ? e.message : 'Submit failed.'); }
    finally { setSubmitting(false); }
  };

  const handleDownload = async () => {
    await regenerate(form);
    await new Promise((r) => setTimeout(r, 250));
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `Form-I-983-${form.student_surname || 'draft'}.pdf`;
    a.click();
  };

  // HR editor locks Section 3/5/6 once HR submits. Unlocks again if the
  // lawyer requests corrections targeting HR.
  const hasHrCorrection = (record?.open_corrections ?? []).some((c) => c.target === 'hr');
  const isLocked =
    !hasHrCorrection &&
    (record?.review_status === 'hr_approved' ||
     record?.review_status === 'approved' ||
     record?.review_status === 'completed');
  const previewLoaded = !!pdfUrl;

  if (loading) return <div className="p-10 text-center text-sm text-gray-500">Loading Form I-983…</div>;

  const studentFullName = [form.student_surname, form.student_given_name].filter(Boolean).join(', ') || '—';

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="flex flex-none items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/employer/visa-forms')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">← Visa Forms</button>
          <div>
            <p className="text-sm font-bold text-gray-900">Form I-983 — Employer Sections</p>
            <p className="text-[11px] text-gray-500">STEM OPT Training Plan · Sections 3, 5 &amp; 6</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FormStatusBadge role="hr" status={record?.review_status ?? (record?.status === 'submitted' ? 'submitted' : 'draft')} compact />
          <span className="text-[11px] text-gray-500">{saving ? '💾 Saving…' : savedAt ? `Saved ${savedAt}` : ''}</span>
          <button onClick={handleSync} disabled={syncing}
            title="Update the PDF preview with values from the right pane"
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
            {syncing ? 'Syncing…' : '🔄 Sync PDF'}
          </button>
          <button onClick={handleDownload} disabled={!previewLoaded}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            📥 Download PDF
          </button>
          <button onClick={handleSave} disabled={saving || isLocked}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
            {saving ? 'Saving…' : '💾 Save'}
          </button>
          {isLocked ? (
            <span
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700"
              title="Employer sections submitted. HR can edit again only if the attorney requests corrections.">
              ✓ Submitted
            </span>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              title={hasHrCorrection ? 'Re-submit after fixing flagged fields' : (!isI983EmployerReadyToSubmit(form) ? 'Complete every required employer field first' : 'Submit Form I-983')}
              className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Submitting…' : hasHrCorrection ? '↻ Re-submit I-983' : '✓ Submit I-983'}
            </button>
          )}
        </div>
      </div>

      {/* Split body */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* LEFT — PDF preview */}
        <div className="relative flex-1 min-w-0 bg-slate-200 md:border-r md:border-gray-300">
          {pdfError ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm font-semibold text-red-700">⚠ Could not load the I-983 template</p>
                <p className="mt-1 text-xs text-gray-600">{pdfError}</p>
                <p className="mt-2 text-[11px] text-gray-500">Verify <code>/public/i983.pdf</code> exists.</p>
              </div>
            </div>
          ) : !urlA && !urlB ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Preparing PDF preview…
            </div>
          ) : (
            <>
              <iframe
                ref={iframeARef}
                title="Form I-983 preview A"
                src={urlA ? `${urlA}${hashRef.current || '#toolbar=1&navpanes=0&view=FitH'}` : 'about:blank'}
                onLoad={() => handleIframeLoad(0)}
                className="absolute inset-0 h-full w-full"
                style={{ opacity: activeIdx === 0 ? 1 : 0, pointerEvents: activeIdx === 0 ? 'auto' : 'none', transition: 'opacity 120ms ease-out' }}
              />
              <iframe
                ref={iframeBRef}
                title="Form I-983 preview B"
                src={urlB ? `${urlB}${hashRef.current || '#toolbar=1&navpanes=0&view=FitH'}` : 'about:blank'}
                onLoad={() => handleIframeLoad(1)}
                className="absolute inset-0 h-full w-full"
                style={{ opacity: activeIdx === 1 ? 1 : 0, pointerEvents: activeIdx === 1 ? 'auto' : 'none', transition: 'opacity 120ms ease-out' }}
              />
            </>
          )}
        </div>

        {/* RIGHT — editable employer fields */}
        <aside className="w-full flex-none overflow-y-auto bg-white p-4 md:w-[480px] md:p-5 lg:w-[520px]">
          {isLocked && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              ✓ Form submitted. Fields are locked. Use Download to save the filled PDF.
            </div>
          )}

          {(record?.open_corrections?.length ?? 0) > 0 && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold">⚠ Corrections requested by attorney</p>
              <ul className="mt-1.5 space-y-1.5">
                {record!.open_corrections!.filter((c) => c.target === 'hr').map((c) => (
                  <li key={c.id} className="rounded bg-white/60 p-2">
                    <p>{c.note}</p>
                    {c.fields.length > 0 && <p className="mt-0.5 text-[10px] text-amber-800">Fields: {c.fields.join(', ')}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Student Section 1 summary — read-only */}
          <section className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
              Student Section 1 · from employee
            </h3>
            <p className="text-[10px] text-indigo-800/70">
              Section 1 &amp; the student certification are filled by the employee. HR fills only Sections 3, 5, and 6.
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <RO label="Student" value={studentFullName} />
              <RO label="SEVIS ID" value={form.student_sevis_id} />
              <RO label="School" value={form.school_recommending} />
              <RO label="Degree" value={form.degree_level_type} />
              <RO label="Major"   value={form.qualifying_major} />
              <RO label="EAD #"   value={form.employment_authorization_number} />
              <RO label="OPT From" value={form.stem_opt_from} />
              <RO label="OPT To"   value={form.stem_opt_to} />
            </dl>
          </section>

          {/* Section 3 — Employer Information (all sub-blocks flat so the
              right pane matches the PDF top-to-bottom 1:1). */}
          <Group title="Section 3 · Employer Information">
            {/* — Employer identification — */}
            <F label="Employer Name" required>
              <T v={form.employer_name} on={(v) => patch({ employer_name: v })} d={isLocked} />
            </F>
            <Row2>
              <F label="Street Address" required>
                <T v={form.employer_street} on={(v) => patch({ employer_street: v })} d={isLocked} />
              </F>
              <F label="Suite">
                <T v={form.employer_suite} on={(v) => patch({ employer_suite: v })} d={isLocked} />
              </F>
            </Row2>
            <Row3>
              <F label="City" required>
                <T v={form.employer_city} on={(v) => patch({ employer_city: v })} d={isLocked} />
              </F>
              <F label="State" required>
                <T v={form.employer_state} on={(v) => patch({ employer_state: v.slice(0, 2).toUpperCase() })} d={isLocked} placeholder="CA" />
              </F>
              <F label="ZIP Code" required>
                <T v={form.employer_zip} on={(v) => patch({ employer_zip: v.replace(/[^0-9-]/g, '') })} d={isLocked} placeholder="12345" />
              </F>
            </Row3>
            <F label="Employer Website URL">
              <T v={form.employer_website} on={(v) => patch({ employer_website: v })} d={isLocked} placeholder="https://…" />
            </F>
            <Row2>
              <F label="Employer ID Number (EIN)" required>
                <T v={form.employer_ein} on={(v) => patch({ employer_ein: v })} d={isLocked} placeholder="12-3456789" />
              </F>
              <F label="Start Date of Employment" required>
                <input type="date" value={form.start_date_employment}
                  onChange={(e) => patch({ start_date_employment: e.target.value })}
                  disabled={isLocked} className={inputCls(isLocked)} />
              </F>
            </Row2>
            <F label="Printed Name of Employing Organization">
              <T v={form.printed_name_employing_org} on={(v) => patch({ printed_name_employing_org: v })} d={isLocked} placeholder="Defaults to Employer Name" />
            </F>

            {/* — Employment / OPT metrics — */}
            <Row2>
              <F label="Number of Full-Time Employees in US">
                <T v={form.num_ft_employees} on={(v) => patch({ num_ft_employees: v })} d={isLocked} placeholder="e.g. 250" />
              </F>
              <F label="NAICS Code">
                <T v={form.naics_code} on={(v) => patch({ naics_code: v })} d={isLocked} placeholder="e.g. 541511" />
              </F>
            </Row2>
            <Row2>
              <F label="OPT Hours per Week (≥ 20)" required>
                <T v={form.opt_hours_per_week} on={(v) => patch({ opt_hours_per_week: v })} d={isLocked} placeholder="e.g. 40" />
              </F>
              <F label="Annual Salary (USD)">
                <T v={form.annual_salary} on={(v) => patch({ annual_salary: v })} d={isLocked} placeholder="e.g. 92,000" />
              </F>
            </Row2>
            <F label="Other Compensation (up to 4)">
              <div className="space-y-1.5">
                <T v={form.other_compensation_1} on={(v) => patch({ other_compensation_1: v })} d={isLocked} placeholder="1 · Type + estimated value" />
                <T v={form.other_compensation_2} on={(v) => patch({ other_compensation_2: v })} d={isLocked} placeholder="2 · Type + estimated value" />
                <T v={form.other_compensation_3} on={(v) => patch({ other_compensation_3: v })} d={isLocked} placeholder="3 · Type + estimated value" />
                <T v={form.other_compensation_4} on={(v) => patch({ other_compensation_4: v })} d={isLocked} placeholder="4 · Type + estimated value" />
              </div>
            </F>

            {/* — Worksite — */}
            <F label="Site Name">
              <T v={form.site_name} on={(v) => patch({ site_name: v })} d={isLocked} />
            </F>
            <F label="Site Address (Street, City, State, ZIP)">
              <T v={form.site_address} on={(v) => patch({ site_address: v })} d={isLocked} />
            </F>

            {/* — Employer Official / Signatory — */}
            <F label="Name of Official" required>
              <T v={form.official_name} on={(v) => patch({ official_name: v })} d={isLocked} />
            </F>
            <F label="Official's Title">
              <T v={form.official_title} on={(v) => patch({ official_title: v })} d={isLocked} />
            </F>
            <Row2>
              <F label="Official's Email" required>
                <T v={form.official_email} on={(v) => patch({ official_email: v })} d={isLocked} placeholder="official@company.com" />
              </F>
              <F label="Official's Phone Number">
                <T v={form.official_phone} on={(v) => patch({ official_phone: v })} d={isLocked} placeholder="+1 555 000 1234" />
              </F>
            </Row2>
          </Group>

          {/* Section 4 — Employer Certification (the numbered oath +
              signature block at the end of Section 3 in the PDF). */}
          <Group title="Section 4 · Employer Certification">
            <p className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-[10px] text-amber-800">
              ⚠ By typing your name below you declare, under penalty of perjury, that the statements and information provided in Section 3 are true and correct.
            </p>
            <F label="Printed Name + Title of Employer Official with Signatory Authority" required>
              <T v={form.employer_signature_name_title}
                on={(v) => patch({ employer_signature_name_title: v })} d={isLocked}
                placeholder="e.g. Jane Doe, HR Director" />
            </F>
            <F label="Signature Date">
              <input type="date" value={form.employer_signature_date}
                onChange={(e) => patch({ employer_signature_date: e.target.value })}
                disabled={isLocked} className={inputCls(isLocked)} />
            </F>
          </Group>

          {/* Section 5 — Training Plan */}
          <Group title="Section 5 · Training Plan">
            <F label="Student's Role" required>
              <TA v={form.training_student_role} on={(v) => patch({ training_student_role: v })} d={isLocked}
                placeholder="Describe the student's role and how it relates to enhancing their STEM knowledge." />
            </F>
            <F label="Goals & Objectives" required>
              <TA v={form.training_goals_objectives} on={(v) => patch({ training_goals_objectives: v })} d={isLocked}
                placeholder="Specific goals in knowledge, skills, techniques + how they will be achieved." />
            </F>
            <F label="Employer Oversight & Supervision" required>
              <TA v={form.training_employer_oversight} on={(v) => patch({ training_employer_oversight: v })} d={isLocked}
                placeholder="How the employer supervises this role; describe any training program or policy." />
            </F>
            <F label="Measures & Assessments" required>
              <TA v={form.training_measures_assessments} on={(v) => patch({ training_measures_assessments: v })} d={isLocked}
                placeholder="How the employer measures whether the student is acquiring new knowledge and skills." />
            </F>
          </Group>

          {/* Section 6 — Employer Attestation (final signature) */}
          <Group title="Section 6 · Employer Attestation">
            <p className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-[10px] text-amber-800">
              ⚠ Final attestation for Section 5. By typing your name you certify the training plan above is accurate and that the employer will implement it.
            </p>
            <F label="Printed Name + Title of Employer Official with Signatory Authority" required>
              <T v={form.section6_employer_name_title}
                on={(v) => patch({ section6_employer_name_title: v })} d={isLocked}
                placeholder="e.g. Jane Doe, HR Director" />
            </F>
            <F label="Date">
              <input type="date" value={form.section6_employer_date}
                onChange={(e) => patch({ section6_employer_date: e.target.value })}
                disabled={isLocked} className={inputCls(isLocked)} />
            </F>
          </Group>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ── UI helpers ─────────────────────────────────────────────────────── */

const inputCls    = (d: boolean) => `w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100${d ? ' bg-gray-50 text-gray-600' : ''}`;
const textareaCls = (d: boolean) => `w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm min-h-[80px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100${d ? ' bg-gray-50 text-gray-600' : ''}`;

function T({ v, on, d, placeholder }: { v: string; on: (x: string) => void; d?: boolean; placeholder?: string }) {
  return <input type="text" value={v ?? ''} onChange={(e) => on(e.target.value)} disabled={d} placeholder={placeholder} className={inputCls(!!d)} />;
}
function TA({ v, on, d, placeholder }: { v: string; on: (x: string) => void; d?: boolean; placeholder?: string }) {
  return <textarea value={v ?? ''} onChange={(e) => on(e.target.value)} disabled={d} placeholder={placeholder} className={textareaCls(!!d)} />;
}
function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 border-b border-gray-100 pb-1.5 text-[12px] font-bold uppercase tracking-wide text-gray-800">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>;
}
function RO({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700/70">{label}</dt>
      <dd className="truncate text-[11px] font-medium text-indigo-900">{value || '—'}</dd>
    </>
  );
}
