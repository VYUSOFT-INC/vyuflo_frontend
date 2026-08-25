// src/pages/lawyer/LawyerFormReviewPage.tsx
//
// Attorney's review screen for one submitted form (I-9 OR I-983).
// Left: live-filled PDF preview (read-only). Right: employee + HR field
// summary + review actions (Approve / Request Corrections) + version
// history drawer. Same pdf-lib fill pipeline as the employee/HR editors
// so the preview is byte-identical to what they see.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';

import type { I9FormRecord } from '../../types/employee/i9.types';
import type { I983FormRecord } from '../../types/employee/i983.types';
import { EMPTY_I9 }   from '../../types/employee/i9.types';
import { EMPTY_I983 } from '../../types/employee/i983.types';

import { buildPdfFieldValues as buildI9 }   from '../employee/i9PdfFieldMap';
import { buildPdfFieldValues as buildI983 } from '../employee/i983PdfFieldMap';

import {
  getLawyerI9, getLawyerI983,
  approveForm, requestCorrections, listFormVersions, listFormCorrections,
  type FormType, type FormVersionItem,
} from '../../api/lawyer/forms.api';

import FormStatusBadge from '../../components/forms/FormStatusBadge';
import RequestCorrectionsModal from '../../components/forms/RequestCorrectionsModal';

const I9_PDF_PATH   = '/i9.pdf';
const I983_PDF_PATH = '/i983.pdf';

/** Union of the two record shapes so the page can render either. */
type AnyRecord = I9FormRecord | I983FormRecord;

interface Props {
  formType: FormType;
}

