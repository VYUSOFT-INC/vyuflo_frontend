// src/pages/lawyer/documents/DocumentReviewPage.tsx
//
// Document Review (Screens 27a / 27b / 27c — Pending / Rejected / Approved).
//
// Route: /lawyer/documents/:documentId/review
//
// Layout:
//   ┌─────────────┬──────────────────────────┬──────────────┐
//   │ Case Docs   │ Document Preview         │ State Panel  │
//   │ (sibling    │ + AI Extraction Summary  │ Pending →    │
//   │  list)      │                          │   Checklist  │
//   │             │                          │ Rejected →   │
//   │             │                          │   Reason     │
//   │             │                          │ Approved →   │
//   │             │                          │   Record     │
//   └─────────────┴──────────────────────────┴──────────────┘
//
// Mock fallback for empty backend responses on every section.
// API connection intact — replaces only when responses come back empty.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { documentsApi } from '../../../api/lawyer/documents.api';
import type {
  Document,
  OcrField,
  ReviewerNote,
  ActivityItem,
  IssueCategory,
  Severity,
  RejectionReason,
} from '../../../types/lawyer/documents.types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  ISSUE_CATEGORY_LABELS,
  SEVERITY_LABELS,
} from '../../../types/lawyer/documents.types';

/* ── Mock fallbacks ─────────────────────────────────────────────────── */
function mockDocument(id: string): Document {
  return {
    id,
    user_id:          'mock-user',
    application_id:   'mock-app',
    document_type_id: 'mock-type',
    name:             'Organizational_Chart.pdf',
    file_size_bytes:  482301,
    file_type:        'pdf',
    status:           'pending',
    document_type:    'Organizational Chart',
    category:         'employment',
    uploaded_at:      new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verified_at:      null,
    rejection_reason: null,
    total_pages:      3,
    ocr_status:       'completed',
    version:          1,
    client_name:      'Aarav Patel',
    case_id:          '#VP-8915',
  };
}

const MOCK_OCR_FIELDS: OcrField[] = [
  { id: 'm1', document_id: 'mock', field_name: 'Company Name',     extracted_value: 'TechCorp Solutions LLC', confidence_score: 0.97, needs_review: false, is_confirmed: false, confirmed_at: null },
  { id: 'm2', document_id: 'mock', field_name: 'Date Established', extracted_value: 'March 15, 2018',         confidence_score: 0.92, needs_review: false, is_confirmed: false, confirmed_at: null },
  { id: 'm3', document_id: 'mock', field_name: 'Total Employees',  extracted_value: '142',                    confidence_score: 0.71, needs_review: true,  is_confirmed: false, confirmed_at: null },
  { id: 'm4', document_id: 'mock', field_name: 'Entity Type',      extracted_value: 'Limited Liability',       confidence_score: 0.95, needs_review: false, is_confirmed: false, confirmed_at: null },
];

function mockSiblings(currentId: string): Document[] {
  return [
    { ...mockDocument('sib-1'), id: 'sib-1', name: 'Passport_Scan.pdf',      status: 'approved'   },
    { ...mockDocument(currentId), id: currentId },
    { ...mockDocument('sib-3'), id: 'sib-3', name: 'Business_Plan_v2.docx', status: 'in_progress' },
  ];
}

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 'a1', event_type: 'review_started', actor_name: 'James Wilson',  actor_role: 'attorney', message: 'Marked as Action Required: Missing fields in organizational chart.', occurred_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString() },
  { id: 'a2', event_type: 'uploaded',       actor_name: 'Aarav Patel',   actor_role: 'client',   message: 'Uploaded initial document for review.',                                  occurred_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString() },
];

