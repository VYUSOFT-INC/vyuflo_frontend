// src/api/lawyer/documents.api.ts
//
// API client for the Lawyer Documents module.
// Endpoints — see documents.types.ts for the full mapping.

import axios from '../axios';

import type {
  Document,
  DocumentListResponse,
  DocumentQueueFilters,
  DocumentPagesResponse,
  ActivityResponse,
  VersionsResponse,
  ChecklistResponse,
  ChecklistItem,
  ChecklistKey,
  NotesResponse,
  ReviewerNote,
  OcrField,
  SaveOcrFieldsPayload,
  UpdateOcrFieldPayload,
  UpdateStatusPayload,
} from '../../types/lawyer/documents.types';
import { DEFAULT_CHECKLIST } from '../../types/lawyer/documents.types';

/* ════════════════════════════════════════════════════════════════════
 *  EXISTING ENDPOINTS (backend ready)
 * ════════════════════════════════════════════════════════════════════ */

/* ── List documents (legacy /documents) ─────────────────────────────── */
export async function listDocuments(
  filters: DocumentQueueFilters = {},
): Promise<DocumentListResponse> {
  const params: Record<string, string> = {};
  if (filters.application_id) params.application_id = filters.application_id;
  const res = await axios.get<DocumentListResponse>('/documents', { params });
  return res.data;
}

/* ── Filtered list (Attorney-Documents) — preferred for Queue ──────── */
export async function filterDocuments(
  filters: DocumentQueueFilters = {},
): Promise<DocumentListResponse> {
  const params: Record<string, string> = {};
  if (filters.application_id) params.application_id = filters.application_id;
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.document_type) params.document_type = filters.document_type;
  if (filters.category)      params.category      = filters.category;
  if (filters.search)        params.search        = filters.search;
  const res = await axios.get<DocumentListResponse>('/documents/filter', { params });
  return res.data;
}

/* ── Get single document ────────────────────────────────────────────── */
export async function getDocument(documentId: string): Promise<Document> {
  const res = await axios.get<Document>(`/documents/${documentId}`);
  return res.data;
}

/* ── Get document file URL (for preview) ────────────────────────────── */
export async function getDocumentViewUrl(documentId: string): Promise<string> {
  const res = await axios.get<string>(`/documents/${documentId}/view`);
  return res.data;
}

/* ── Force download (returns blob URL) ──────────────────────────────── */
export async function downloadDocument(documentId: string): Promise<Blob> {
  const res = await axios.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  return res.data as Blob;
}

/* ── Upload document (multipart) ────────────────────────────────────
 *
 * Bulletproof: uses validateStatus so axios never throws, then we inspect
 * status ourselves. This dodges any global axios response interceptor
 * that crashes on error responses (the "Cannot read properties of
 * undefined (reading 'data')" TypeError we saw was the interceptor
 * choking on an empty 500 body). Non-2xx responses are re-thrown as an
 * axios-shaped error so the caller's catch{} keeps working.
 * ─────────────────────────────────────────────────────────────────── */
export async function uploadDocument(payload: {
  file:           File;
  application_id: string | null;
  document_type:  string;
  category:       string;
  /** Optional — when uploading as a rejection-reason attachment */
  attachment_for?: string;
}): Promise<Document> {
  const fd = new FormData();
  fd.append('file', payload.file);
  if (payload.application_id) fd.append('application_id', payload.application_id);
  fd.append('document_type', payload.document_type);
  fd.append('category', payload.category);
  if (payload.attachment_for) fd.append('attachment_for', payload.attachment_for);

  const res = await axios.post<Document>('/documents/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    validateStatus: () => true,
  });

  if (res.status >= 200 && res.status < 300) {
    return res.data;
  }

  // Re-throw with axios-shaped error so callers keep working unchanged.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err: any = new Error(`Upload failed with status ${res.status}`);
  err.response = { status: res.status, data: res.data };
  throw err;
}

/* ── Page thumbnails (OCR page strip) ──────────────────────────────── */
export async function getDocumentPages(documentId: string): Promise<DocumentPagesResponse> {
  const res = await axios.get<DocumentPagesResponse>(`/documents/${documentId}/pages`);
  return res.data;
}

/* ── Activity / Audit log ──────────────────────────────────────────── */
export async function getActivity(documentId: string): Promise<ActivityResponse> {
  const res = await axios.get<ActivityResponse>(`/documents/${documentId}/activity`);
  return res.data;
}

/* ── Version history ───────────────────────────────────────────────── */
export async function getVersions(documentId: string): Promise<VersionsResponse> {
  const res = await axios.get<VersionsResponse>(`/documents/${documentId}/versions`);
  return res.data;
}

/* ── Update status (Approve / Reject / Reopen) ─────────────────────── */
export async function updateDocumentStatus(
  documentId: string,
  payload: UpdateStatusPayload,
): Promise<Document> {
  const res = await axios.patch<Document>(`/documents/${documentId}/status`, payload);
  return res.data;
}

/* ── Trigger / re-run OCR ──────────────────────────────────────────── */
export async function triggerOcr(documentId: string): Promise<void> {
  await axios.post(`/documents/${documentId}/ocr/trigger`);
}

