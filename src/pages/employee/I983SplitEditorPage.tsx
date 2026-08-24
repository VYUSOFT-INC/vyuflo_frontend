// src/pages/employee/I983SplitEditorPage.tsx
//
// Split-pane I-983 editor — same UX as the I-9 split editor. Left pane
// shows the real ICE Form I-983 (all 5 pages, rendered in the browser's
// native PDF viewer via iframe). Right pane exposes only the student-
// fillable sections:
//   • Section 1 — Student Information
//   • Section 2 — Student Certification (typed signature)
//
// Employer + DSO sections stay blank in the preview and are filled later
// by HR/attorney/DSO through their own flows.
//
// Behavioural notes (kept in sync with I9SplitEditorPage):
//   • Typing does NOT auto-regen the PDF — Chrome's built-in PDF viewer
//     resets scroll on every blob-URL swap and there's no reliable way to
//     preserve position. User types freely and clicks 🔄 Sync PDF when
//     they want to see the values applied. Save / Submit / Download
//     auto-sync so the persisted PDF is always up-to-date.
//   • Double-buffered iframes (two stacked, opacity swap on load) hide
//     the black flash that Chrome shows during a fresh iframe load.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import type {
  I983FormData, I983FormRecord,
} from '../../types/employee/i983.types';
import {
  EMPTY_I983, DEGREE_LEVELS, isI983ReadyToSubmit,
} from '../../types/employee/i983.types';
import { loadOrCreateI983, saveI983Draft, submitI983 } from '../../api/employee/i983Form.api';
import { buildPdfFieldValues } from './i983PdfFieldMap';

/** Path (public folder) to the master I-983 PDF. */
const I983_PDF_PATH = '/i983.pdf';

