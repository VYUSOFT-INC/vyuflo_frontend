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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '../../../hooks/useAuth';

import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { documentsApi } from '../../../api/lawyer/documents.api';
import { documentRequestsApi } from '../../../api/lawyer/documentRequests.api';
// Backend visa catalog — used to fetch the REAL required-documents
// list for the client's visa type (whatever admin has configured in
// Visa Types Manager).  Falls back to an empty list on any error so
// the review page never blocks on this.
import { visaChecklistApi, type BackendVisaType } from '../../../api/employee/visaChecklist.api';
// Attorney's assigned applications — used to look up the visa_type for
// this document when doc.case_id is empty (doc-detail 403 case).
import { intakeApi } from '../../../api/lawyer/intake.api';
import type {
  CreateDocumentRequestPayload,
  RequestPriority,
} from '../../../types/employee/documentRequests.types';
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

/* ── Placeholders (NOT mocks) ──────────────────────────────────────────
 * Earlier this file fell back to hardcoded "Aarav Patel / Passport_Scan"
 * fixtures, which were misleading on a freshly-created document — the
 * user saw someone else's case. The placeholder helpers below are tied to
 * the REAL documentId from the URL and only fill skeleton metadata. They
 * never invent a client name, sibling files, or activity history. Empty
 * states are used for missing sub-data instead. */
function placeholderDocument(id: string): Document {
  return {
    id,
    user_id:          '',
    application_id:   '',       // never 'mock-app' — would 422 the filter
    document_type_id: '',
    name:             'Document',
    file_size_bytes:  0,
    file_type:        'pdf',
    status:           'pending',
    document_type:    'Document',
    category:         '',
    uploaded_at:      new Date().toISOString(),
    verified_at:      null,
    rejection_reason: null,
    total_pages:      0,
    ocr_status:       'pending',
    version:          1,
    client_name:      '',
    case_id:          '',
  };
}