/* ── Soft delete ─────────────────────────────────────────────────────
 * Bulletproof: never throws on the axios path. Non-2xx are re-thrown as
 * axios-shaped errors so caller catch{} branches still see the right
 * status/detail.  If backend does soft-delete (sets deleted_at but keeps
 * the row), the caller is responsible for hiding the id locally — the
 * frontend maintains a session-scoped "deleted ids" set so re-fetches
 * don't bring the row back.
 * ─────────────────────────────────────────────────────────────────── */
export async function softDeleteDocument(documentId: string): Promise<void> {
  const res = await axios.delete(`/documents/${documentId}`, {
    validateStatus: () => true,
  });
  if (res.status >= 200 && res.status < 300) {
    // Persist to session storage so a reload doesn't re-show the row
    // even if backend didn't actually purge it.
    try {
      const key = 'deletedDocIds';
      const cur = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (!cur.includes(documentId)) {
        cur.push(documentId);
        sessionStorage.setItem(key, JSON.stringify(cur));
      }
    } catch { /* sessionStorage might be blocked */ }
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err: any = new Error(`Delete failed with status ${res.status}`);
  err.response = { status: res.status, data: res.data };
  throw err;
}

/* Read the session-scoped "deleted ids" set. Callers filter fetch
 * results against this so soft-deleted docs stop appearing. */
export function getLocallyDeletedIds(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem('deletedDocIds') || '[]'));
  } catch { return new Set(); }
}

/* ── OCR fields ─────────────────────────────────────────────────────── */
export async function getOcrFields(documentId: string): Promise<OcrField[]> {
  const res = await axios.get<OcrField[]>(`/documents/${documentId}/ocr-fields`);
  return res.data;
}

export async function saveOcrFields(
  documentId: string,
  payload: SaveOcrFieldsPayload,
): Promise<OcrField[]> {
  const res = await axios.post<OcrField[]>(`/documents/${documentId}/ocr-fields`, payload);
  return res.data;
}

export async function saveOrUpdateOcrFields(
  documentId: string,
  payload: SaveOcrFieldsPayload,
): Promise<OcrField[]> {
  const res = await axios.post<OcrField[]>(`/documents/${documentId}/ocr-fields/save`, payload);
  return res.data;
}

export async function confirmAllOcrFields(documentId: string): Promise<void> {
  await axios.post(`/documents/${documentId}/ocr-fields/confirm-all`);
}

export async function updateOcrField(
  documentId: string,
  fieldId: string,
  payload: UpdateOcrFieldPayload,
): Promise<OcrField> {
  const res = await axios.patch<OcrField>(
    `/documents/${documentId}/ocr-fields/${fieldId}`,
    payload,
  );
  return res.data;
}

/* ════════════════════════════════════════════════════════════════════
 *  GAP ENDPOINTS — backend not ready yet → mock fallback in catch{}
 * ════════════════════════════════════════════════════════════════════ */

/* ── Validation Checklist ──────────────────────────────────────────── */
export async function getChecklist(documentId: string): Promise<ChecklistResponse> {
  try {
    const res = await axios.get<ChecklistResponse>(`/documents/${documentId}/checklist`);
    if (res.data?.items?.length) return res.data;
    return { items: DEFAULT_CHECKLIST };
  } catch {
    // Backend endpoint not yet implemented → return default unchecked items.
    return { items: DEFAULT_CHECKLIST };
  }
}

export async function toggleChecklistItem(
  documentId: string,
  key: ChecklistKey,
  checked: boolean,
): Promise<ChecklistItem> {
  try {
    const res = await axios.patch<ChecklistItem>(
      `/documents/${documentId}/checklist/${key}`,
      { checked },
    );
    return res.data;
  } catch {
    // Mock: echo back the requested state so UI stays consistent.
    const base = DEFAULT_CHECKLIST.find((c) => c.key === key)!;
    return { ...base, checked, checked_at: new Date().toISOString() };
  }
}

/* ── Reviewer Notes ────────────────────────────────────────────────── */
export async function listNotes(documentId: string): Promise<NotesResponse> {
  try {
    const res = await axios.get<NotesResponse>(`/documents/${documentId}/notes`);
    return res.data;
  } catch {
    return { items: [], total: 0 };
  }
}

export async function addNote(
  documentId: string,
  body: string,
): Promise<ReviewerNote> {
  try {
    const res = await axios.post<ReviewerNote>(`/documents/${documentId}/notes`, {
      body,
      is_internal: true,
    });
    return res.data;
  } catch {
    // Mock: synthesize a local note so the UI updates optimistically.
    return {
      id:          `local-${Date.now()}`,
      body,
      author_name: 'You',
      created_at:  new Date().toISOString(),
      is_internal: true,
    };
  }
}

/* ── Bundled export ─────────────────────────────────────────────────── */
export const documentsApi = {
  // existing
  listDocuments,
  filterDocuments,
  getDocument,
  getDocumentViewUrl,
  downloadDocument,
  uploadDocument,
  getDocumentPages,
  getActivity,
  getVersions,
  updateDocumentStatus,
  triggerOcr,
  softDeleteDocument,
  getOcrFields,
  saveOcrFields,
  saveOrUpdateOcrFields,
  confirmAllOcrFields,
  updateOcrField,
  // gap fallbacks
  getChecklist,
  toggleChecklistItem,
  listNotes,
  addNote,
  // helpers
  getLocallyDeletedIds,
};