// src/types/employee/documentRequests.types.ts
//
// Shared types for the "Request Additional Document" flow.
// Field names match the backend API contract:
//   POST   /api/v1/documents/requests                 — attorney creates
//   GET    /api/v1/documents/requests/my-pending      — client fetches
//   GET    /api/v1/applications/{id}/document-requests — attorney per-case list
//   PATCH  /api/v1/documents/requests/{id}/cancel     — attorney cancels
//
// Client fulfills the request by uploading a document with the
//   document_request_id form field set to the request's id.

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DocumentRequestStatus = 'pending' | 'fulfilled' | 'cancelled';

/* ── Lawyer side: create a request ───────────────────────────────────── */
export interface CreateDocumentRequestPayload {
  /** Application the request is tied to. */
  application_id: string;
  /** Human-readable doc name — appears as the row title on the client's side. */
  document_name:  string;
  /** Free-text explaining what the client needs to provide. */
  details:        string;
  /** Optional priority (defaults to 'normal' server-side). */
  priority?:      RequestPriority;
  /** Optional YYYY-MM-DD deadline. */
  due_date?:      string | null;
}

export interface CreateDocumentRequestResponse {
  id:              string;
  application_id:  string;
  document_name:   string;
  details:         string;
  priority:        RequestPriority;
  due_date:        string | null;
  status:          DocumentRequestStatus;
  requested_by:    string;
  requested_at:    string;
}

/* ── Employee side: one request the client needs to fulfill ──────────── */
export interface RequestedDocument {
  id:                 string;
  application_id:     string | null;
  document_name:      string;
  details:            string;
  priority:           RequestPriority;
  due_date:           string | null;
  status:             DocumentRequestStatus;
  requested_by:       string | null;
  requested_by_name?: string | null;
  requested_at:       string;
}

export interface MyRequestedDocumentsResponse {
  items: RequestedDocument[];
  total: number;
}