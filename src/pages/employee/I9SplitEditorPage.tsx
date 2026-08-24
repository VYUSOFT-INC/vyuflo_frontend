// src/pages/employee/I9SplitEditorPage.tsx
//
// Split-pane I-9 editor. Left = the real USCIS Form I-9 (all 4 pages,
// rendered in the browser's native PDF viewer via iframe). Right =
// editable Section 1 fields. Every keystroke on the right updates the
// underlying AcroForm via pdf-lib and refreshes the iframe blob URL, so
// the PDF preview stays in sync in real time.
//
// Only Section 1 (employee-facing) is exposed as editable per USCIS
// anti-discrimination rules. Section 2 remains blank in the PDF — the
// attorney fills it later.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import type {
  I9FormData, I9FormRecord, CitizenshipStatus, AuthorizedAlienKey,
} from '../../types/employee/i9.types';
import {
  EMPTY_I9, CITIZENSHIP_LABEL, US_STATES,
  isReadyToSubmit,
} from '../../types/employee/i9.types';
import { loadOrCreateI9, saveI9Draft, submitI9 } from '../../api/employee/i9Form.api';
import { buildPdfFieldValues } from './i9PdfFieldMap';

/** Path (public folder) to the master I-9 PDF. */
const I9_PDF_PATH = '/i9.pdf';

