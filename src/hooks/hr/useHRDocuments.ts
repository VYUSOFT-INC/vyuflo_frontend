// src/hooks/hr/useHRDocuments.ts
//
// Hook for HR Document Management page.
// Wraps hrDocumentApi with loading states, optimistic UI updates,
// and computed stats/derived fields used by HRDocumentManagement.tsx.

import { useState, useCallback, useMemo } from 'react';
import { hrDocumentApi } from '../../api/hr/hrDocument.api';
import type {
  HRDocumentResponse,
  HRDocumentUIEntry,
  HRDocumentStats,
  HRVerifyDocumentRequest,
  HRRejectDocumentRequest,
  HRRequestDocumentRequest,
  HRUploadDocumentRequest,
} from '../../types/hr/document.types';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days  = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const REQUIRED_TYPES = new Set([
  'passport', 'form_i129', 'lca', 'degree', 'employment_letter',
  'resume', 'i94', 'pay_stubs', 'i983',
]);

/**
 * Enrich a raw API response with UI-computed fields.
 */
function toUIEntry(doc: HRDocumentResponse): HRDocumentUIEntry {
  const isRequired = REQUIRED_TYPES.has(doc.document_type?.toLowerCase().replace(/[\s-]/g, '_') ?? '');
  return {
    ...doc,
    file_size_label: formatBytes(doc.file_size_bytes),
    uploaded_ago:    timeAgo(doc.uploaded_at),
    is_overdue:      doc.status === 'missing' && isRequired,
    can_verify:      doc.status === 'pending_review' || doc.status === 'uploaded',
    can_reject:      doc.status === 'pending_review' || doc.status === 'uploaded',
    can_delete:      !isRequired,
    can_request:     doc.status === 'missing',
    preview_url:     hrDocumentApi.getPreviewUrl(doc.id),
  };
}

function computeStats(docs: HRDocumentUIEntry[]): HRDocumentStats {
  const total    = docs.length;
  const verified = docs.filter(d => d.status === 'verified').length;
  const pending  = docs.filter(d => d.status === 'pending_review' || d.status === 'uploaded').length;
  const missing  = docs.filter(d => d.status === 'missing').length;
  const rejected = docs.filter(d => d.status === 'rejected').length;
  return {
    total,
    verified,
    pending,
    missing,
    rejected,
    pct_complete: total > 0 ? Math.round((verified / total) * 100) : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

interface UseHRDocumentsReturn {
  // State
  documents:   HRDocumentUIEntry[];
  stats:       HRDocumentStats;
  isLoading:   boolean;
  error:       string | null;

  // Actions
  load:           (applicationId: string) => Promise<void>;
  upload:         (file: File, meta: HRUploadDocumentRequest) => Promise<void>;
  verify:         (documentId: string, payload?: HRVerifyDocumentRequest) => Promise<void>;
  reject:         (documentId: string, payload: HRRejectDocumentRequest) => Promise<void>;
  requestDoc:     (documentId: string, payload?: HRRequestDocumentRequest) => Promise<void>;
  requestMissing: (applicationId: string, message?: string) => Promise<number>;
  deleteDoc:      (documentId: string) => Promise<void>;
}

export function useHRDocuments(): UseHRDocumentsReturn {
  const [rawDocs,   setRawDocs]   = useState<HRDocumentResponse[]>([]);
  const [isLoading, setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Derive UI entries + stats from raw docs
  const documents = useMemo(() => rawDocs.map(toUIEntry), [rawDocs]);
  const stats     = useMemo(() => computeStats(documents), [documents]);

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async (applicationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrDocumentApi.listByCase(applicationId);
      setRawDocs(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Upload ─────────────────────────────────────────────────────────────────

  const upload = useCallback(async (file: File, meta: HRUploadDocumentRequest) => {
    const newDoc = await hrDocumentApi.upload(file, meta);
    // Append optimistically — new doc will be in 'uploaded' state
    setRawDocs(prev => [newDoc, ...prev]);
  }, []);

  // ── Verify (optimistic) ────────────────────────────────────────────────────

  const verify = useCallback(async (documentId: string, payload: HRVerifyDocumentRequest = {}) => {
    // Optimistic update: set status to 'verified' immediately
    setRawDocs(prev => prev.map(d =>
      d.id === documentId
        ? { ...d, status: 'verified' as const, verified_at: new Date().toISOString() }
        : d
    ));
    try {
      const updated = await hrDocumentApi.verify(documentId, payload);
      // Replace with server truth
      setRawDocs(prev => prev.map(d => d.id === documentId ? updated : d));
    } catch (err: unknown) {
      // Rollback
      setRawDocs(prev => prev.map(d =>
        d.id === documentId ? { ...d, status: 'pending_review' as const, verified_at: null } : d
      ));
      throw err;
    }
  }, []);

  // ── Reject (optimistic) ────────────────────────────────────────────────────

  const reject = useCallback(async (documentId: string, payload: HRRejectDocumentRequest) => {
    const prev_status = rawDocs.find(d => d.id === documentId)?.status;
    setRawDocs(prev => prev.map(d =>
      d.id === documentId
        ? { ...d, status: 'rejected' as const, rejection_reason: payload.rejection_reason }
        : d
    ));
    try {
      const updated = await hrDocumentApi.reject(documentId, payload);
      setRawDocs(prev => prev.map(d => d.id === documentId ? updated : d));
    } catch (err: unknown) {
      // Rollback
      setRawDocs(prev => prev.map(d =>
        d.id === documentId ? { ...d, status: (prev_status ?? 'pending_review') as any, rejection_reason: null } : d
      ));
      throw err;
    }
  }, [rawDocs]);

  // ── Request document ───────────────────────────────────────────────────────

  const requestDoc = useCallback(async (documentId: string, payload: HRRequestDocumentRequest = {}) => {
    await hrDocumentApi.requestDocument(documentId, payload);
    // No state change needed — just a notification to employee
  }, []);

  // ── Request all missing ────────────────────────────────────────────────────

  const requestMissing = useCallback(async (applicationId: string, message?: string): Promise<number> => {
    const res = await hrDocumentApi.requestMissing(applicationId, message);
    return res.requested;
  }, []);

  // ── Delete (optimistic) ────────────────────────────────────────────────────

  const deleteDoc = useCallback(async (documentId: string) => {
    const backup = rawDocs.find(d => d.id === documentId);
    setRawDocs(prev => prev.filter(d => d.id !== documentId));
    try {
      await hrDocumentApi.delete(documentId);
    } catch (err: unknown) {
      // Rollback
      if (backup) setRawDocs(prev => [backup, ...prev]);
      throw err;
    }
  }, [rawDocs]);

  return {
    documents,
    stats,
    isLoading,
    error,
    load,
    upload,
    verify,
    reject,
    requestDoc,
    requestMissing,
    deleteDoc,
  };
}