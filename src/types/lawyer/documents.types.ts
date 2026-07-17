// src/types/lawyer/documents.types.ts
//
// Types for the Lawyer Documents module (Queue + Review sub-pages).
// Matches backend Swagger:
//   Documents:
//     GET    /api/v1/documents
//     GET    /api/v1/documents/{document_id}
//     GET    /api/v1/documents/{document_id}/view
//     POST   /api/v1/documents/upload
//     GET    /api/v1/documents/{document_id}/ocr-fields
//     POST   /api/v1/documents/{document_id}/ocr-fields
//     POST   /api/v1/documents/{document_id}/ocr-fields/save
//     POST   /api/v1/documents/{document_id}/ocr-fields/confirm-all
//     PATCH  /api/v1/documents/{document_id}/ocr-fields/{field_id}
//   Attorney-Documents:
//     GET    /api/v1/documents/filter
//     GET    /api/v1/documents/{document_id}/download
//     GET    /api/v1/documents/{document_id}/versions
//     GET    /api/v1/documents/{document_id}/activity
//     GET    /api/v1/documents/{document_id}/pages
//     PATCH  /api/v1/documents/{document_id}/status
//     POST   /api/v1/documents/{document_id}/ocr/trigger
//     DELETE /api/v1/documents/{document_id}
//
// ⚠️ Pending backend additions (frontend uses mock fallback for now):
//     GET    /api/v1/documents/{document_id}/checklist
//     PATCH  /api/v1/documents/{document_id}/checklist/{key}
//     GET    /api/v1/documents/{document_id}/notes
//     POST   /api/v1/documents/{document_id}/notes
//     PATCH  /api/v1/documents/{document_id}/status  — extend body with rejection_reason{}

/* ── Document status enum ───────────────────────────────────────────── */
export type DocumentStatus =
  | 'pending'           // newly uploaded, awaiting review
  | 'in_progress'       // lawyer is currently reviewing
  | 'action_required'   // OCR needs human review / fields missing
  | 'approved'          // lawyer approved
  | 'rejected'          // lawyer rejected — client must re-upload
  | 'required';         // backend's default value per swagger

/* ── OCR status ─────────────────────────────────────────────────────── */
export type OcrStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'manual';   // requires manual entry (no OCR possible)

/* ── Document list item ─────────────────────────────────────────────── */
export interface Document {
  id:               string;
  user_id:          string;
  application_id:   string;
  document_type_id: string;
  name:             string;
  file_size_bytes:  number;
  file_type:        string;      // "pdf" | "jpg" | "png" | etc.
  status:           DocumentStatus;
  document_type:    string;      // human-readable, e.g. "Passport", "Educational Certificate"
  category:         string;      // e.g. "personal", "education", "employment"
  uploaded_at:      string;      // ISO datetime
  verified_at:      string | null;
  rejection_reason: string | null;
  total_pages:      number;
  ocr_status:       OcrStatus;
  version:          number;

  // Optional joined fields (backend may add later for queue performance)
  client_name?:     string;      // joined from users
  case_id?:         string;      // joined from applications (case number)
}

/* ── Document list response ─────────────────────────────────────────── */
export interface DocumentListResponse {
  items: Document[];
  total: number;
}

/* ── Document upload payload ────────────────────────────────────────── */
export interface UploadDocumentFormData {
  file:           File;
  application_id: string | null;
  document_type:  string;
  category:       string;
}

/* ── OCR extracted field ────────────────────────────────────────────── */
export interface OcrField {
  id:               string;
  document_id:      string;
  field_name:       string;       // e.g. "passport_number", "given_name"
  extracted_value:  string;       // OCR's best guess
  confidence_score: number;       // 0..1 — lower means needs review
  needs_review:     boolean;
  is_confirmed:     boolean;
  confirmed_at:     string | null;
}

/* ── Save OCR fields payload (bulk) ─────────────────────────────────── */
export interface SaveOcrFieldsPayload {
  fields: Array<{
    id?:              string;     // present = update, absent = new
    field_name:       string;
    extracted_value:  string;
    confidence_score: number;
    needs_review:     boolean;
  }>;
}

/* ── Update single OCR field payload (PATCH) ────────────────────────── */
export interface UpdateOcrFieldPayload {
  extracted_value: string;
  is_confirmed:    boolean;
}

/* ── Queue filter params ────────────────────────────────────────────── */
export interface DocumentQueueFilters {
  application_id?: string;
  status?:         DocumentStatus | 'all';
  document_type?:  string;
  category?:       string;
  date_range?:     'today' | 'last_7_days' | 'last_30_days' | 'all';
  search?:         string;
}