export default function I9SplitEditorPage() {
  const { applicationId = '' } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [record,     setRecord]     = useState<I9FormRecord | null>(null);
  const [form,       setForm]       = useState<I9FormData>(EMPTY_I9);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [savedAt,    setSavedAt]    = useState<string | null>(null);

  // PDF template bytes (loaded once)
  const templateRef            = useRef<ArrayBuffer | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Double-buffered blob URLs — two iframes stacked. New PDF loads into
  // the hidden one; when its onLoad fires we flip z-index so the visible
  // PDF never blanks out on regeneration.
  const [urlA,      setUrlA]      = useState<string | null>(null);
  const [urlB,      setUrlB]      = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<0 | 1>(0);   // 0 = A visible, 1 = B visible
  const pendingIdxRef = useRef<0 | 1 | null>(null);
  const iframeARef    = useRef<HTMLIFrameElement>(null);
  const iframeBRef    = useRef<HTMLIFrameElement>(null);
  // Remember scroll position + PDF viewer hash so the newly-visible
  // iframe opens at the same place the user was reading.
  const scrollYRef    = useRef<number>(0);
  const hashRef       = useRef<string>('');
  const pdfUrl = activeIdx === 0 ? urlA : urlB;

  // ── Load record + template on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1. Load our persisted record (or a fresh blank).
        //    Older localStorage drafts may be missing recently-added fields
        //    (e.g. auth_key), which would blow up isBaseSectionComplete() the
        //    moment it dereferences `f.last_name`. Merge with EMPTY_I9 so
        //    every key exists.
        const rec = await loadOrCreateI9(applicationId || 'no-app');
        if (cancelled) return;
        const safeData = { ...EMPTY_I9, ...(rec.data ?? {}) };
        setRecord({ ...rec, data: safeData });
        setForm(safeData);

        // 2. Fetch the PDF template ONCE
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

  // ── Regenerate the filled PDF on demand ─────────────────────────────
  const activeIdxRef = useRef<0 | 1>(0);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const regenerate = useCallback(async (values: I9FormData) => {
    if (!templateRef.current) return;
    try {
      // pdf-lib mutates the loaded doc — reload a fresh copy each time
      const bytes = templateRef.current.slice(0);
      const pdfDoc = await PDFDocument.load(bytes);
      const pdfForm = pdfDoc.getForm();
      const { texts, checkboxes, dropdowns } = buildPdfFieldValues(values);

      for (const t of texts) {
        try { pdfForm.getTextField(t.name).setText(t.value || ''); } catch { /* field absent */ }
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

      // Snapshot the visible iframe's scroll + PDF viewer hash so we can
      // restore them on the newly-loaded buffer — this stops the "PDF
      // jumps back to Section 1" behaviour on every keystroke.
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
      console.error('[i9 split editor] fill failed', e);
    }
  }, []);

  // First render — as soon as the template is loaded, kick a regen
  useEffect(() => {
    if (!templateRef.current || urlA || urlB) return;
    regenerate(form);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // No live regen on typing. Chrome's PDF viewer resets scroll on every
  // blob-URL swap and ignores scrollTo, so live updates kick the user
  // back to page 1 each keystroke. User types freely and clicks 🔄 Sync
  // PDF (or Save/Download) to refresh the preview on demand.

  // Flip the visible iframe once the hidden one finishes loading, then
  // restore the previously-captured scroll position on the new buffer.
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

  // Cleanup both blobs on unmount
  useEffect(() => () => {
    if (urlA) URL.revokeObjectURL(urlA);
    if (urlB) URL.revokeObjectURL(urlB);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Backend save (debounced) ────────────────────────────────────────
  const saveTimer = useRef<number | null>(null);
  const scheduleSave = useCallback((next: I9FormData) => {
    if (!record || record.status === 'submitted') return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const u = await saveI9Draft(record, next);
        setRecord(u); setSavedAt(new Date().toLocaleTimeString());
      } catch { /* local draft still safe */ }
      finally { setSaving(false); }
    }, 1200);
  }, [record]);

  const patch = (p: Partial<I9FormData>) => setForm((f) => {
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
      const u = await saveI9Draft(record, form);
      setRecord(u); setSavedAt(new Date().toLocaleTimeString());
      await regenerate(form);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!record) return;
    if (!isReadyToSubmit(form)) { setError('Please complete every required field, choose citizenship, and type your signature.'); return; }
    setSubmitting(true); setError(null);
    try {
      const finalForm: I9FormData = {
        ...form,
        signature_date: form.signature_date || new Date().toISOString().slice(0, 10),
      };
      const u = await submitI9(record, finalForm);
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
    a.download = `Form-I-9-${form.last_name || 'draft'}.pdf`;
    a.click();
  };

  const isLocked = record?.status === 'submitted';
  const previewLoaded = !!pdfUrl;

  if (loading) return <div className="p-10 text-center text-sm text-gray-500">Loading Form I-9…</div>;

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="flex flex-none items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/my-forms')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">← My Forms</button>
          <div>
            <p className="text-sm font-bold text-gray-900">Form I-9 — Section 1</p>
            <p className="text-[11px] text-gray-500">Employment Eligibility Verification</p>
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
            <button onClick={handleSubmit} disabled={submitting || !isReadyToSubmit(form)}
              className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Submitting…' : '✓ Submit I-9'}
            </button>
          )}
        </div>
      </div>

      {/* Split body */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* LEFT — PDF preview (double-buffered: hidden iframe loads next
             version, then z-index flips so visible iframe never blanks) */}
        <div className="relative flex-1 min-w-0 bg-slate-200 md:border-r md:border-gray-300">
          {pdfError ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm font-semibold text-red-700">⚠ Could not load the I-9 template</p>
                <p className="mt-1 text-xs text-gray-600">{pdfError}</p>
                <p className="mt-2 text-[11px] text-gray-500">Verify <code>/public/i9.pdf</code> exists.</p>
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
                title="Form I-9 preview A"
                src={urlA ? `${urlA}${hashRef.current || '#toolbar=1&navpanes=0&view=FitH'}` : 'about:blank'}
                onLoad={() => handleIframeLoad(0)}
                className="absolute inset-0 h-full w-full"
                style={{ opacity: activeIdx === 0 ? 1 : 0, pointerEvents: activeIdx === 0 ? 'auto' : 'none', transition: 'opacity 120ms ease-out' }}
              />
              <iframe
                ref={iframeBRef}
                title="Form I-9 preview B"
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

          <Group title="Personal Information">
            <Row2>
              <F label="Last Name" required><T v={form.last_name} on={(v) => patch({ last_name: v })} d={isLocked} /></F>
              <F label="First Name" required><T v={form.first_name} on={(v) => patch({ first_name: v })} d={isLocked} /></F>
            </Row2>
            <Row2>
              <F label="Middle Initial"><T v={form.middle_initial} on={(v) => patch({ middle_initial: v.slice(0, 1) })} d={isLocked} placeholder="M" /></F>
              <F label="Other Last Names"><T v={form.other_last_names} on={(v) => patch({ other_last_names: v })} d={isLocked} /></F>
            </Row2>
          </Group>

          <Group title="Address">
            <F label="Street Address" required><T v={form.address} on={(v) => patch({ address: v })} d={isLocked} /></F>
            <Row2>
              <F label="Apt. Number"><T v={form.apt_number} on={(v) => patch({ apt_number: v })} d={isLocked} /></F>
              <F label="City" required><T v={form.city} on={(v) => patch({ city: v })} d={isLocked} /></F>
            </Row2>
            <Row2>
              <F label="State" required>
                <select value={form.state} onChange={(e) => patch({ state: e.target.value })} disabled={isLocked} className={selectCls(isLocked)}>
                  <option value="">— Select —</option>
                  {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
                </select>
              </F>
              <F label="ZIP Code" required><T v={form.zip_code} on={(v) => patch({ zip_code: v.replace(/[^0-9-]/g, '') })} d={isLocked} placeholder="12345" /></F>
            </Row2>
          </Group>

          <Group title="Contact & ID">
            <F label="Date of Birth" required>
              <input type="date" value={form.date_of_birth} onChange={(e) => patch({ date_of_birth: e.target.value })} disabled={isLocked} className={inputCls(isLocked)} />
            </F>
            <F label="U.S. Social Security Number"><T v={form.ssn} on={(v) => patch({ ssn: v })} d={isLocked} placeholder="123-45-6789" /></F>
            <F label="Email" required><T v={form.email} on={(v) => patch({ email: v })} d={isLocked} placeholder="you@company.com" /></F>
            <F label="Phone"><T v={form.phone} on={(v) => patch({ phone: v })} d={isLocked} placeholder="+1 555 000 1234" /></F>
          </Group>

          <Group title="Citizenship / Immigration Status">
            {(['1', '2', '3', '4'] as CitizenshipStatus[]).map((k) => (
              <label key={k}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition ${
                  form.citizenship_status === k
                    ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                } ${isLocked ? 'cursor-default opacity-70' : ''}`}
              >
                <input type="radio" name="c" value={k} checked={form.citizenship_status === k}
                  onChange={() => patch({ citizenship_status: k })} disabled={isLocked}
                  className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">{k}. {CITIZENSHIP_LABEL[k]}</p>

                  {k === '3' && form.citizenship_status === '3' && (
                    <div className="mt-2">
                      <F label="USCIS A-Number" required><T v={form.lpr_uscis_a_number} on={(v) => patch({ lpr_uscis_a_number: v })} d={isLocked} placeholder="A123456789" /></F>
                    </div>
                  )}

                  {k === '4' && form.citizenship_status === '4' && (
                    <div className="mt-2 space-y-2">
                      <F label="Authorized until" required>
                        <input type="date" value={form.work_authorized_until} onChange={(e) => patch({ work_authorized_until: e.target.value })} disabled={isLocked} className={inputCls(isLocked)} />
                      </F>
                      <p className="text-[10px] font-semibold text-gray-700">Provide ONE identifier <span className="text-red-500">*</span></p>
                      {(['uscis_a_number', 'i94_admission_number', 'foreign_passport'] as AuthorizedAlienKey[]).map((ak) => {
                        const labels = {
                          uscis_a_number:        'USCIS A-Number',
                          i94_admission_number:  'Form I-94 Admission Number',
                          foreign_passport:      'Foreign Passport + Country',
                        } as const;
                        return (
                          <div key={ak} className={`rounded-md border p-2 ${form.auth_key === ak ? 'border-indigo-400 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                            <label className="flex cursor-pointer items-center gap-2">
                              <input type="radio" name="ak" value={ak} checked={form.auth_key === ak}
                                onChange={() => patch({ auth_key: ak })} disabled={isLocked}
                                className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500" />
                              <span className="text-[11px] font-medium text-gray-800">{labels[ak]}</span>
                            </label>
                            {form.auth_key === ak && (
                              <div className="mt-2 pl-5">
                                {ak === 'uscis_a_number' && <T v={form.auth_uscis_a_number} on={(v) => patch({ auth_uscis_a_number: v })} d={isLocked} placeholder="A123456789" />}
                                {ak === 'i94_admission_number' && <T v={form.auth_i94_number} on={(v) => patch({ auth_i94_number: v })} d={isLocked} placeholder="11-digit I-94" />}
                                {ak === 'foreign_passport' && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <T v={form.auth_passport_number} on={(v) => patch({ auth_passport_number: v })} d={isLocked} placeholder="Passport #" />
                                    <T v={form.auth_passport_country} on={(v) => patch({ auth_passport_country: v })} d={isLocked} placeholder="Country" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </Group>

          <Group title="Signature">
            <F label="Type your full legal name" required>
              <T v={form.signature_typed_name} on={(v) => patch({ signature_typed_name: v })} d={isLocked} placeholder="e.g. Gowtham Laveti" />
            </F>
            <F label="Today's Date">
              <input readOnly value={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                className={inputCls(true)} />
            </F>
            <p className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-[10px] text-amber-800">
              ⚠ Federal law provides penalties for false statements. By typing your name, you attest under penalty of perjury.
            </p>
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

