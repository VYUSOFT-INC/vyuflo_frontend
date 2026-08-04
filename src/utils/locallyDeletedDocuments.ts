// src/utils/locallyDeletedDocuments.ts
//
// Tracks document IDs the current user deleted client-side, so UI/pollers
// (e.g. useLawyerNotificationWatcher) can filter them out of diffs/queues
// immediately, without waiting for the backend to catch up or refetching.
//
// Persisted in localStorage — survives refresh, cleared only when the
// document is confirmed gone from the backend or the caller explicitly clears it.

const STORAGE_KEY = 'Vyuflo.documents.locally_deleted.v1';

function readIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota errors */
  }
}

/** Mark a document as locally deleted (call right after a successful delete). */
export function markDocumentLocallyDeleted(documentId: string): void {
  const ids = readIds();
  ids.add(documentId);
  writeIds(ids);
}

/** Get the current set of locally-deleted document IDs. */
export function getLocallyDeletedDocumentIds(): Set<string> {
  return readIds();
}

/** Remove a document from the locally-deleted set (e.g. once backend confirms the deletion, or if the delete failed). */
export function clearDocumentLocallyDeleted(documentId: string): void {
  const ids = readIds();
  ids.delete(documentId);
  writeIds(ids);
}