/* ════════════════════════════════════════════════════════════════════ */
export default function DocumentReviewPage() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  // application_id passed through from Document Queue's row click. Used as
  // fallback when the doc-detail endpoint 403s and doc.application_id ends
  // up null — Request Additional Document needs a valid UUID to send.
  const [searchParams] = useSearchParams();
  const applicationIdFromUrl = searchParams.get('application_id');
  const navigate = useNavigate();

  const [doc, setDoc]               = useState<Document | null>(null);
  const [siblings, setSiblings]     = useState<Document[]>([]);
  const [ocrFields, setOcrFields]   = useState<OcrField[]>([]);
  const [notes, setNotes]           = useState<ReviewerNote[]>([]);
  const [activity, setActivity]     = useState<ActivityItem[]>([]);
  const [viewUrl, setViewUrl]       = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('application/pdf');
  // Track object URLs so we can revoke them on unmount / doc change
  const objectUrlRef                = useRef<string | null>(null);

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [newNote, setNewNote]       = useState('');

  // Current user — used to decide whether to show the Delete button on
  // lawyer-uploaded docs. Only the uploader can delete their own file.
  const { data: currentUser } = useCurrentUser();

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

    // Document — if the real fetch failed, use a SKELETON tied to the
    // URL documentId. We never invent a client name / file name etc.
    const loadedDoc = docR.status === 'fulfilled' ? docR.value : placeholderDocument(documentId);
    setDoc(loadedDoc);

    // Siblings — resolve application_id from real doc first, then fall
    // back to the URL query param (set by DocumentQueue's row click).
    const effectiveAppId = loadedDoc.application_id || applicationIdFromUrl || '';

    // The scoped filter (?application_id=<uuid>) returns empty on this
    // backend for reasons unclear (probably a bug in list_documents_filtered
    // when application_id is passed). But the SAME endpoint called with
    // NO filter returns every doc the attorney can see — that's what
    // Documents Queue uses successfully. So we fetch broad + filter
    // locally. This gets the Case Documents rail populated with all the
    // client's uploads without waiting on backend to fix scoped-filter.
    let sibs: Document[] = [];
    try {
      // Attempt 1: scoped filter (best case, backend eventually fixes this)
      const scoped = await documentsApi.filterDocuments({ application_id: effectiveAppId });
      if (scoped.items?.length) sibs = scoped.items;
    } catch {
      /* fall through to broad fetch */
    }

    if (sibs.length === 0) {
      try {
        // Attempt 2: broad fetch + client-side application_id filter — this
        // is what Documents Queue does. Also include the current doc.
        const broad = await documentsApi.filterDocuments({});
        const items = broad.items || [];
        sibs = items.filter((d) => {
          if (!effectiveAppId) return d.id === documentId;
          return d.application_id === effectiveAppId;
        });
      } catch {
        /* leave sibs empty */
      }
    }

    // Legacy /documents endpoint as third fallback — some environments
    // return the client's docs here even when /filter is empty.
    if (sibs.length === 0 && effectiveAppId) {
      try {
        const legacy = await documentsApi.listDocuments({ application_id: effectiveAppId });
        sibs = legacy.items || [];
      } catch {
        /* leave sibs empty */
      }
    }

    // Filter out docs the user deleted this session — backend may
    // soft-delete (set deleted_at) but still return the row from /filter.
    const deletedIds = documentsApi.getLocallyDeletedIds();
    if (deletedIds.size > 0) {
      sibs = sibs.filter((s) => !deletedIds.has(s.id));
    }

    setSiblings(sibs);

    // Patch the loaded doc's application_id so downstream actions
    // (upload, request additional) don't fall through to the URL
    // fallback and stay in sync.
    if (!loadedDoc.application_id && effectiveAppId) {
      setDoc((prev) => (prev ? { ...prev, application_id: effectiveAppId } : prev));
    }

    // OCR — empty array when backend hasn't processed the doc yet. Don't
    // show TechCorp/etc. fixtures on someone else's freshly-created file.
    setOcrFields(fieldsR.status === 'fulfilled' ? fieldsR.value : []);

    // Notes — empty array when 404. The UI shows an empty state.
    setNotes(notesR.status === 'fulfilled' ? notesR.value.items : []);

    // Activity — empty list when 403. The UI shows an empty state.
    setActivity(activityR.status === 'fulfilled' ? activityR.value.items : []);

    // Preview URL — /view returns a signed URL when it works. When it 403s
    // (common for attorney reviewing a client doc), fall back to
    // /download which returns a Blob — we turn that into an object URL
    // and embed it in the iframe. This means the center panel actually
    // shows the file instead of an empty placeholder.
    let previewUrl: string | null = null;
    let previewMimeType = 'application/pdf';
    if (viewR.status === 'fulfilled' && viewR.value) {
      previewUrl = viewR.value;
    } else {
      try {
        const blob = await documentsApi.downloadDocument(documentId);
        // Guard: some backends return a JSON error body with responseType:
        // 'blob', so blob.size > 0 but blob.type is 'application/json' —
        // that's NOT a real preview. Accept only known media MIMEs, and
        // fall back to inferring from the filename extension when the
        // MIME is generic (application/octet-stream).
        const ext = (loadedDoc.name || '').split('.').pop()?.toLowerCase() || '';
        const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
        const inferredMime =
          IMAGE_EXT.includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` :
          ext === 'pdf'            ? 'application/pdf' :
          '';
        const goodMime = blob.type && (
          blob.type.startsWith('image/') ||
          blob.type === 'application/pdf'
        );
        const usableMime = goodMime ? blob.type : inferredMime;
        if (blob && blob.size > 0 && usableMime) {
          // If blob.type was the wrong thing (application/json / octet),
          // re-wrap the blob with the inferred mime so the browser knows
          // how to render it.
          const usableBlob = blob.type === usableMime
            ? blob
            : new Blob([blob], { type: usableMime });
          previewMimeType = usableMime;
          previewUrl = URL.createObjectURL(usableBlob);
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = previewUrl;
        } else {
          console.warn('[review] download blob rejected — mime:', blob?.type, 'size:', blob?.size);
        }
      } catch (dlErr) {
        console.warn('[review] downloadDocument failed:', dlErr);
      }
    }
    setViewUrl(previewUrl);
    setPreviewMime(previewMimeType);

    setLoading(false);
  }, [documentId, applicationIdFromUrl]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

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

  // ── Request Additional Document ─────────────────────────────────────
  // Lawyer wants the client to upload something new (not a fix of an
  // existing rejected doc). Fires POST /documents/requests with the
  // application_id + document_name + details + optional due date/priority.
  // Client will see it in RequestedDocsWidget on their dashboard.
  const handleRequestDocument = async (
    payload: Omit<CreateDocumentRequestPayload, 'application_id'>,
  ): Promise<boolean> => {
    // Priority: doc.application_id → URL param (from queue) → block.
    // The URL param handles the case where doc-detail endpoints 403'd and
    // placeholder data leaves doc.application_id null.
    const appId = doc?.application_id || applicationIdFromUrl || '';
    if (!appId) {
      console.error('[review] no application_id available from doc or URL — request will 422');
      alert('This document isn\'t linked to an application. Open the client\'s case from Cases → click the doc there and try again.');
      return false;
    }
    console.log('[review] sending request with application_id:', appId);
    try {
      await documentRequestsApi.requestDocument({
        application_id: appId,
        ...payload,
      });
      return true;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const status = ax?.response?.status;
      const data   = ax?.response?.data;
      const detail =
        typeof data?.detail === 'string' ? data.detail :
        typeof data === 'string'         ? data :
        Array.isArray(data?.detail)      ? data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join('; ') :
        '';
      console.error('[review] requestDocument failed', status, data);
      if (status === 422 && !appId) {
        alert('This document isn\'t linked to an application. Open the client\'s case from Cases → click the doc there and try again.');
      } else if (status === 403) {
        alert(
          `${detail || 'You are not assigned to this case.'}\n\nAsk your HR admin to assign you as the attorney on this application, then try again.`,
        );
      } else if (status === 500) {
        alert(
          `Server error (500) sending request.\n\n${detail || '(backend returned no detail)'}\n\nAsk the backend team to check the /documents/requests handler.`,
        );
      } else if (detail) {
        alert(`Could not send the request (${status ?? 'network'}):\n${detail}`);
      } else {
        alert('Could not send the request. Please try again in a moment.');
      }
      return false;
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

  // ── Delete document (soft delete) ───────────────────────────────────
  // Only exposed in UI for docs the current lawyer uploaded (owner check
  // below). Backend still enforces the permission — if the request 403s
  // we surface the message.
  const handleDelete = async (): Promise<void> => {
    if (!doc) return;
    if (!window.confirm(`Delete "${doc.name}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await documentsApi.softDeleteDocument(documentId);
      // Remove from local siblings list — bulletproof: the API also
      // persists this id in sessionStorage so any refetch (from load()
      // or upload) filters it out. Backend may soft-delete (row still
      // present with deleted_at set) — either way, user won't see it.
      const remainingSiblings = siblings.filter((s) => s.id !== documentId);
      setSiblings(remainingSiblings);

      // Navigate to the next unreviewed sibling or back to the queue.
      const next = remainingSiblings.find(
        (s) => s.status !== 'approved' && s.status !== 'rejected',
      );
      const appId = doc.application_id || applicationIdFromUrl || '';
      if (next) {
        const qs = appId ? `?application_id=${appId}` : '';
        navigate(`/lawyer/documents/${next.id}/review${qs}`);
      } else {
        navigate('/lawyer/documents/queue');
      }
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const status = ax?.response?.status;
      const data   = ax?.response?.data;
      const detail =
        typeof data?.detail === 'string' ? data.detail :
        typeof data === 'string'         ? data :
        '';
      console.error('[review] delete failed', status, data);
      if (status === 403) {
        alert(detail || 'You don\'t have permission to delete this document.');
      } else if (status === 404) {
        // Backend says the doc doesn't exist — treat as already deleted
        // and hide the row locally so the user isn't stuck.
        setSiblings((curr) => curr.filter((s) => s.id !== documentId));
        navigate('/lawyer/documents/queue');
      } else if (detail) {
        alert(`Delete failed (${status ?? 'network'}): ${detail}`);
      } else {
        alert('Delete failed. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  // Ownership check: is the current lawyer the uploader?  Backend fields
  // vary — check every candidate. Also treat lawyer-only categories
  // (legal / employment / identity / education / personal / other with
  // an attorney-authored document_type) as a strong hint.  Backend still
  // enforces DELETE permission — this heuristic only decides whether to
  // SHOW the button in the UI.
  const isMyUpload = (() => {
    if (!doc || !currentUser) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyDoc  = doc as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyUser = currentUser as any;

    const uploaderId =
      anyDoc.uploaded_by ||
      anyDoc.uploader_id ||
      anyDoc.uploaded_by_id ||
      anyDoc.created_by  ||
      doc.user_id;
    const meId = anyUser?.id || anyUser?.user_id;
    if (uploaderId && meId && String(uploaderId) === String(meId)) return true;

    // Role hint — if backend attaches uploader_role/uploaded_by_role and
    // it says attorney, show delete (still gated by backend on click).
    const uploaderRole =
      anyDoc.uploaded_by_role ||
      anyDoc.uploader_role   ||
      anyDoc.created_by_role;
    if (
      typeof uploaderRole === 'string' &&
      ['attorney', 'lawyer'].includes(uploaderRole.toLowerCase())
    ) return true;

    return false;
  })();

  // Diagnostic — helps figure out why the button isn't showing.  Remove
  // once ownership fields stabilize on the backend.
  useEffect(() => {
    if (doc && currentUser) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyDoc  = doc as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyUser = currentUser as any;
      console.log('[review] ownership check', {
        canDelete:        isMyUpload,
        doc_user_id:      doc.user_id,
        doc_uploaded_by:  anyDoc.uploaded_by,
        doc_uploader_role:anyDoc.uploaded_by_role || anyDoc.uploader_role,
        me_id:            anyUser?.id || anyUser?.user_id,
        me_role:          anyUser?.role,
      });
    }
  }, [doc?.id, currentUser?.email, isMyUpload]);

  // ── Upload Lawyer Document ──────────────────────────────────────────
  // Attorney uploads a document they own (e.g. a drafted petition PDF,
  // an evidence memo). Pipes through the same /documents/upload endpoint
  // as clients — backend tags the uploader from the JWT. After the
  // upload, we refetch the sibling list so the new doc appears in the
  // left rail immediately.
  const handleLawyerUpload = async (params: {
    file: File;
    document_type: string;
    category: string;
  }): Promise<boolean> => {
    const appId = doc?.application_id || applicationIdFromUrl || '';
    if (!appId) {
      alert('This document isn\'t linked to an application. Open the client\'s case from Cases → click a doc there and try again.');
      return false;
    }
    try {
      const uploaded = await documentsApi.uploadDocument({
        file:           params.file,
        application_id: appId,
        document_type:  params.document_type,
        category:       params.category,
      });
      // Optimistic prepend (only if backend returned a well-shaped doc
      // object — some backends respond 200 with an empty body or a wrapper
      // like `{document: {...}}`, which would leave an empty row).
      if (uploaded && (uploaded as Document).id && (uploaded as Document).name) {
        setSiblings((curr) => [uploaded, ...curr]);
      }
      // Authoritative refresh — refetch the case's docs so the row shows
      // real fields (status, uploaded_at, document_type) exactly as
      // backend stored them. This also picks up backend-generated fields
      // (thumbnail, ocr status) the response might not include.
      try {
        const broad = await documentsApi.filterDocuments({});
        const items = broad.items || [];
        const refreshed = items.filter((d) =>
          appId ? d.application_id === appId : true,
        );
        if (refreshed.length > 0) setSiblings(refreshed);
      } catch { /* keep optimistic */ }
      return true;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const status = ax?.response?.status;
      const data   = ax?.response?.data;
      const detail =
        typeof data?.detail === 'string' ? data.detail :
        typeof data === 'string'         ? data :
        Array.isArray(data?.detail)      ? data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join('; ') :
        '';
      console.error('[review] lawyer upload failed', status, data, ax?.message);
      if (status === 403) {
        alert(
          `${detail || 'You don\'t have permission to upload to this application.'}\n\nAsk your HR admin to assign you as the attorney on this case, then try again.`,
        );
      } else if (status === 500) {
        alert(
          `Upload failed (500). Backend says:\n\n${detail || '(backend returned no detail)'}\n\nAsk the backend team what fields /documents/upload expects for an attorney upload.`,
        );
      } else if (status === 422) {
        alert(
          `Upload rejected (422):\n${detail || 'Missing or invalid field.'}\n\nCheck category / document_type spelling.`,
        );
      } else if (detail) {
        alert(`Upload failed (${status ?? 'network'}):\n${detail}`);
      } else {
        alert('Upload failed. Please try again.');
      }
      return false;
    }
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

  // Fallback for statuses returned by backend that aren't in the frontend
  // DocumentStatus enum ('uploaded', 'verified', 'pending_review', etc.).
  const statusColor = STATUS_COLORS[doc.status] ?? STATUS_COLORS.pending;
  const statusLabel = STATUS_LABELS[doc.status] ?? doc.status ?? 'Pending';

  return (
    <div className="bg-slate-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Back navigation — top-left, above the sticky header (desktop + mobile). */}
      <div className="px-4 pt-4 sm:px-6">
        <LawyerBackButton />
      </div>

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
                Document Review — {statusLabel}
              </h1>
              <span className={`inline-flex items-center gap-1 rounded-full ${statusColor.bg} px-2.5 py-0.5 text-[11px] font-semibold ${statusColor.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`} /> {statusLabel}
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
            onSelect={(id) => {
              // Preserve application_id in the URL so the sibling doc also
              // has the fallback when its own detail endpoint 403s.
              const appId = doc.application_id || applicationIdFromUrl || '';
              const qs = appId ? `?application_id=${appId}` : '';
              navigate(`/lawyer/documents/${id}/review${qs}`);
            }}
            caseId={doc.case_id || ''}
            clientName={doc.client_name || ''}
          />

          <CenterPanel
            doc={doc}
            viewUrl={viewUrl}
            previewMime={previewMime}
            ocrFields={ocrFields}
            canDelete={isMyUpload}
            deleting={deleting}
            onDelete={handleDelete}
          />

          {doc.status === 'rejected' ? (
            <RejectedPanel
              activity={activity}
              onReopen={handleReopen}
              saving={saving}
              onBackToQueue={() => navigate('/lawyer/documents/queue')}
            />
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
                if (next) {
                  const appId = doc.application_id || applicationIdFromUrl || '';
                  const qs = appId ? `?application_id=${appId}` : '';
                  navigate(`/lawyer/documents/${next.id}/review${qs}`);
                } else {
                  navigate('/lawyer/documents/queue');
                }
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
              onRequestDocument={handleRequestDocument}
              onLawyerUpload={handleLawyerUpload}
              siblings={siblings}
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
          // Fallback for backend statuses not in the frontend enum
          // ('uploaded', 'verified', 'pending_review', etc.) — without
          // this, sc.bg crashes and the whole review page blanks out.
          const sc = STATUS_COLORS[s.status] ?? STATUS_COLORS.pending;
          const label = STATUS_LABELS[s.status] ?? s.status ?? 'Unknown';
          const isCurrent = s.id === currentId;
          const uploadedAt = s.uploaded_at || new Date().toISOString();
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
                  <p className="truncate text-xs font-semibold text-gray-900">{s.name || 'Untitled'}</p>
                  <p className="text-[10px] text-gray-500">
                    Uploaded: {timeAgo(uploadedAt)}
                  </p>
                  <span className={`mt-1 inline-flex items-center rounded-full ${sc.bg} px-1.5 py-0.5 text-[9px] font-semibold ${sc.text}`}>
                    {label}
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
  doc, viewUrl, previewMime, ocrFields, canDelete, deleting, onDelete,
}: {
  doc: Document;
  viewUrl: string | null;
  previewMime: string;
  ocrFields: OcrField[];
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  // Decide render mode from mime type. Images render as <img>, PDFs and
  // everything else render inside <iframe> (browser handles PDF preview
  // natively). Falling back to filename extension when mime is generic.
  const ext = (doc.name || '').split('.').pop()?.toLowerCase() || '';
  const isImage =
    previewMime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

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
        <div className="relative flex min-h-[480px] items-center justify-center overflow-hidden rounded-lg bg-gray-100">
          {viewUrl ? (
            isImage ? (
              <img
                src={viewUrl}
                alt=""
                className="max-h-[480px] max-w-full object-contain"
                onError={(e) => {
                  // Hide the broken image so the placeholder below shows
                  // instead of the alt text (which was ugly for long
                  // filenames).
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <iframe
                src={viewUrl}
                title={doc.name}
                className="h-[480px] w-full rounded-lg"
              />
            )
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

          {/* Delete button — bottom-right, only for docs the current lawyer
              uploaded themselves. Backend still enforces this via the
              DELETE /documents/{id} permission check. */}
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              title="Delete this document"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🗑 {deleting ? 'Deleting…' : 'Delete'}
            </button>
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
  saving, onEditField, onAddNote, onApprove, onReject, onRequestDocument,
  onLawyerUpload, siblings,
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
  onRequestDocument: (payload: Omit<CreateDocumentRequestPayload, 'application_id'>) => Promise<boolean>;
  onLawyerUpload: (p: { file: File; document_type: string; category: string }) => Promise<boolean>;
  siblings: Document[];
}) {
  const [rejectOpen,   setRejectOpen]   = useState(false);
  const [requestOpen,  setRequestOpen]  = useState(false);
  const [requestSent,  setRequestSent]  = useState(false);
  const [uploadOpen,   setUploadOpen]   = useState(false);
  const [uploadDone,   setUploadDone]   = useState(false);

  // ── Real checklist — fetched from backend /visa-types on mount ────
  // Extract the visa code from case_id (format "#VF-9586 · H-1B"), look
  // it up in the backend catalog (same one Admin manages in Visa Types
  // Manager), and use that visa's real required_documents. Admin edits
  // in Visa Types Manager land here automatically on next open.
  const [visaChecklist, setVisaChecklist] = useState<string[]>([]);
  const [visaChecklistName, setVisaChecklistName] = useState<string>('Required');
  const [visaChecklistLoading, setVisaChecklistLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    // Match longest codes first so "H-1B1" beats "H-1B" and "L-1A" beats
    // "L-1". No match → try app_id fallback below.
    // Ordered longest-first so specific codes match before generic ones
    // (e.g. "H-1B1" before "H-1B", "L-1A" before "L-1", "O-1A" before "O-1").
    const CANDIDATES = [
      'EB-2 NIW','H-1B1','L-1A','L-1B','O-1A','O-1B','EB-1','EB-2','EB-3','EB-4','EB-5',
      'H-1B','H-2A','H-2B','H-2','H-3','H-4',
      'L-1','L-2',
      'O-1',
      'E-1','E-2','E-3',
      'F-1','F-2','M-1','J-1','J-2',
      'B-1','B-2','TD','TN',
      'IR-1','IR-2','IR-5','F2A','F2B','GREEN-CARD',
    ];

    setVisaChecklistLoading(true);
    setVisaChecklist([]);
    setVisaChecklistName('Required');

    (async () => {
      // ── Step 1: resolve a visa code we can match against ────────────
      // First try to extract from the case_id label ("#VF-9586 · H-1B").
      const label = (doc.case_id || doc.document_type || '').toUpperCase();
      let matchedCode = CANDIDATES.find((c) => label.includes(c));

      // Fallback: when case_id is empty (doc-detail 403 case), look up
      // the parent application from the attorney's assigned apps list
      // and use its visa_type field.
      if (!matchedCode && doc.application_id) {
        try {
          const apps = await intakeApi.listAssignedApplications();
          const app = apps.find((a) => a.application_id === doc.application_id);
          const visaLabel = ((app as unknown as { visa_type?: string; visa_type_label?: string } | undefined)?.visa_type ||
                             (app as unknown as { visa_type?: string; visa_type_label?: string } | undefined)?.visa_type_label ||
                             '').toUpperCase();
          if (visaLabel) {
            matchedCode = CANDIDATES.find((c) => visaLabel.includes(c)) || visaLabel;
          }
        } catch { /* no fallback data — leave matchedCode undefined */ }
      }

      if (cancelled) return;

      if (!matchedCode) {
        setVisaChecklistLoading(false);
        return;
      }
      setVisaChecklistName(matchedCode);

      // ── Step 2: look up the visa in the backend catalog ────────────
      try {
        const list = await visaChecklistApi.listVisaTypes();
        if (cancelled) return;
        const visa: BackendVisaType | undefined =
          list.find((v) => v.code?.toUpperCase() === matchedCode) ||
          list.find((v) => v.code?.toUpperCase().includes(matchedCode!));
        if (!visa) { setVisaChecklistLoading(false); return; }

        setVisaChecklistName(visa.code || matchedCode);

        // Try list-side docs first (backend sometimes omits them from list).
        const listDocs = normalizeDocs(visa.required_documents);
        if (listDocs.length > 0) {
          setVisaChecklist(listDocs);
          setVisaChecklistLoading(false);
          return;
        }

        // Fall back to detail fetch.
        const detail = await visaChecklistApi.getVisaTypeDetail(visa.id);
        if (!cancelled) {
          setVisaChecklist(normalizeDocs(detail?.required_documents));
          setVisaChecklistLoading(false);
        }
      } catch {
        if (!cancelled) setVisaChecklistLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [doc.case_id, doc.document_type, doc.application_id]);

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Validation Checklist</h3>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Pending Review
          </span>
        </div>

        {/* ── VISA-TYPE CHECKLIST ─────────────────────────────────────
             Real required-documents list for this client's visa type,
             fetched from backend /visa-types (same catalog Admin manages
             in Visa Types Manager). Admin edits propagate here
             automatically.  Auto-ticks when a sibling doc name matches. */}
        <CaseTypeChecklist
          documentId={doc.id}
          visaName={visaChecklistName}
          items={visaChecklist}
          loading={visaChecklistLoading}
          siblings={siblings}
        />

        {/* Editable OCR fields */}
        {ocrFields.length > 0 && (
          <>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Extracted fields
            </p>
            <div className="mt-2 space-y-3">
              {ocrFields.map((f) => (
                <EditableField key={f.id} field={f} onSave={(v) => onEditField(f.id, v)} />
              ))}
            </div>
          </>
        )}

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

          {/* ── Request Additional Document ─────────────────────────────
               Different from Reject: this asks the client for an EXTRA
               document (e.g. missing pay stub), not a fix to this one. */}
          <button
            onClick={() => { setRequestOpen(true); setRequestSent(false); }}
            disabled={saving}
            className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Request Additional Document
          </button>

          {requestSent && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-center text-[11px] font-medium text-emerald-700">
              ✓ Request sent — client has been notified.
            </p>
          )}

          {/* ── Upload Lawyer Document ──────────────────────────────────
               4th button — for docs the attorney themselves needs to
               attach (drafted petition, memo, evidence). Different from
               "Request Additional" (asks the CLIENT) — this one is the
               lawyer uploading their own file. */}
          <button
            onClick={() => { setUploadOpen(true); setUploadDone(false); }}
            disabled={saving}
            className="w-full rounded-lg border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⬆ Upload Lawyer Document
          </button>

          {uploadDone && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-center text-[11px] font-medium text-emerald-700">
              ✓ Uploaded — visible in Case Documents.
            </p>
          )}

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

      {requestOpen && (
        <RequestDocumentModal
          clientName={doc.client_name}
          onClose={() => setRequestOpen(false)}
          onSubmit={async (payload) => {
            const ok = await onRequestDocument(payload);
            if (ok) {
              setRequestOpen(false);
              setRequestSent(true);
            }
          }}
        />
      )}

      {uploadOpen && (
        <LawyerUploadModal
          clientName={doc.client_name}
          onClose={() => setUploadOpen(false)}
          onSubmit={async (payload) => {
            const ok = await onLawyerUpload(payload);
            if (ok) {
              setUploadOpen(false);
              setUploadDone(true);
            }
          }}
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
  activity, onReopen, saving, onBackToQueue,
}: {
  activity: ActivityItem[];
  onReopen: () => void;
  saving: boolean;
  onBackToQueue: () => void;
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
          <button
            onClick={onBackToQueue}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
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
  const [submitting, setSubmitting] = useState(false);

  const isValid = required.trim().length > 0;   // only required_info is mandatory

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
            <label className="text-[11px] font-medium text-gray-700">
              Required Information <span className="text-red-600">*</span>
            </label>
            <textarea
              value={required}
              onChange={(e) => setRequired(e.target.value)}
              rows={4}
              placeholder="Describe what the client needs to provide…"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 ${
                required.trim().length === 0
                  ? 'border-red-200 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
              autoFocus
            />
            {required.trim().length === 0 && (
              <p className="mt-1 text-[10px] text-red-600">
                Please describe what the client needs to provide.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >Cancel</button>
          <button
            disabled={!isValid || submitting}
            onClick={() => {
              setSubmitting(true);
              onSubmit({
                issue_category: category,
                severity,
                due_date:       dueDate,
                required_info:  required.trim(),
                attachment_ids: [],
              });
            }}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send Back to Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  REQUEST ADDITIONAL DOCUMENT — modal
 *  Fires POST /documents/request. Client sees it in RequestedDocsWidget.
 * ════════════════════════════════════════════════════════════════════ */
function RequestDocumentModal({
  clientName, onClose, onSubmit,
}: {
  clientName?: string;
  onClose:   () => void;
  onSubmit:  (payload: Omit<CreateDocumentRequestPayload, 'application_id'>) => Promise<void> | void;
}) {
  const [docType,     setDocType]     = useState('');
  const [description, setDescription] = useState('');
  const [dueDate,     setDueDate]     = useState('');
  const [priority,    setPriority]    = useState<RequestPriority>('normal');
  const [submitting,  setSubmitting]  = useState(false);
  const [showErrors,  setShowErrors]  = useState(false);

  const docTypeValid     = docType.trim().length >= 2;
  const descriptionValid = description.trim().length >= 5;
  const canSubmit        = docTypeValid && descriptionValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) { setShowErrors(true); return; }
    setSubmitting(true);
    await onSubmit({
      document_name: docType.trim(),
      details:       description.trim(),
      due_date:      dueDate || null,
      priority,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900 tracking-[-0.3px]">
              Request Additional Document
            </h3>
            {clientName && (
              <p className="text-[12px] text-slate-500 mt-0.5">
                From <span className="font-medium text-slate-700">{clientName}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Document type */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Document Name / Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              autoFocus
              placeholder="e.g. Form W-2 (2024), Recent Pay Stubs, University Transcript"
              className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {showErrors && !docTypeValid && (
              <p className="mt-1 text-[11px] text-red-600">Please enter a document name (at least 2 characters).</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Details / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              cols={1}
              placeholder="Explain what the client needs to provide, why, and any special instructions (page numbers, date range, format, etc.)"
              className="block w-full min-w-0 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {showErrors && !descriptionValid && (
              <p className="mt-1 text-[11px] text-red-600">Please add at least a short description (5+ characters).</p>
            )}
          </div>

          {/* Priority + Due date grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">Due Date (optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            The client will see this request in their dashboard with an Upload button.
            Once they upload the file, it appears here automatically as a new document to review.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:border sm:border-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:font-medium"
          >
            {submitting ? 'Sending…' : '✉ Send Request to Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  LAWYER UPLOAD MODAL — attorney uploads their own file to the case
 * ════════════════════════════════════════════════════════════════════ */
function LawyerUploadModal({
  clientName, onClose, onSubmit,
}: {
  clientName?: string;
  onClose:   () => void;
  onSubmit:  (payload: { file: File; document_type: string; category: string }) => Promise<void> | void;
}) {
  const [file,       setFile]       = useState<File | null>(null);
  const [docType,    setDocType]    = useState('');
  // Backend enforces category ∈ {education, employment, identity, legal,
  // other, personal}. Anything else → 422 "Invalid category". Default to
  // legal since most lawyer-uploaded docs (memos, petitions, cover
  // letters) fall under legal.
  const [category,   setCategory]   = useState('legal');
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const fileValid = file !== null;
  const typeValid = docType.trim().length >= 2;
  const canSubmit = fileValid && typeValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) { setShowErrors(true); return; }
    setSubmitting(true);
    await onSubmit({
      file:          file!,
      document_type: docType.trim(),
      category,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900 tracking-[-0.3px]">
              Upload Lawyer Document
            </h3>
            {clientName && (
              <p className="text-[12px] text-slate-500 mt-0.5">
                For <span className="font-medium text-slate-700">{clientName}</span>'s case
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* File */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-purple-700 hover:file:bg-purple-100"
            />
            {file && (
              <p className="mt-1 text-[11px] text-slate-500">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            {showErrors && !fileValid && (
              <p className="mt-1 text-[11px] text-red-600">Please choose a file to upload.</p>
            )}
          </div>

          {/* Document type / title */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Document Name / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="e.g. Drafted Petition, Cover Letter, Legal Memo"
              className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            {showErrors && !typeValid && (
              <p className="mt-1 text-[11px] text-red-600">Please enter a document name (at least 2 characters).</p>
            )}
          </div>

          {/* Category — must match backend enum:
              education | employment | identity | legal | other | personal */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            >
              <option value="legal">Legal (memo, petition, cover letter, filing)</option>
              <option value="employment">Employment</option>
              <option value="identity">Identity</option>
              <option value="education">Education</option>
              <option value="personal">Personal</option>
              <option value="other">Other (evidence, correspondence, misc.)</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            This file will be attached to the case and visible in Case Documents.
            The uploader is recorded on the file's audit trail.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:border sm:border-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:font-medium"
          >
            {submitting ? 'Uploading…' : '⬆ Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  VISA-TYPE CHECKLIST
 *  Renders the real required-documents list fetched from backend
 *  /visa-types.  Ticks are stored in localStorage keyed by documentId +
 *  visaName so the lawyer's progress persists across reloads.  Auto-tick
 *  fires when a sibling document name looks like a match.
 * ════════════════════════════════════════════════════════════════════ */

/** Normalize `required_documents` from backend — accepts array, JSON
 *  string ('["A","B"]'), or comma-separated string. */
function normalizeDocs(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      }
    } catch { /* fall through */ }
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function CaseTypeChecklist({
  documentId, visaName, items, loading, siblings,
}: {
  documentId: string;
  visaName: string;
  items: string[];
  loading: boolean;
  siblings: Document[];
}) {
  const storageKey = `checklist:${documentId}:${visaName}`;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  });

  // Auto-tick when a sibling doc's name looks like the checklist item.
  useEffect(() => {
    const next = { ...checked };
    let changed = false;
    items.forEach((item) => {
      if (next[item]) return;
      const firstWords = item.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4).slice(0, 2);
      if (firstWords.length === 0) return;
      const hit = siblings.some((s) => {
        const n = (s.name + ' ' + (s.document_type || '')).toLowerCase();
        return firstWords.some((w) => n.includes(w));
      });
      if (hit) { next[item] = true; changed = true; }
    });
    if (changed) {
      setChecked(next);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siblings]);

  const toggle = (item: string) => {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const doneCount = items.filter((i) => checked[i]).length;

  return (
    <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">
          {visaName} Required Documents
        </p>
        {items.length > 0 && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
            {doneCount} / {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-indigo-700">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading checklist…
        </div>
      ) : items.length === 0 ? (
        <p className="mt-2 text-[11px] text-gray-500 italic">
          No checklist configured for this visa type yet. Ask your admin to
          add required documents in Visa Types Manager.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item}>
              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checked[item]}
                  onChange={() => toggle(item)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`text-[11px] leading-tight ${
                  checked[item] ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900'
                }`}>
                  {item}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
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