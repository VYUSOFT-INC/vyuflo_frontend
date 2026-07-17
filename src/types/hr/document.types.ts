// src/types/hr/document.types.ts
//
// HR-side document types.
// Mirrors the backend DocumentResponse schema from app/schemas/employee/document.py
// Extended with HR-specific fields (verified_by, rejection notes, etc.)
//
// Backend endpoints (document_router):
//   GET    /api/v1/hr/cases/:applicationId/documents        → list docs for a case
//   POST   /api/v1/hr/cases/:applicationId/documents/upload → upload a doc on behalf of employee
//   GET    /api/v1/hr/documents/:documentId                 → get single doc
//   GET    /api/v1/hr/documents/:documentId/view            → stream file for preview
//   PATCH  /api/v1/hr/documents/:documentId/verify         → verify a doc
//   PATCH  /api/v1/hr/documents/:documentId/reject         → reject a doc
//   DELETE /api/v1/hr/documents/:documentId                → delete a doc
//   POST   /api/v1/hr/documents/:documentId/request         → request re-upload from employee

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS  (match backend Enum values exactly)
// ─────────────────────────────────────────────────────────────────────────────

export type HRDocumentStatus =
  | 'required'
  | 'uploaded'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'missing';

export type HRDocumentCategory =
  | 'identity'
  | 'employment'
  | 'education'
  | 'legal'
  | 'personal'
  | 'other';

export type HRDocumentFileFormat =
  | 'pdf'
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'docx'
  | 'gif';

export type HROCRStatus =
  | 'not_started'
  | 'processing'
  | 'completed'
  | 'review_needed'
  | 'confirmed';

// ─────────────────────────────────────────────────────────────────────────────
// CORE RESPONSE  (matches DocumentResponse pydantic schema 1:1)
// ─────────────────────────────────────────────────────────────────────────────

export interface HRDocumentResponse {
  id:               string;           // UUID
  user_id:          string;           // UUID — the employee who owns the doc
  application_id:   string | null;    // UUID — which case
  document_type_id: string;           // UUID

  // File info
  name:             string;           // = file_name
  file_size_bytes:  number;           // = file_size_kb * 1024
  file_type:        HRDocumentFileFormat;

  // Lookup data
  document_type:    string | null;    // DocumentType.name e.g. "Passport"
  category:         HRDocumentCategory | null;

  // Status
  status:           HRDocumentStatus;
  uploaded_at:      string;           // ISO datetime = created_at
  verified_at:      string | null;
  rejection_reason: string | null;

  // OCR
  total_pages:      number | null;
  ocr_status:       HROCRStatus;
  version:          number;
}

export interface HRDocumentListResponse {
  items: HRDocumentResponse[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST BODIES (HR-side only)
// ─────────────────────────────────────────────────────────────────────────────

export interface HRVerifyDocumentRequest {
  note?: string;           // optional HR note visible to employee
}

export interface HRRejectDocumentRequest {
  rejection_reason: string;    // shown to employee
  request_reupload?: boolean;  // if true, also sends a re-upload request
}

export interface HRRequestDocumentRequest {
  message?: string;            // custom message to employee
  due_date?: string;           // ISO date — when HR needs it by
}

export interface HRUploadDocumentRequest {
  document_type: string;       // e.g. "passport"
  category:      HRDocumentCategory;
  application_id?: string;     // UUID — which case this belongs to
}

// ─────────────────────────────────────────────────────────────────────────────
// UI-COMPUTED HELPER TYPES  (not from API — derived in the hook/component)
// ─────────────────────────────────────────────────────────────────────────────

export interface HRDocumentUIEntry extends HRDocumentResponse {
  // Derived fields used by DocumentCard
  file_size_label:  string;        // "2.3 MB"
  uploaded_ago:     string;        // "3 days ago"
  is_overdue:       boolean;       // status = missing && required
  can_verify:       boolean;       // status = pending_review || uploaded
  can_reject:       boolean;       // status = pending_review || uploaded
  can_delete:       boolean;       // !required
  can_request:      boolean;       // status = missing
  preview_url:      string;        // /api/v1/hr/documents/:id/view
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS SHAPES  (computed from list, used by ProgressOverview)
// ─────────────────────────────────────────────────────────────────────────────

export interface HRDocumentStats {
  total:         number;
  verified:      number;
  pending:       number;
  missing:       number;
  rejected:      number;
  pct_complete:  number;   // 0–100
}