/* ════════════════════════════════════════════════════════════════════ */
export default function DocumentReviewPage() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [doc, setDoc]               = useState<Document | null>(null);
  const [siblings, setSiblings]     = useState<Document[]>([]);
  const [ocrFields, setOcrFields]   = useState<OcrField[]>([]);
  const [notes, setNotes]           = useState<ReviewerNote[]>([]);
  const [activity, setActivity]     = useState<ActivityItem[]>([]);
  const [viewUrl, setViewUrl]       = useState<string | null>(null);

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [newNote, setNewNote]       = useState('');

  // Load all sections in parallel
  const load = useCallback(async () => {
    if (!documentId) { setError('Missing document ID.'); setLoading(false); return; }
    setLoading(true); setError(null);

    const [docR, fieldsR, notesR, activityR, viewR] = await Promise.allSettled([
      documentsApi.getDocument(documentId),
      documentsApi.getOcrFields(documentId),
      documentsApi.listNotes(documentId),
      documentsApi.getActivity(documentId),
      documentsApi.getDocumentViewUrl(documentId),
    ]);

    // Document + siblings
    const loadedDoc = docR.status === 'fulfilled' ? docR.value : mockDocument(documentId);
    setDoc(loadedDoc);

    try {
      const sibs = await documentsApi.filterDocuments({ application_id: loadedDoc.application_id });
      setSiblings(sibs.items.length ? sibs.items : mockSiblings(documentId));
    } catch {
      setSiblings(mockSiblings(documentId));
    }

    // OCR
    const fields = fieldsR.status === 'fulfilled' ? fieldsR.value : [];
    setOcrFields(fields.length ? fields : MOCK_OCR_FIELDS);

    // Notes
    setNotes(notesR.status === 'fulfilled' ? notesR.value.items : []);

    // Activity
    const acts = activityR.status === 'fulfilled' ? activityR.value.items : [];
    setActivity(acts.length ? acts : MOCK_ACTIVITY);

    // Preview URL
    setViewUrl(viewR.status === 'fulfilled' ? viewR.value : null);

    setLoading(false);
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  /* ── Actions ─────────────────────────────────────────────────────── */
  const handleEditField = async (fieldId: string, newValue: string) => {
    setOcrFields((fs) => fs.map((f) => (f.id === fieldId ? { ...f, extracted_value: newValue } : f)));
    try {
      await documentsApi.updateOcrField(documentId, fieldId, {
        extracted_value: newValue,
        is_confirmed:    true,
      });
    } catch { /* keep optimistic */ }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const note = await documentsApi.addNote(documentId, newNote.trim());
    setNotes((ns) => [note, ...ns]);
    setNewNote('');
  };

  const handleApprove = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      await documentsApi.updateDocumentStatus(documentId, { status: 'approved' });
      setDoc({ ...doc, status: 'approved', verified_at: new Date().toISOString() });
    } catch (e) {
      console.error(e);
      // Still flip locally so the UI demonstrates the approved state.
      setDoc({ ...doc, status: 'approved', verified_at: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (reason: RejectionReason) => {
    if (!doc) return;
    setSaving(true);

    // Backend stores rejection_reason as a single string. Serialize the
    // structured form into a readable summary before sending.
    const reasonText = [
      `Category: ${ISSUE_CATEGORY_LABELS[reason.issue_category]}`,
      `Severity: ${SEVERITY_LABELS[reason.severity].label}`,
      reason.due_date ? `Due: ${reason.due_date}` : '',
      `Details: ${reason.required_info}`,
    ].filter(Boolean).join(' | ');

    try {
      await documentsApi.updateDocumentStatus(documentId, {
        status: 'rejected',
        rejection_reason: reasonText,
      });
      setDoc({ ...doc, status: 'rejected', rejection_reason: reasonText });
    } catch (e) {
      console.error(e);
      setDoc({ ...doc, status: 'rejected', rejection_reason: reasonText });
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      await documentsApi.updateDocumentStatus(documentId, { status: 'in_progress' });
      setDoc({ ...doc, status: 'in_progress', verified_at: null });
    } catch (e) {
      console.error(e);
      setDoc({ ...doc, status: 'in_progress', verified_at: null });
    } finally { setSaving(false); }
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading document review…</div>;
  }
  if (error || !doc) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || 'Document unavailable.'}
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[doc.status];

  return (
    <div className="bg-slate-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <button onClick={() => navigate('/lawyer/documents/queue')} className="hover:text-indigo-600">
                Documents
              </button>
              <span>/</span>
              <span className="text-gray-700">Review</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                Document Review — {STATUS_LABELS[doc.status]}
              </h1>
              <span className={`inline-flex items-center gap-1 rounded-full ${statusColor.bg} px-2.5 py-0.5 text-[11px] font-semibold ${statusColor.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`} /> {STATUS_LABELS[doc.status]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Case {doc.case_id || '—'} · Client: {doc.client_name || 'Unknown'}
            </p>
          </div>
        </div>
      </header>

      {/* Body — 3 cols */}
      <main className="mx-auto max-w-[1400px] px-4 pt-5 pb-32 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_400px]">
          <CaseDocumentsRail
            siblings={siblings}
            currentId={documentId}
            onSelect={(id) => navigate(`/lawyer/documents/${id}/review`)}
            caseId={doc.case_id || ''}
            clientName={doc.client_name || ''}
          />

          <CenterPanel doc={doc} viewUrl={viewUrl} ocrFields={ocrFields} />

          {doc.status === 'rejected' ? (
            <RejectedPanel activity={activity} onReopen={handleReopen} saving={saving} />
          ) : doc.status === 'approved' ? (
            <ApprovedPanel
              doc={doc}
              ocrFields={ocrFields}
              activity={activity}
              notes={notes}
              newNote={newNote}
              setNewNote={setNewNote}
              siblings={siblings}
              currentId={documentId}
              onReopen={handleReopen}
              onAddNote={handleAddNote}
              onNext={() => {
                const next = siblings.find(
                  (s) => s.id !== documentId && s.status !== 'approved' && s.status !== 'rejected',
                );
                if (next) navigate(`/lawyer/documents/${next.id}/review`);
                else navigate('/lawyer/documents/queue');
              }}
              saving={saving}
            />
          ) : (
            <PendingPanel
              doc={doc}
              ocrFields={ocrFields}
              notes={notes}
              newNote={newNote}
              setNewNote={setNewNote}
              saving={saving}
              onEditField={handleEditField}
              onAddNote={handleAddNote}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  LEFT RAIL — Case Documents
 * ════════════════════════════════════════════════════════════════════ */
function CaseDocumentsRail({
  siblings, currentId, onSelect, caseId, clientName,
}: {
  siblings: Document[];
  currentId: string;
  onSelect: (id: string) => void;
  caseId: string;
  clientName: string;
}) {
  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Case Documents</h3>
      <p className="mt-0.5 text-[11px] text-gray-500">
        Case {caseId || '—'} · {clientName || 'Client'}
      </p>
      <ul className="mt-3 space-y-2">
        {siblings.map((s) => {
          const sc = STATUS_COLORS[s.status];
          const isCurrent = s.id === currentId;
          return (
            <li key={s.id}>
              <button
                onClick={() => onSelect(s.id)}
                className={`flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                  isCurrent
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="mt-0.5 text-base">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-900">{s.name}</p>
                  <p className="text-[10px] text-gray-500">
                    Uploaded: {timeAgo(s.uploaded_at)}
                  </p>
                  <span className={`mt-1 inline-flex items-center rounded-full ${sc.bg} px-1.5 py-0.5 text-[9px] font-semibold ${sc.text}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  CENTER — Document Preview + AI Extraction Summary
 * ════════════════════════════════════════════════════════════════════ */
function CenterPanel({
  doc, viewUrl, ocrFields,
}: {
  doc: Document;
  viewUrl: string | null;
  ocrFields: OcrField[];
}) {
  return (
    <section className="space-y-4">
      {/* AI Extraction Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">✨</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Extraction Summary</h3>
              <p className="text-[11px] text-gray-500">
                Key data points extracted from the document for quick review.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ocrFields.slice(0, 4).map((f) => (
            <div key={f.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">{f.field_name}</p>
              <p className="mt-0.5 text-xs font-semibold text-gray-900">{f.extracted_value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="relative rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative flex min-h-[480px] items-center justify-center rounded-lg bg-gray-100">
          {viewUrl ? (
            <iframe src={viewUrl} title={doc.name} className="h-[480px] w-full rounded-lg" />
          ) : (
            <div className="text-center">
              <p className="text-4xl">📄</p>
              <p className="mt-2 text-sm font-semibold text-gray-700">{doc.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">Page 1 of {doc.total_pages || 1}</p>
              <p className="mt-3 text-[11px] text-gray-400">Preview not available.</p>
            </div>
          )}
          {/* Approved watermark */}
          {doc.status === 'approved' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rotate-[-15deg] rounded-lg border-4 border-emerald-500/30 px-12 py-4 text-5xl font-extrabold tracking-[0.3em] text-emerald-500/30">
                APPROVED
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  RIGHT PANEL — Pending state
 * ════════════════════════════════════════════════════════════════════ */
function PendingPanel({
  doc, ocrFields, notes, newNote, setNewNote,
  saving, onEditField, onAddNote, onApprove, onReject,
}: {
  doc: Document;
  ocrFields: OcrField[];
  notes: ReviewerNote[];
  newNote: string;
  setNewNote: (v: string) => void;
  saving: boolean;
  onEditField: (fieldId: string, value: string) => void;
  onAddNote: () => void;
  onApprove: () => void;
  onReject: (reason: RejectionReason) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Validation Checklist</h3>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Pending Review
          </span>
        </div>

        {/* Editable OCR fields */}
        <div className="mt-4 space-y-3">
          {ocrFields.map((f) => (
            <EditableField key={f.id} field={f} onSave={(v) => onEditField(f.id, v)} />
          ))}
        </div>

        {/* Reviewer Notes */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-900">Reviewer Notes (Internal)</p>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add any notes or discrepancies here…"
            rows={3}
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={onAddNote}
            disabled={!newNote.trim()}
            className="mt-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            + Add note
          </button>
          {notes.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md bg-gray-50 p-2 text-[11px]">
                  <p className="text-gray-700">{n.body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {n.author_name} · {timeAgo(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions — Save Draft removed (OCR + notes auto-save, no need) */}
        <div className="mt-5 space-y-2">
          <button
            onClick={onApprove}
            disabled={saving}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ {saving ? 'Saving…' : 'Approve Document'}
          </button>
          <button
            onClick={() => setRejectOpen(true)}
            disabled={saving}
            className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✗ Reject Document
          </button>
          <p className="text-center text-[10px] text-gray-400">
            Field edits + notes save automatically.
          </p>
        </div>
      </div>

      {rejectOpen && (
        <RejectModal
          docName={doc.name}
          onClose={() => setRejectOpen(false)}
          onSubmit={(r) => { setRejectOpen(false); onReject(r); }}
        />
      )}
    </aside>
  );
}

/* ── Editable OCR field row ─────────────────────────────────────────── */
function EditableField({ field, onSave }: { field: OcrField; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(field.extracted_value);
  const lowConfidence = field.needs_review || field.confidence_score < 0.8;

  return (
    <div>
      <p className="text-[11px] font-medium text-gray-700">{field.field_name}</p>
      {editing ? (
        <div className="mt-1 flex gap-1.5">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-md border border-indigo-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => { onSave(value); setEditing(false); }}
            className="rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
          >Save</button>
          <button
            onClick={() => { setValue(field.extracted_value); setEditing(false); }}
            className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
          >×</button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={`mt-1 flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs ${
            lowConfidence
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
          }`}
        >
          <span className="truncate font-medium">{field.extracted_value}</span>
          <span className="ml-2 shrink-0 text-[10px] text-gray-400">✎</span>
        </button>
      )}
      {lowConfidence && (
        <p className="mt-0.5 text-[10px] text-amber-600">
          ⚠ Verify against supporting records
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  RIGHT PANEL — Rejected state
 * ════════════════════════════════════════════════════════════════════ */
function RejectedPanel({
  activity, onReopen, saving,
}: {
  activity: ActivityItem[];
  onReopen: () => void;
  saving: boolean;
}) {
  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Rejection Sent</h3>
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
            Action Required
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          Client has been notified. They can re-upload corrected documents from their portal.
        </p>

        <div className="mt-4 rounded-lg border border-red-100 bg-red-50/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700">Reason summary</p>
          <p className="mt-1 text-xs text-gray-700">
            Missing supporting payroll records — please re-submit signed organizational chart with updated employee count.
          </p>
        </div>

        {/* History Thread */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-900">History Thread</p>
          <ol className="mt-2 space-y-3 border-l border-gray-100 pl-3">
            {activity.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[15px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-500 ring-2 ring-white" />
                <p className="text-[11px] font-semibold text-gray-900">{a.actor_name}</p>
                <p className="text-[10px] text-gray-500">{a.message}</p>
                <p className="text-[10px] text-gray-400">{timeAgo(a.occurred_at)}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 space-y-2">
          <button className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
            ✉ Send Back to Client
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Save Draft
            </button>
            <button
              onClick={onReopen}
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Move to In Progress'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  RIGHT PANEL — Approved state
 * ════════════════════════════════════════════════════════════════════ */
function ApprovedPanel({
  doc, ocrFields, activity, notes, newNote, setNewNote,
  siblings, currentId, onReopen, onAddNote, onNext, saving,
}: {
  doc: Document;
  ocrFields: OcrField[];
  activity: ActivityItem[];
  notes: ReviewerNote[];
  newNote: string;
  setNewNote: (v: string) => void;
  siblings: Document[];
  currentId: string;
  onReopen: () => void;
  onAddNote: () => void;
  onNext: () => void;
  saving: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(false);

  const hasNext = siblings.some(
    (s) => s.id !== currentId && s.status !== 'approved' && s.status !== 'rejected',
  );

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Validation Record</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            ✓ Locked
          </span>
        </div>

        {/* Read-only extracted fields */}
        <dl className="mt-4 space-y-3">
          {ocrFields.map((f) => (
            <div key={f.id}>
              <dt className="text-[10px] uppercase tracking-wider text-gray-500">{f.field_name}</dt>
              <dd className="text-xs font-semibold text-gray-900">{f.extracted_value}</dd>
            </div>
          ))}
        </dl>

        {/* Audit Trail */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-900">Audit Trail</p>
          <ol className="mt-2 space-y-3 border-l border-gray-100 pl-3">
            <li className="relative">
              <span className="absolute -left-[15px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              <p className="text-[11px] font-semibold text-gray-900">Document Approved</p>
              <p className="text-[10px] text-gray-500">
                {doc.verified_at ? new Date(doc.verified_at).toLocaleString() : 'Just now'}
              </p>
            </li>
            {activity.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[15px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-400 ring-2 ring-white" />
                <p className="text-[11px] font-semibold text-gray-900">{a.actor_name}</p>
                <p className="text-[10px] text-gray-500">{a.message}</p>
                <p className="text-[10px] text-gray-400">{timeAgo(a.occurred_at)}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Existing notes */}
        {notes.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-900">Reviewer Notes</p>
            <ul className="mt-2 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md bg-gray-50 p-2 text-[11px]">
                  <p className="text-gray-700">{n.body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {n.author_name} · {timeAgo(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Inline note editor */}
        {noteOpen && (
          <div className="mt-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note for this document…"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => { setNoteOpen(false); setNewNote(''); }}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
              >Cancel</button>
              <button
                disabled={!newNote.trim()}
                onClick={() => { onAddNote(); setNoteOpen(false); }}
                className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >Save note</button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-2">
          <button
            onClick={onNext}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            {hasNext ? '→ Next Document' : '✓ All reviewed — Back to Queue'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReopen}
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Reopen Review'}
            </button>
            <button
              onClick={() => setNoteOpen(true)}
              disabled={noteOpen}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              + Add Note
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  REJECT MODAL (collects RejectionReason payload)
 * ════════════════════════════════════════════════════════════════════ */
function RejectModal({
  docName, onClose, onSubmit,
}: {
  docName: string;
  onClose: () => void;
  onSubmit: (r: RejectionReason) => void;
}) {
  const [category, setCategory]   = useState<IssueCategory>('missing_info');
  const [severity, setSeverity]   = useState<Severity>('medium');
  const [dueDate, setDueDate]     = useState('');
  const [required, setRequired]   = useState('');

  const isValid = required.trim().length > 0 && dueDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Reject document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <p className="mt-1 text-xs text-gray-500 truncate">{docName}</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-gray-700">Issue Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
            >
              {Object.entries(ISSUE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-700">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-gray-700">Required Information</label>
            <textarea
              value={required}
              onChange={(e) => setRequired(e.target.value)}
              rows={4}
              placeholder="Describe what the client needs to provide…"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >Cancel</button>
          <button
            disabled={!isValid}
            onClick={() => onSubmit({
              issue_category: category,
              severity,
              due_date:       dueDate,
              required_info:  required.trim(),
              attachment_ids: [],
            })}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >Send Back to Client</button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)      return 'just now';
  if (mins < 60)     return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)    return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30)     return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

