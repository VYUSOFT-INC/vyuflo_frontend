// src/types/employee/rejectedDocuments.types.ts
//
// Types for the "Action Required" feed — documents the attorney has
// rejected and the client needs to re-upload.
// Matches backend Swagger: GET /api/v1/documents/my-rejected

/* ── Shape of one rejected document ─────────────────────────────── */
export interface MyRejectedDocument {
  id:               string;        // document UUID
  file_name:        string;        // original filename
  rejection_reason: string;        // serialized reason from lawyer
  status:           string;        // typically "rejected"
  updated_at:       string;        // when status changed (ISO datetime)
}

/* ── Paginated list response ────────────────────────────────────── */
export interface MyRejectedDocumentsResponse {
  items: MyRejectedDocument[];
  total: number;
}