export default function I983SplitEditorPage() {
  const { applicationId = '' } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [record,     setRecord]     = useState<I983FormRecord | null>(null);
  const [form,       setForm]       = useState<I983FormData>(EMPTY_I983);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [savedAt,    setSavedAt]    = useState<string | null>(null);

  // PDF template bytes (loaded once)
  const templateRef            = useRef<ArrayBuffer | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Double-buffered blob URLs
  const [urlA,      setUrlA]      = useState<string | null>(null);
  const [urlB,      setUrlB]      = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<0 | 1>(0);
  const pendingIdxRef = useRef<0 | 1 | null>(null);
  const iframeARef    = useRef<HTMLIFrameElement>(null);
  const iframeBRef    = useRef<HTMLIFrameElement>(null);
  const scrollYRef    = useRef<number>(0);
  const hashRef       = useRef<string>('');
  const pdfUrl = activeIdx === 0 ? urlA : urlB;

  // ── Load record + template on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await loadOrCreateI983(applicationId || 'no-app');
        if (cancelled) return;
        // Merge with EMPTY_I983 so newly-added fields on older drafts
        // never crash the validation helpers.
        const safeData = { ...EMPTY_I983, ...(rec.data ?? {}) };
        setRecord({ ...rec, data: safeData });
        setForm(safeData);

        const res = await fetch(I983_PDF_PATH);
        if (!res.ok) throw new Error(`Could not fetch I-983 template (${res.status})`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        templateRef.current = buf;
      } catch (e) {
        if (!cancelled) {
          if (e instanceof Error && e.message.includes('template')) setPdfError(e.message);
          else setError(e instanceof Error ? e.message : 'Failed to load form.');
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);

  // ── Regenerate the filled PDF ───────────────────────────────────────
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
          // Force a fixed font size — the I-983 template has several big
          // text-area fields (Section 5) that render at 30-40pt on auto-size.
          try { tf.setFontSize(9); } catch { /* not all fields accept it */ }
        } catch { /* field absent */ }
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

      if (nextIdx === 0) {
        setUrlA((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      } else {
        setUrlB((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[i983 split editor] fill failed', e);
    }
  }, []);

  // First render — as soon as the template is loaded, kick a regen
  useEffect(() => {
    if (!templateRef.current || urlA || urlB) return;
    regenerate(form);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // No live regen on typing — manual Sync button + Save/Submit/Download trigger.

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

  // ── Backend save (debounced) ────────────────────────────────────────
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

  // ── Manual Sync / Save / Submit / Download ──────────────────────────
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
    if (!isI983ReadyToSubmit(form)) {
      setError('Please complete every required field in Section 1 and type your signature.'); return;
    }
    setSubmitting(true); setError(null);
    try {
      const finalForm: I983FormData = {
        ...form,
        student_signature_date: form.student_signature_date || new Date().toISOString().slice(0, 10),
      };
      const u = await submitI983(record, finalForm);
      setRecord(u); setForm(finalForm);
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

  const isLocked = record?.status === 'submitted';
  const previewLoaded = !!pdfUrl;

  if (loading) return <div className="p-10 text-center text-sm text-gray-500">Loading Form I-983…</div>;

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="flex flex-none items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/my-forms')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">← My Forms</button>
          <div>
            <p className="text-sm font-bold text-gray-900">Form I-983 — Student Sections</p>
            <p className="text-[11px] text-gray-500">STEM OPT Training Plan · Sections 1 &amp; 2</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={record?.status ?? 'draft'} savedAt={savedAt} saving={saving} />
          <button onClick={handleSync} disabled={syncing}
            title="Update the PDF preview with values from the right pane"
            className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50">
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
          {!isLocked && (
            <button onClick={handleSubmit} disabled={submitting || !isI983ReadyToSubmit(form)}
              className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Submitting…' : '✓ Submit I-983'}
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

        {/* RIGHT — editable fields */}
        <aside className="w-full flex-none overflow-y-auto bg-white p-4 md:w-[440px] md:p-5 lg:w-[480px]">
          {isLocked && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              ✓ Form submitted. Fields are locked. Use Download to save the filled PDF.
            </div>
          )}

          {/* Section 1 */}
          <Group title="Section 1 · Student Information">
            <Row2>
              <F label="Surname / Primary Name" required>
                <T v={form.student_surname} on={(v) => patch({ student_surname: v })} d={isLocked} />
              </F>
              <F label="Given Name" required>
                <T v={form.student_given_name} on={(v) => patch({ student_given_name: v })} d={isLocked} />
              </F>
            </Row2>
            <F label="Student Email" required>
              <T v={form.student_email} on={(v) => patch({ student_email: v })} d={isLocked} placeholder="you@school.edu" />
            </F>
            <F label="Student SEVIS ID" required>
              <T v={form.student_sevis_id} on={(v) => patch({ student_sevis_id: v })} d={isLocked} placeholder="N0001234567" />
            </F>
            <F label="Employment Authorization Number (EAD)" required>
              <T v={form.employment_authorization_number} on={(v) => patch({ employment_authorization_number: v })} d={isLocked} />
            </F>
          </Group>

          <Group title="School / DSO">
            <F label="School Recommending STEM OPT" required>
              <T v={form.school_recommending} on={(v) => patch({ school_recommending: v })} d={isLocked} />
            </F>
            <F label="School Where STEM Degree Was Earned" required>
              <T v={form.school_stem_degree} on={(v) => patch({ school_stem_degree: v })} d={isLocked} />
            </F>
            <F label="SEVIS School Code (incl. 3-digit suffix)" required>
              <T v={form.sevis_school_code} on={(v) => patch({ sevis_school_code: v })} d={isLocked} placeholder="ABC214F00123" />
            </F>
            <F label="DSO Name" required>
              <T v={form.dso_name} on={(v) => patch({ dso_name: v })} d={isLocked} />
            </F>
            <Row2>
              <F label="DSO Email" required>
                <T v={form.dso_email} on={(v) => patch({ dso_email: v })} d={isLocked} placeholder="dso@school.edu" />
              </F>
              <F label="DSO Phone">
                <T v={form.dso_phone} on={(v) => patch({ dso_phone: v })} d={isLocked} placeholder="+1 555 000 1234" />
              </F>
            </Row2>
          </Group>

          <Group title="Degree Details">
            <F label="Qualifying Major" required>
              <T v={form.qualifying_major} on={(v) => patch({ qualifying_major: v })} d={isLocked} placeholder="Computer Science" />
            </F>
            <Row2>
              <F label="CIP Code">
                <T v={form.cip_code} on={(v) => patch({ cip_code: v })} d={isLocked} placeholder="11.0701" />
              </F>
              <F label="Degree Level" required>
                <select value={form.degree_level_type}
                  onChange={(e) => patch({ degree_level_type: e.target.value })}
                  disabled={isLocked} className={selectCls(isLocked)}>
                  <option value="">— Select —</option>
                  {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </F>
            </Row2>
            <F label="Date Awarded">
              <input type="date" value={form.degree_date_awarded}
                onChange={(e) => patch({ degree_date_awarded: e.target.value })}
                disabled={isLocked} className={inputCls(isLocked)} />
            </F>
            <F label="Is this STEM OPT based on a prior degree?">
              <div className="flex gap-4 pt-1">
                {(['yes', 'no'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-xs text-gray-700">
                    <input type="radio" name="prior" value={v}
                      checked={form.based_on_prior_degree === v}
                      onChange={() => patch({ based_on_prior_degree: v })}
                      disabled={isLocked}
                      className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500" />
                    <span className="capitalize">{v}</span>
                  </label>
                ))}
              </div>
            </F>
          </Group>

          <Group title="STEM OPT Requested Period">
            <Row2>
              <F label="From" required>
                <input type="date" value={form.stem_opt_from}
                  onChange={(e) => patch({ stem_opt_from: e.target.value })}
                  disabled={isLocked} className={inputCls(isLocked)} />
              </F>
              <F label="To" required>
                <input type="date" value={form.stem_opt_to}
                  onChange={(e) => patch({ stem_opt_to: e.target.value })}
                  disabled={isLocked} className={inputCls(isLocked)} />
              </F>
            </Row2>
          </Group>

          {/* Section 2 */}
          <Group title="Section 2 · Student Certification">
            <p className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-[10px] text-amber-800">
              ⚠ By typing your name you certify, under penalty of perjury, that the information provided in Section 1 is true and correct.
            </p>
            <F label="Printed name of student" required>
              <T v={form.student_signature_typed_name}
                on={(v) => patch({ student_signature_typed_name: v })}
                d={isLocked} placeholder="e.g. Gowtham Laveti" />
            </F>
            <F label="Signature date">
              <input type="date"
                value={form.student_signature_date}
                onChange={(e) => patch({ student_signature_date: e.target.value })}
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

const inputCls  = (d: boolean) => `w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100${d ? ' bg-gray-50 text-gray-600' : ''}`;
const selectCls = (d: boolean) => inputCls(d);

function T({ v, on, d, placeholder }: { v: string; on: (x: string) => void; d?: boolean; placeholder?: string }) {
  return <input type="text" value={v} onChange={(e) => on(e.target.value)} disabled={d} placeholder={placeholder} className={inputCls(!!d)} />;
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
function StatusBadge({ status, savedAt, saving }: { status: 'draft' | 'submitted'; savedAt: string | null; saving: boolean }) {
  if (status === 'submitted') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">✓ Submitted</span>;
  return <span className="text-[11px] text-gray-500">{saving ? '💾 Saving…' : savedAt ? `Saved ${savedAt}` : 'Draft'}</span>;
}