export default function LawyerFormReviewPage({ formType }: Props) {
  const { applicationId = '' } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [record,   setRecord]   = useState<AnyRecord | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [pdfUrl,   setPdfUrl]   = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [busyAction, setBusyAction] = useState<'approve' | 'reject' | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [versions,   setVersions]   = useState<FormVersionItem[] | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const templateRef = useRef<ArrayBuffer | null>(null);

  // ── Load record + PDF template + versions ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const rec = formType === 'i9'
          ? await getLawyerI9(applicationId)
          : await getLawyerI983(applicationId);
        if (cancelled) return;
        // Corrections are not embedded on the form response — fetch
        // separately (per backend design) so we can render the open
        // corrections panel + rehydrate the amber banner.
        const corrections = await listFormCorrections(formType, rec.id).catch(() => []);
        setRecord({ ...rec, open_corrections: corrections });

        // Fetch template
        const res = await fetch(formType === 'i9' ? I9_PDF_PATH : I983_PDF_PATH);
        if (!res.ok) throw new Error(`Could not fetch ${formType.toUpperCase()} template (${res.status})`);
        templateRef.current = await res.arrayBuffer();
        await regenerate(rec);

        // Version history (fire-and-forget)
        listFormVersions(formType, rec.id).then((v) => { if (!cancelled) setVersions(v); }).catch(() => {});
      } catch (e) {
        if (!cancelled) {
          if (e instanceof Error && e.message.includes('template')) setPdfError(e.message);
          else setError(e instanceof Error ? e.message : 'Failed to load form.');
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, formType]);

  // ── PDF regen ───────────────────────────────────────────────────────
  const regenerate = useCallback(async (rec: AnyRecord) => {
    if (!templateRef.current) return;
    try {
      const bytes  = templateRef.current.slice(0);
      const pdfDoc = await PDFDocument.load(bytes);
      const pdfForm = pdfDoc.getForm();
      const values = formType === 'i9'
        ? buildI9({ ...EMPTY_I9,   ...(rec.data as I9FormRecord['data']) })
        : buildI983({ ...EMPTY_I983, ...(rec.data as I983FormRecord['data']) });

      for (const t of values.texts) {
        try { const tf = pdfForm.getTextField(t.name); tf.setText(t.value || ''); try { tf.setFontSize(9); } catch { /* */ } } catch { /* */ }
      }
      for (const c of values.checkboxes) {
        try { const cb = pdfForm.getCheckBox(c.name); c.checked ? cb.check() : cb.uncheck(); } catch { /* */ }
      }
      for (const dd of values.dropdowns) {
        if (!dd.value) continue;
        try { pdfForm.getDropdown(dd.name).select(dd.value); } catch { /* */ }
      }
      pdfForm.updateFieldAppearances();
      const out  = await pdfDoc.save({ useObjectStreams: false });
      const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      setPdfUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[lawyer review] fill failed', e);
    }
  }, [formType]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!record) return;
    if (!confirm('Approve this form? The employee and HR will be notified.')) return;
    setBusyAction('approve'); setError(null);
    try {
      const updated = await approveForm(formType, record.id) as AnyRecord;
      setRecord(updated);
      await regenerate(updated);
    } catch (e) { setError(e instanceof Error ? e.message : 'Approve failed.'); }
    finally { setBusyAction(null); }
  };

  const submitCorrections = async (payload: { target: 'employee' | 'hr'; note: string; fields: string[] }) => {
    if (!record) return;
    setBusyAction('reject'); setError(null);
    try {
      const updated = await requestCorrections(formType, record.id, payload) as AnyRecord;
      setRecord(updated);
      setModalOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send corrections.'); throw e; }
    finally { setBusyAction(null); }
  };

  const status = record?.review_status ?? 'draft';
  const isDone = status === 'approved';

  if (loading) return <div className="p-10 text-center text-sm text-gray-500">Loading form…</div>;
  if (error && !record) return <div className="mx-auto max-w-md p-8 text-center text-sm text-red-700">{error}</div>;
  if (!record) return null;

  const employeeName =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((record as any).employee?.full_name as string | undefined) ||
    (formType === 'i9'
      ? [(record.data as I9FormRecord['data']).first_name, (record.data as I9FormRecord['data']).last_name].filter(Boolean).join(' ')
      : [(record.data as I983FormRecord['data']).student_given_name, (record.data as I983FormRecord['data']).student_surname].filter(Boolean).join(' ')) ||
    'Employee';

  const formLabel = `${formType === 'i9' ? 'I-9' : 'I-983'} · ${employeeName}`;

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="flex flex-none items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/lawyer/visa-forms')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">← Visa Forms</button>
          <div>
            <p className="text-sm font-bold text-gray-900">{formLabel}</p>
            <p className="text-[11px] text-gray-500">Attorney review · read-only preview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FormStatusBadge role="attorney" status={status} />
          <button onClick={() => setVersionsOpen((v) => !v)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            🕒 History{versions?.length ? ` (${versions.length})` : ''}
          </button>
          {!isDone && (
            <>
              <button onClick={() => setModalOpen(true)} disabled={busyAction !== null}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                ⚠ Request Corrections
              </button>
              <button onClick={handleApprove} disabled={busyAction !== null}
                className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50">
                {busyAction === 'approve' ? 'Approving…' : '✓ Approve'}
              </button>
            </>
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
                <p className="text-sm font-semibold text-red-700">⚠ Could not load the {formType.toUpperCase()} template</p>
                <p className="mt-1 text-xs text-gray-600">{pdfError}</p>
              </div>
            </div>
          ) : !pdfUrl ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Preparing PDF preview…</div>
          ) : (
            <iframe
              title={`${formType} preview`}
              src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
              className="absolute inset-0 h-full w-full"
            />
          )}
        </div>

        {/* RIGHT — review sidebar */}
        <aside className="w-full flex-none overflow-y-auto bg-white p-4 md:w-[440px] md:p-5 lg:w-[480px]">
          {/* Open corrections banner */}
          {(record.open_corrections?.length ?? 0) > 0 && (
            <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Open corrections</h3>
              <ul className="mt-1.5 space-y-1.5">
                {record.open_corrections!.map((c) => (
                  <li key={c.id} className="rounded-lg border border-amber-200 bg-white p-2">
                    <p className="text-[10px] font-semibold text-amber-700">
                      {c.target === 'employee' ? '→ Employee' : '→ HR'}
                      {' · '}
                      <span className="text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-800">{c.note}</p>
                    {c.fields.length > 0 && (
                      <p className="mt-1 text-[10px] text-gray-500">Fields: {c.fields.join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Version history drawer */}
          {versionsOpen && (
            <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
              <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-700">Version history</h3>
              {(!versions || versions.length === 0) && (
                <p className="text-[11px] text-gray-500">No prior versions yet.</p>
              )}
              <ul className="space-y-1.5">
                {versions?.map((v) => (
                  <li key={v.version_no} className="flex items-start gap-2 rounded border border-gray-100 p-1.5 text-[11px]">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                      v{v.version_no}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">{eventLabel(v.event)}</p>
                      <p className="text-[10px] text-gray-500">
                        {v.snapshot_by?.full_name ?? 'System'} · {new Date(v.created_at).toLocaleString()}
                      </p>
                      {v.note && <p className="mt-0.5 text-[11px] text-gray-700">{v.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Field summary — split into Employee section vs HR section */}
          {formType === 'i9'
            ? <I9Summary data={(record.data as I9FormRecord['data'])} />
            : <I983Summary data={(record.data as I983FormRecord['data'])} />}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}
        </aside>
      </div>

      <RequestCorrectionsModal
        open={modalOpen}
        formLabel={formLabel}
        fieldOptions={formType === 'i9' ? I9_FIELD_OPTIONS : I983_FIELD_OPTIONS}
        onCancel={() => setModalOpen(false)}
        onSubmit={submitCorrections}
      />
    </div>
  );
}

/* ── Field summaries ──────────────────────────────────────────────── */

function I9Summary({ data }: { data: I9FormRecord['data'] }) {
  return (
    <>
      <Group title="Section 1 · Employee">
        <Row k="Full name" v={`${data.last_name}, ${data.first_name} ${data.middle_initial ?? ''}`.trim()} />
        <Row k="Address"   v={`${data.address}${data.apt_number ? ' #' + data.apt_number : ''}, ${data.city}, ${data.state} ${data.zip_code}`} />
        <Row k="DOB"       v={data.date_of_birth} />
        <Row k="SSN"       v={data.ssn} />
        <Row k="Email"     v={data.email} />
        <Row k="Phone"     v={data.phone} />
        <Row k="Citizenship" v={data.citizenship_status ?? ''} />
        <Row k="Signature"   v={data.signature_typed_name} />
      </Group>
      <Group title="Section 2 · Employer (HR)">
        <Row k="List A · Title"        v={data.s2_list_a_title} />
        <Row k="List A · Doc #"        v={data.s2_list_a_document_number} />
        <Row k="List A · Expires"      v={data.s2_list_a_expiration} />
        <Row k="First day of work"     v={data.s2_first_day_of_employment} />
        <Row k="Employer signature"    v={data.s2_employer_signature_name} />
        <Row k="Business name"         v={data.s2_employer_business_name} />
        <Row k="Business address"      v={data.s2_employer_business_address} />
      </Group>
    </>
  );
}

function I983Summary({ data }: { data: I983FormRecord['data'] }) {
  return (
    <>
      <Group title="Section 1 · Student">
        <Row k="Full name"   v={`${data.student_surname}, ${data.student_given_name}`} />
        <Row k="Email"       v={data.student_email} />
        <Row k="SEVIS ID"    v={data.student_sevis_id} />
        <Row k="EAD #"       v={data.employment_authorization_number} />
        <Row k="School"      v={data.school_recommending} />
        <Row k="DSO"         v={`${data.dso_name} · ${data.dso_email}`} />
        <Row k="Degree"      v={`${data.degree_level_type} · ${data.qualifying_major}`} />
        <Row k="OPT window"  v={`${data.stem_opt_from} → ${data.stem_opt_to}`} />
      </Group>
      <Group title="Section 3 · Employer (HR)">
        <Row k="Employer"   v={data.employer_name} />
        <Row k="Address"    v={`${data.employer_street}${data.employer_suite ? ' Ste ' + data.employer_suite : ''}, ${data.employer_city}, ${data.employer_state} ${data.employer_zip}`} />
        <Row k="EIN"        v={data.employer_ein} />
        <Row k="Start date" v={data.start_date_employment} />
        <Row k="Official"   v={`${data.official_name} · ${data.official_email}`} />
        <Row k="Hours/week" v={data.opt_hours_per_week} />
        <Row k="Salary"     v={data.annual_salary} />
      </Group>
      <Group title="Section 5 · Training Plan">
        <Row k="Role"        v={data.training_student_role} multi />
        <Row k="Goals"       v={data.training_goals_objectives} multi />
        <Row k="Oversight"   v={data.training_employer_oversight} multi />
        <Row k="Measures"    v={data.training_measures_assessments} multi />
      </Group>
    </>
  );
}

/* ── UI atoms ─────────────────────────────────────────────────────── */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 border-b border-gray-100 pb-1.5 text-[12px] font-bold uppercase tracking-wide text-gray-800">{title}</h3>
      <dl className="space-y-1.5">{children}</dl>
    </section>
  );
}
function Row({ k, v, multi }: { k: string; v: string | undefined; multi?: boolean }) {
  const val = (v ?? '').trim() || '—';
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700/70">{k}</dt>
      <dd className={`text-[12px] font-medium text-gray-800 ${multi ? 'whitespace-pre-wrap' : 'truncate'}`}>{val}</dd>
    </div>
  );
}
function eventLabel(e: FormVersionItem['event']): string {
  switch (e) {
    case 'submit':               return 'Submitted';
    case 'resubmit':             return 'Re-submitted after corrections';
    case 'approve':              return 'Approved by attorney';
    case 'request_corrections':  return 'Corrections requested';
    default: return e;
  }
}

/* ── Field option lists for the modal checklist ───────────────────── */

const I9_FIELD_OPTIONS = [
  { key: 'last_name',            label: 'Last name' },
  { key: 'first_name',           label: 'First name' },
  { key: 'middle_initial',       label: 'Middle initial' },
  { key: 'date_of_birth',        label: 'Date of birth' },
  { key: 'ssn',                  label: 'SSN' },
  { key: 'citizenship_status',   label: 'Citizenship status' },
  { key: 'signature_typed_name', label: 'Signature' },
  { key: 's2_list_a_title',      label: 'List A · Title' },
  { key: 's2_list_a_document_number', label: 'List A · Doc #' },
  { key: 's2_first_day_of_employment', label: 'First day of employment' },
  { key: 's2_employer_signature_name', label: 'Employer signature' },
];

const I983_FIELD_OPTIONS = [
  { key: 'student_surname',       label: 'Student surname' },
  { key: 'student_email',         label: 'Student email' },
  { key: 'student_sevis_id',      label: 'SEVIS ID' },
  { key: 'employment_authorization_number', label: 'EAD #' },
  { key: 'school_recommending',   label: 'School' },
  { key: 'dso_name',              label: 'DSO' },
  { key: 'stem_opt_from',         label: 'OPT window (from)' },
  { key: 'stem_opt_to',           label: 'OPT window (to)' },
  { key: 'employer_name',         label: 'Employer name' },
  { key: 'employer_ein',          label: 'Employer EIN' },
  { key: 'official_name',         label: 'Employer official' },
  { key: 'opt_hours_per_week',    label: 'OPT hours / week' },
  { key: 'training_student_role', label: 'Training · student role' },
  { key: 'training_goals_objectives', label: 'Training · goals' },
];
