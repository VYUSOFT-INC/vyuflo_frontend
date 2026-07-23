// src/types/lawyer/cases.types.ts
//
// Case Management module — Figma nodes 14:23929 (list), 14:39108 (details),
// 101:3800 (overview). Backed by:
//   GET    /api/v1/applications                                  → list
//   GET    /api/v1/applications/{id}                             → detail
//   GET    /api/v1/applications/{id}/comments                    → notes/comments
//   POST   /api/v1/applications/{id}/comments                    → add
//   PATCH  /api/v1/applications/{id}/comments/{cid}              → edit
//   DELETE /api/v1/applications/{id}/comments/{cid}              → soft delete
//   PATCH  /api/v1/applications/{id}/comments/{cid}/pin          → pin toggle
//   GET    /api/v1/applications/{id}/deadlines                   → deadlines
//   POST   /api/v1/applications/{id}/deadlines                   → create
//   PATCH  /api/v1/applications/{id}/deadlines/{did}             → update
//   DELETE /api/v1/applications/{id}/deadlines/{did}             → delete
//   PATCH  /api/v1/applications/{id}/deadlines/{did}/complete    → toggle complete
//   PATCH  /api/v1/applications/{id}/deadlines/{did}/dismiss     → dismiss
//   GET    /api/v1/applications/{id}/status-history              → audit log

/* ─── Enums ─────────────────────────────────────────────────────────── */

export type CaseStatus =
  | 'intake'
  | 'document_collection'
  | 'document_review'
  | 'petition_prep'
  | 'ready_to_file'
  | 'filed'
  | 'rfe_pending'
  | 'rfe_response'
  | 'approved'
  | 'denied'
  | 'on_hold'
  | 'closed'
  | string;

export type CaseUrgency = 'critical' | 'high' | 'medium' | 'low' | string;

export type DeadlineType =
  | 'document_submission'
  | 'uscis_filing'
  | 'rfe_response'
  | 'biometrics'
  | 'interview'
  | 'court_date'
  | 'other'
  | string;

export type CommentVisibility = 'all_staff' | 'attorneys_only' | 'private' | string;

/* ─── List screen (Figma 14:23929) ──────────────────────────────────── */

export interface CaseListItem {
  id: string;                       // application UUID
  case_reference: string;           // e.g. "#VF-2026-089"
  client_id: string;
  client_name: string;
  client_email?: string | null;
  client_avatar_url?: string | null;
  employer_name?: string | null;    // for corporate-sponsored cases
  visa_type_code: string;           // "H-1B" / "O-1A" / "EB-2"
  status: CaseStatus;
  status_label: string;             // pretty label "Petition Prep"
  urgency: CaseUrgency;
  /** Days until next deadline (negative = overdue). null = none. */
  days_to_next_deadline?: number | null;
  next_deadline_label?: string | null;
  /** Pending action flag — drives "Action Required" badge. */
  action_required: boolean;
  /** Has unread RFE / USCIS update. */
  has_alert: boolean;
  /** Attorney currently assigned to this case (current user usually). */
  assigned_attorney_id?: string | null;
  assigned_attorney_name?: string | null;
  filing_date?: string | null;      // ISO date
  created_at: string;
  updated_at: string;
}

export interface CaseListResponse {
  items: CaseListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CaseListParams {
  search?: string;
  status?: CaseStatus | '';
  visa_type?: string | '';
  urgency?: CaseUrgency | '';
  assigned_to_me?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'next_deadline' | 'client_name';
  sort_order?: 'asc' | 'desc';
}

/* ─── Detail screen (Figma 14:39108) ────────────────────────────────── */

export interface CaseDetail extends CaseListItem {
  /** Long form description / case summary. */
  summary?: string | null;
  /** Petitioner / sponsor company (for H-1B etc). */
  petitioner_name?: string | null;
  petitioner_email?: string | null;
  beneficiary_dob?: string | null;
  beneficiary_nationality?: string | null;
  passport_number?: string | null;
  /** Document counts for the header pills. */
  documents_total: number;
  documents_pending: number;
  documents_approved: number;
  documents_rejected: number;
  /** Tasks roll-up. */
  tasks_total: number;
  tasks_open: number;
  /** Timeline anchors. */
  intake_completed_at?: string | null;
  filed_at?: string | null;
  decision_at?: string | null;
}

/* ─── Comments (Screen 11 in Swagger) ───────────────────────────────── */

export interface CaseAuthor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface CaseComment {
  id: string;
  application_id: string;
  author_id: string;
  author: CaseAuthor;
  body: string;
  visible_to: CommentVisibility;
  is_pinned: boolean;
  pinned_by?: string | null;
  pinned_at?: string | null;
  is_edited: boolean;
  edited_at?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseCommentListResponse {
  items: CaseComment[];
  total: number;
}

export interface CaseCommentCreate {
  body: string;
  visible_to?: CommentVisibility;
}

export interface CaseCommentUpdate {
  body: string;
}

/* ─── Deadlines (Screen 11 in Swagger) ──────────────────────────────── */

export interface CaseDeadline {
  id: string;
  application_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  due_date: string;                 // ISO
  urgency: CaseUrgency;
  deadline_type: DeadlineType;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  is_dismissed: boolean;
  dismissed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseDeadlineListResponse {
  items: CaseDeadline[];
  total: number;
}

export interface CaseDeadlineCreate {
  title: string;
  description?: string;
  due_date: string;
  urgency?: CaseUrgency;
  deadline_type?: DeadlineType;
}

export interface CaseDeadlineUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  urgency?: CaseUrgency;
  deadline_type?: DeadlineType;
}

/* ─── Status history / audit log (Overview screen 101:3800) ─────────── */

export interface CaseStatusHistory {
  id: string;
  application_id: string;
  from_status?: CaseStatus | null;
  to_status: CaseStatus;
  from_status_label?: string | null;
  to_status_label: string;
  changed_by: string;
  changed_by_name: string;
  reason?: string | null;
  created_at: string;
}

export interface CaseStatusHistoryResponse {
  items: CaseStatusHistory[];
  total: number;
}

/* ─── UI helpers ────────────────────────────────────────────────────── */

/** Tab identifier on the detail page — URL-driven via ?tab=. */
export type CaseDetailTab = 'details' | 'overview' | 'comments' | 'deadlines';