/* ── Queue stat tiles (top 4 KPI cards) ─────────────────────────────── */
export interface QueueStats {
  total:            number;
  action_required:  number;
  in_progress:      number;
  approved_today:   number;
}

/* ════════════════════════════════════════════════════════════════════
 * DOCUMENT REVIEW (Pending / Rejected / Approved screens)
 * ════════════════════════════════════════════════════════════════════ */

/* ── Page thumbnails (OCR page strip) ──────────────────────────────── */
export interface DocumentPage {
  page_number:   number;
  thumbnail_url: string;
  full_url:      string;
  width:         number;
  height:        number;
}

export interface DocumentPagesResponse {
  items: DocumentPage[];
  total: number;
}

/* ── Activity / Audit timeline ─────────────────────────────────────── */
export type ActivityEventType =
  | 'uploaded'
  | 'ocr_started'
  | 'ocr_completed'
  | 'review_started'
  | 'field_edited'
  | 'field_confirmed'
  | 'approved'
  | 'rejected'
  | 'reopened'
  | 'note_added'
  | 'version_uploaded';

export interface ActivityItem {
  id:            string;
  event_type:    ActivityEventType;
  actor_name:    string;
  actor_role:    'attorney' | 'client' | 'hr' | 'system' | 'admin';
  message:       string;          // human-readable summary
  occurred_at:   string;          // ISO datetime
  metadata?:     Record<string, unknown>;
}

export interface ActivityResponse {
  items: ActivityItem[];
  total: number;
}

/* ── Version history ────────────────────────────────────────────────── */
export interface VersionItem {
  version:        number;
  uploaded_at:    string;
  uploaded_by:    string;          // user name
  file_size_bytes: number;
  status:         DocumentStatus;
  is_current:     boolean;
}

export interface VersionsResponse {
  items: VersionItem[];
  total: number;
}

/* ── Validation Checklist (BACKEND GAP — using mock fallback) ──────── */
export type ChecklistKey = 'is_clear' | 'has_signatures' | 'dates_match';

export interface ChecklistItem {
  key:          ChecklistKey;
  label:        string;            // display text
  checked:      boolean;
  checked_by?:  string;            // user name when toggled
  checked_at?:  string;            // ISO when toggled
}

export interface ChecklistResponse {
  items: ChecklistItem[];
}

/** Default checklist (used as initial state when backend not ready). */
export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: 'is_clear',       label: 'Document is clear and legible',        checked: false },
  { key: 'has_signatures', label: 'All required signatures are present',  checked: false },
  { key: 'dates_match',    label: 'Dates match supporting documentation', checked: false },
];

/* ── Reviewer Notes (BACKEND GAP — using mock fallback) ─────────────── */
export interface ReviewerNote {
  id:          string;
  body:        string;
  author_name: string;
  created_at:  string;
  is_internal: true;
}

export interface NotesResponse {
  items: ReviewerNote[];
  total: number;
}

/* ── Rejection Reason (BACKEND GAP — extend PATCH /status payload) ──── */
export type IssueCategory =
  | 'missing_info'
  | 'incorrect_data'
  | 'expired'
  | 'illegible'
  | 'other';

export type Severity = 'high' | 'medium' | 'low';

export interface RejectionReason {
  issue_category: IssueCategory;
  severity:       Severity;
  due_date:       string;          // YYYY-MM-DD
  required_info:  string;
  attachment_ids: string[];
}

/**
 * Backend wants `rejection_reason` as a plain string (per Swagger).
 * Frontend collects rich data via RejectionReason form, then serializes
 * to a single human-readable string before sending.
 */
export interface UpdateStatusPayload {
  status:            DocumentStatus;
  rejection_reason?: string;            // required when status === 'rejected'
}

/* ── Display helpers ────────────────────────────────────────────────── */
export const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending:         'Pending',
  in_progress:     'In Progress',
  action_required: 'Action Required',
  approved:        'Approved',
  rejected:        'Rejected',
  required:        'Pending',
};

export const STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string; dot: string }> = {
  pending:         { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  in_progress:     { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  action_required: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
  approved:        { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected:        { bg: 'bg-gray-50',    text: 'text-gray-700',    dot: 'bg-gray-500'    },
  required:        { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  missing_info:   'Missing Information',
  incorrect_data: 'Incorrect Data',
  expired:        'Expired Document',
  illegible:      'Illegible / Poor Quality',
  other:          'Other',
};

export const SEVERITY_LABELS: Record<Severity, { label: string; bg: string; text: string }> = {
  high:   { label: 'High',   bg: 'bg-red-50',    text: 'text-red-700'    },
  medium: { label: 'Medium', bg: 'bg-amber-50',  text: 'text-amber-700'  },
  low:    { label: 'Low',    bg: 'bg-emerald-50', text: 'text-emerald-700' },
};