// src/types/hr/approval.types.ts
//
// HR Approval Queue types.
// Backend endpoints (to be added to hr_approval_routes.py):
//   GET    /api/v1/hr/approvals                     → list all pending approvals
//   PATCH  /api/v1/hr/approvals/:documentId/approve → approve a document
//   PATCH  /api/v1/hr/approvals/:documentId/reject  → request edits / reject
//   POST   /api/v1/hr/approvals/bulk-approve        → approve multiple at once

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalItemStatus = 'pending' | 'approved' | 'edits_requested';
export type ApprovalItemPriority = 'critical' | 'high' | 'medium' | 'low';
export type ApprovalItemDocType = 'letter' | 'form' | 'document' | 'certificate';

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL ITEM  (one row returned from GET /hr/approvals)
// ─────────────────────────────────────────────────────────────────────────────

export interface HRApprovalComment {
  author: string;
  role:   string;
  time:   string;   // relative e.g. "3 hours ago"
  text:   string;
}

export interface HRApprovalRevision {
  version: string;  // "v1", "v2", "v3"
  label:   string;  // "Original Version", "Current Version"
  author:  string;
  time:    string;
}

export interface HRApprovalExtractedField {
  label: string;
  value: string;
}

export interface HRApprovalItem {
  id:            string;           // document UUID
  title:         string;           // document name
  priority:      ApprovalItemPriority;
  doc_type:      ApprovalItemDocType;
  visa_type:     string;           // e.g. "H-1B Specialty Occupation"
  employee_name: string;
  case_number:   string;
  submitted_ago: string;           // relative time string from backend
  description:   string;
  status:        ApprovalItemStatus;

  // AI confidence (0 = not available)
  ai_confidence: number;
  ai_note:       string;

  // Extracted fields section
  extracted_label:  string;
  extracted_fields: HRApprovalExtractedField[];

  // Optional sections
  action_note?:  { type: 'warning' | 'edit'; title: string; body: string };
  comments?:     HRApprovalComment[];
  revisions?:    HRApprovalRevision[];
  comment_count?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

export interface HRApprovalStats {
  pending:        number;
  approved_today: number;
  edits_requested: number;
  avg_response_hours: number;  // e.g. 2.4
}

export interface HRApprovalListResponse {
  items: HRApprovalItem[];
  stats: HRApprovalStats;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST BODIES
// ─────────────────────────────────────────────────────────────────────────────

export interface HRApproveDocumentRequest {
  note?: string;
}

export interface HRRequestEditsRequest {
  note: string;          // required — what needs to be changed
}

export interface HRBulkApproveRequest {
  document_ids: string[];
  note?: string;
}