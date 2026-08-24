// src/pages/hr/HRI9SplitEditorPage.tsx
//
// HR-side split editor for USCIS Form I-9. Left = the same PDF the
// employee sees, live-filled with their Section 1 submission (read-only)
// PLUS the HR-provided Section 2 fields (editable). Right side = only
// Section 2 fields — Document Title / Issuing Authority / Number /
// Expiration for List A OR List B+C, Additional Information, First Day
// of Employment, Employer Business Name/Address, employer signature.
//
// Data storage is shared with the employee via the same i9Form.api.ts —
// so when gowtham submits his H-1B I-9 as employee, opening the same
// case here on HR side pre-fills Section 1 from his record and lets HR
// add Section 2 without losing his data. Double-buffered iframes keep
// the preview smooth (no black flash on regen).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import type { I9FormData, I9FormRecord } from '../../types/employee/i9.types';
import { EMPTY_I9 } from '../../types/employee/i9.types';
import { loadOrCreateI9, saveI9Draft } from '../../api/employee/i9Form.api';
import { buildPdfFieldValues } from '../employee/i9PdfFieldMap';

const I9_PDF_PATH = '/i9.pdf';

export default function HRI9SplitEditorPage() {
  const { applicationId = '' } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [record, setRecord]   = useState<I9FormRecord | null>(null);
  const [form,   setForm]     = useState<I9FormData>(EMPTY_I9);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const templateRef            = useRef<ArrayBuffer | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Double buffer identical to employee editor
  const [urlA,      setUrlA]      = useState<string | null>(null);
  const [urlB,      setUrlB]      = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<0 | 1>(0);
  const pendingIdxRef = useRef<0 | 1 | null>(null);
  const iframeARef    = useRef<HTMLIFrameElement>(null);
  const iframeBRef    = useRef<HTMLIFrameElement>(null);
  // Remember the visible PDF's scroll position + URL hash so we can
  // restore it on the newly-swapped iframe (blob URLs are same-origin,
  // scrollTo works; #page=X&zoom=… hash is respected by Chrome/Edge).
  const scrollYRef    = useRef<number>(0);
  const hashRef       = useRef<string>('');
  const pdfUrl = activeIdx === 0 ? urlA : urlB;

  // ── Load record + template ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await loadOrCreateI9(applicationId || 'no-app');
        if (cancelled) return;
        const safeData = { ...EMPTY_I9, ...(rec.data ?? {}) };
        setRecord({ ...rec, data: safeData });
        setForm(safeData);

        const res = await fetch(I9_PDF_PATH);
        if (!res.ok) throw new Error(`Could not fetch I-9 template (${res.status})`);
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

  // ── PDF fill (on-demand via Sync button, no auto-regen) ─────────────
  const activeIdxRef = useRef<0 | 1>(0);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const regenerate = useCallback(async (values: I9FormData) => {
    if (!templateRef.current) return;
    try {
      const bytes = templateRef.current.slice(0);
      const pdfDoc = await PDFDocument.load(bytes);
      const pdfForm = pdfDoc.getForm();
      const { texts, checkboxes, dropdowns } = buildPdfFieldValues(values);

      for (const t of texts) { try { pdfForm.getTextField(t.name).setText(t.value || ''); } catch { /* absent */ } }
      for (const c of checkboxes) { try { const cb = pdfForm.getCheckBox(c.name); c.checked ? cb.check() : cb.uncheck(); } catch { /* absent */ } }
      for (const dd of dropdowns) {
        if (!dd.value) continue;
        try { pdfForm.getDropdown(dd.name).select(dd.value); } catch { /* absent */ }
      }

      pdfForm.updateFieldAppearances();
      const out = await pdfDoc.save({ useObjectStreams: false });
      const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Snapshot the currently-visible iframe's scroll + PDF hash BEFORE
      // we swap. That way when the hidden buffer becomes visible it can
      // jump straight to the same scroll position + page.
      const currentRef = activeIdxRef.current === 0 ? iframeARef : iframeBRef;
      try {
        const cw = currentRef.current?.contentWindow;
        if (cw) {
          scrollYRef.current = cw.scrollY || cw.pageYOffset || 0;
          const h = (cw.location && cw.location.hash) || '';
          if (h) hashRef.current = h;
        }
      } catch { /* cross-origin on some builds — ignore */ }

      const nextIdx: 0 | 1 = activeIdxRef.current === 0 ? 1 : 0;
      pendingIdxRef.current = nextIdx;
      if (nextIdx === 0) setUrlA((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      else               setUrlB((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch (e) { console.error('[hr i9] fill failed', e); }
  }, []);

  useEffect(() => {
    if (!templateRef.current || urlA || urlB) return;
    regenerate(form);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // NOTE: no auto-regen on form change. Chrome's built-in PDF viewer
  // resets scroll on every blob-URL swap and doesn't respect scrollTo,
  // so live updates would kick the user back to page 1 every keystroke.
  // Instead, they type freely and click "🔄 Sync PDF" in the toolbar
  // (or Save / Download) when they want the preview to catch up.

  const handleIframeLoad = useCallback((idx: 0 | 1) => {
    if (pendingIdxRef.current !== idx) return;
    setActiveIdx(idx);
    pendingIdxRef.current = null;

    // Restore scroll position on the freshly-visible iframe. Two rAF ticks
    // to let the PDF viewer paint before we scroll it. This is what stops
    // the "PDF jumps back to Section 1" feeling on every keystroke.
    const newRef = idx === 0 ? iframeARef : iframeBRef;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const cw = newRef.current?.contentWindow;
          if (cw && scrollYRef.current) {
            cw.scrollTo(0, scrollYRef.current);
          }
        } catch { /* ignore */ }
      });
    });
  }, []);

  useEffect(() => () => {
    if (urlA) URL.revokeObjectURL(urlA);
    if (urlB) URL.revokeObjectURL(urlB);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-save + manual save ─────────────────────────────────────────
  const saveTimer = useRef<number | null>(null);
  const scheduleSave = useCallback((next: I9FormData) => {
    if (!record) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try { const u = await saveI9Draft(record, next); setRecord(u); setSavedAt(new Date().toLocaleTimeString()); }
      catch { /* silent */ } finally { setSaving(false); }
    }, 1200);
  }, [record]);

  const patch = (p: Partial<I9FormData>) => setForm((f) => { const next = { ...f, ...p }; scheduleSave(next); return next; });

  // Explicit "Sync PDF" — regenerates the preview on demand
  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    await regenerate(form);
    // small delay so the toolbar spinner is visible during the swap
    setTimeout(() => setSyncing(false), 400);
  };

  const handleSave = async () => {
    if (!record) return;
    setSaving(true); setError(null);
    try {
      const u = await saveI9Draft(record, form);
      setRecord(u); setSavedAt(new Date().toLocaleTimeString());
      // Also refresh the PDF so the saved values are visible right away.
      await regenerate(form);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); } finally { setSaving(false); }
  };

  const handleDownload = async () => {
    // Ensure the PDF reflects the current form before downloading
    await regenerate(form);
    // Wait one paint for the new blob URL to swap in
    await new Promise((r) => setTimeout(r, 250));
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `Form-I-9-employer-${form.last_name || 'draft'}.pdf`;
    a.click();
  };

  if (loading) return <div className="p-10 text-center text-sm text-gray-500">Loading Form I-9…</div>;

  const employeeSubmitted = record?.status === 'submitted';

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="flex flex-none items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/employer/visa-forms')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">← Visa Forms</button>
          <div>
            <p className="text-sm font-bold text-gray-900">Form I-9 — Section 2 (Employer)</p>
            <p className="text-[11px] text-gray-500">Employment Eligibility Verification</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">{saving ? '💾 Saving…' : savedAt ? `Saved ${savedAt}` : 'Draft'}</span>
          <button onClick={handleSync} disabled={syncing}
            title="Update the PDF preview with the values on the right"
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
            {syncing ? 'Syncing…' : '🔄 Sync PDF'}
          </button>
          <button onClick={handleDownload} disabled={!pdfUrl}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            📥 Download PDF
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50">
            {saving ? 'Saving…' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Split body */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* LEFT — PDF preview */}
        <div className="relative flex-1 min-w-0 bg-slate-200 md:border-r md:border-gray-300">
          {pdfError ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <p className="text-sm font-semibold text-red-700">⚠ Could not load the I-9 template — {pdfError}</p>
            </div>
          ) : !urlA && !urlB ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Preparing PDF preview…</div>
          ) : (
            <>
              <iframe
                ref={iframeARef}
                title="I-9 preview A"
                src={urlA ? `${urlA}${hashRef.current || '#toolbar=1&navpanes=0&view=FitH'}` : 'about:blank'}
                onLoad={() => handleIframeLoad(0)}
                className="absolute inset-0 h-full w-full"
                style={{ opacity: activeIdx === 0 ? 1 : 0, pointerEvents: activeIdx === 0 ? 'auto' : 'none', transition: 'opacity 120ms ease-out' }} />
              <iframe
                ref={iframeBRef}
                title="I-9 preview B"
                src={urlB ? `${urlB}${hashRef.current || '#toolbar=1&navpanes=0&view=FitH'}` : 'about:blank'}
                onLoad={() => handleIframeLoad(1)}
                className="absolute inset-0 h-full w-full"
                style={{ opacity: activeIdx === 1 ? 1 : 0, pointerEvents: activeIdx === 1 ? 'auto' : 'none', transition: 'opacity 120ms ease-out' }} />
            </>
          )}
        </div>

        {/* RIGHT — employer fields */}
        <aside className="w-full flex-none overflow-y-auto bg-white p-4 md:w-[460px] md:p-5 lg:w-[500px]">
          {/* Employee submission summary (read-only) */}
          <section className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Section 1 — from employee</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {employeeSubmitted ? '✓ Submitted' : 'Draft'}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <ReadRow label="Employee" value={[form.first_name, form.last_name].filter(Boolean).join(' ') || '—'} />
              <ReadRow label="DOB" value={form.date_of_birth || '—'} />
              <ReadRow label="Email" value={form.email || '—'} />
              <ReadRow label="Phone" value={form.phone || '—'} />
              <ReadRow label="SSN" value={form.ssn || '—'} />
              <ReadRow label="Citizenship" value={form.citizenship_status ? `Status ${form.citizenship_status}` : '—'} />
            </dl>
            <p className="mt-1 text-[10px] italic text-emerald-700">Anti-discrimination rule: HR must NOT edit these fields.</p>
          </section>

          <Group title="List A — Establishes both identity & work authorization"
                 subtitle="ORmutually-exclusive with List B + C below.">
            <F label="Document Title"><T v={form.s2_list_a_title} on={(v) => patch({ s2_list_a_title: v })} /></F>
            <F label="Issuing Authority"><T v={form.s2_list_a_issuing_authority} on={(v) => patch({ s2_list_a_issuing_authority: v })} /></F>
            <Row2>
              <F label="Document Number"><T v={form.s2_list_a_document_number} on={(v) => patch({ s2_list_a_document_number: v })} /></F>
              <F label="Expiration">
                <input type="date" value={form.s2_list_a_expiration} onChange={(e) => patch({ s2_list_a_expiration: e.target.value })} className={inputCls} />
              </F>
            </Row2>
          </Group>

          <Group title="List B — Identity" subtitle="Combined with List C below.">
            <F label="Document Title"><T v={form.s2_list_b_title} on={(v) => patch({ s2_list_b_title: v })} /></F>
            <F label="Issuing Authority"><T v={form.s2_list_b_issuing_authority} on={(v) => patch({ s2_list_b_issuing_authority: v })} /></F>
            <Row2>
              <F label="Document Number"><T v={form.s2_list_b_document_number} on={(v) => patch({ s2_list_b_document_number: v })} /></F>
              <F label="Expiration">
                <input type="date" value={form.s2_list_b_expiration} onChange={(e) => patch({ s2_list_b_expiration: e.target.value })} className={inputCls} />
              </F>
            </Row2>
          </Group>

          <Group title="List C — Work Authorization" subtitle="Combined with List B above.">
            <F label="Document Title"><T v={form.s2_list_c_title} on={(v) => patch({ s2_list_c_title: v })} /></F>
            <F label="Issuing Authority"><T v={form.s2_list_c_issuing_authority} on={(v) => patch({ s2_list_c_issuing_authority: v })} /></F>
            <Row2>
              <F label="Document Number"><T v={form.s2_list_c_document_number} on={(v) => patch({ s2_list_c_document_number: v })} /></F>
              <F label="Expiration">
                <input type="date" value={form.s2_list_c_expiration} onChange={(e) => patch({ s2_list_c_expiration: e.target.value })} className={inputCls} />
              </F>
            </Row2>
          </Group>

          <Group title="Additional Information">
            <textarea rows={3} value={form.s2_additional_information} onChange={(e) => patch({ s2_additional_information: e.target.value })} className={inputCls} placeholder="Enter any additional documentation info; see instructions." />
          </Group>

          <Group title="Employer Attestation">
            <F label="First Day of Employment">
              <input type="date" value={form.s2_first_day_of_employment} onChange={(e) => patch({ s2_first_day_of_employment: e.target.value })} className={inputCls} />
            </F>
            <F label="Employer/Authorized Representative — Full Name + Title">
              <T v={form.s2_employer_signature_name} on={(v) => patch({ s2_employer_signature_name: v })} placeholder="e.g. Jane Doe, HR Manager" />
            </F>
            <F label="Signature Date">
              <input type="date" value={form.s2_employer_signature_date} onChange={(e) => patch({ s2_employer_signature_date: e.target.value })} className={inputCls} />
            </F>
            <F label="Employer's Business or Organization Name">
              <T v={form.s2_employer_business_name} on={(v) => patch({ s2_employer_business_name: v })} />
            </F>
            <F label="Business Address (Street, City, State, ZIP)">
              <T v={form.s2_employer_business_address} on={(v) => patch({ s2_employer_business_address: v })} />
            </F>
          </Group>

          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        </aside>
      </div>
    </div>
  );
}

/* ── UI helpers ─────────────────────────────────────────────────── */
const inputCls = 'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

function T({ v, on, placeholder }: { v: string; on: (x: string) => void; placeholder?: string }) {
  return <input type="text" value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className={inputCls} />;
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-[11px] font-semibold text-gray-700">{label}</label>{children}</div>;
}
function Group({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <h3 className="border-b border-gray-100 pb-1.5 text-[12px] font-bold uppercase tracking-wide text-gray-800">{title}</h3>
      {subtitle && <p className="mt-1 text-[10px] italic text-gray-500">{subtitle}</p>}
      <div className="mt-2 space-y-2.5">{children}</div>
    </section>
  );
}
function Row2({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-2">{children}</div>; }
function ReadRow({ label, value }: { label: string; value: string }) {
  return (<><dt className="text-emerald-700">{label}</dt><dd className="text-gray-900 font-medium">{value}</dd></>);
}
