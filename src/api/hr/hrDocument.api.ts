// src/api/hr/hrDocument.api.ts
//
// HR Document Management API calls.
// Added: getFile() — blob fetch with cookies for Preview and Download.
// Same pattern as employee documentsApi.getFile().

import axios from '../axios';
import type {
  HRDocumentListResponse,
  HRDocumentResponse,
  HRVerifyDocumentRequest,
  HRRejectDocumentRequest,
  HRRequestDocumentRequest,
  HRUploadDocumentRequest,
} from '../../types/hr/document.types';

export const hrDocumentApi = {

  // ─── LIST ──────────────────────────────────────────────────────────────────

  listByCase: async (applicationId: string): Promise<HRDocumentListResponse> => {
    const res = await axios.get(`/hr/cases/${applicationId}/documents`);
    return res.data;
  },

  list: async (applicationId?: string): Promise<HRDocumentListResponse> => {
    const params = applicationId ? { application_id: applicationId } : {};
    const res = await axios.get('/hr/documents', { params });
    return res.data;
  },

  // ─── SINGLE ────────────────────────────────────────────────────────────────

  getById: async (documentId: string): Promise<HRDocumentResponse> => {
    const res = await axios.get(`/hr/documents/${documentId}`);
    return res.data;
  },

  // ─── FILE (blob) ───────────────────────────────────────────────────────────
  // Used for Preview (open in new tab) and Download (trigger file save).
  // Must use axios (not a bare URL) so auth cookies are sent automatically.
  // Matches the same pattern as employee documentsApi.getFile().

  getFile: async (documentId: string): Promise<{ blob: Blob; fileName: string; contentType: string }> => {
    const res = await axios.get(`/hr/documents/${documentId}/view`, {
      responseType: 'blob',
    });
    const disposition = String(res.headers['content-disposition'] ?? '');
    const contentType  = String(res.headers['content-type'] ?? 'application/octet-stream');
    const nameMatch    = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)["']?/);
    const fileName     = nameMatch?.[1]?.trim() ?? 'document';
    return { blob: res.data, fileName, contentType };
  },

  // Kept for backward compatibility — returns a plain URL string.
  // Do NOT use this for Preview/Download — it won't send cookies.
  // Use getFile() instead.
  getPreviewUrl: (documentId: string): string => {
    const base = (import.meta.env.VITE_API_BASE_URL as string) ?? '';
    return `${base}/api/v1/hr/documents/${documentId}/view`;
  },

  // ─── UPLOAD ────────────────────────────────────────────────────────────────

  upload: async (file: File, meta: HRUploadDocumentRequest): Promise<HRDocumentResponse> => {
    const form = new FormData();
    form.append('file', file);
    form.append('document_type', meta.document_type);
    form.append('category', meta.category);
    if (meta.application_id) {
      form.append('application_id', meta.application_id);
    }
    const res = await axios.post('/hr/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // ─── VERIFY ────────────────────────────────────────────────────────────────

  verify: async (documentId: string, payload: HRVerifyDocumentRequest = {}): Promise<HRDocumentResponse> => {
    const res = await axios.patch(`/hr/documents/${documentId}/verify`, payload);
    return res.data;
  },

  // ─── REJECT ────────────────────────────────────────────────────────────────

  reject: async (documentId: string, payload: HRRejectDocumentRequest): Promise<HRDocumentResponse> => {
    const res = await axios.patch(`/hr/documents/${documentId}/reject`, payload);
    return res.data;
  },

  // ─── REQUEST RE-UPLOAD ─────────────────────────────────────────────────────

  requestDocument: async (
    documentId: string,
    payload: HRRequestDocumentRequest = {},
  ): Promise<{ success: boolean; message: string }> => {
    const res = await axios.post(`/hr/documents/${documentId}/request`, payload);
    return res.data;
  },

  requestMissing: async (applicationId: string, message?: string): Promise<{ requested: number }> => {
    const res = await axios.post(
      `/hr/cases/${applicationId}/documents/request-missing`,
      { message },
    );
    return res.data;
  },

  // ─── DELETE ────────────────────────────────────────────────────────────────

  delete: async (documentId: string): Promise<void> => {
    await axios.delete(`/hr/documents/${documentId}`);
  },
};