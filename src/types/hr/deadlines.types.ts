// src/types/hr/deadlines.types.ts
//
// HR Deadlines & Extensions types.
// Backend endpoints (to be added to hr_deadline_routes.py):
//   GET    /api/v1/hr/deadlines                          → list all deadlines
//   GET    /api/v1/hr/deadlines/extensions               → list extension requests
//   POST   /api/v1/hr/deadlines/:applicationId/extension → submit extension request
//   PATCH  /api/v1/hr/deadlines/extensions/:id           → approve / deny extension

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type DeadlineUrgency  = 'urgent' | 'warning' | 'on_track' | 'overdue';
export type DeadlineType     =
  | 'lca_response'
  | 'rfe_response'
  | 'document_submission'
  | 'payment'
  | 'form_submission'
  | 'general';
export type ExtensionStatus  = 'pending' | 'approved' | 'denied';

// ─────────────────────────────────────────────────────────────────────────────
// DEADLINE ITEM  (one row in the list)
// ─────────────────────────────────────────────────────────────────────────────

export interface HRDeadlineItem {
  id:              string;        // UUID of the deadline row / application task
  application_id:  string;        // UUID
  case_number:     string;        // e.g. "H1B-2024-001"
  visa_type:       string;        // e.g. "H-1B"
  title:           string;        // e.g. "LCA Response Required"
  description:     string;
  due_date:        string;        // ISO datetime
  days_remaining:  number;        // negative = overdue
  urgency:         DeadlineUrgency;
  deadline_type:   DeadlineType;
  employee_name:   string;
  employer_name:   string;
  attorney_name:   string | null;
  assigned_count:  number;
  status:          string;        // application status passthrough
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTENSION REQUEST
// ─────────────────────────────────────────────────────────────────────────────

export interface HRExtensionRequest {
  id:                   string;
  request_number:       string;   // e.g. "EXT-2024-001"
  application_id:       string;
  case_number:          string;
  visa_type:            string;
  title:                string;
  description:          string;
  original_deadline:    string;   // ISO
  extension_days:       number;
  proposed_deadline:    string;   // ISO
  status:               ExtensionStatus;
  requested_by:         string;
  submitted_at:         string;   // ISO
  reviewed_by:          string | null;
  reviewed_at:          string | null;
  days_until_original:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API REQUEST BODIES
// ─────────────────────────────────────────────────────────────────────────────

export interface HRRequestExtensionBody {
  extension_days: number;
  reason:         string;
}

export interface HRReviewExtensionBody {
  action: 'approve' | 'deny';
  note?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST RESPONSE  (from GET /hr/deadlines)
// ─────────────────────────────────────────────────────────────────────────────

export interface HRDeadlineStats {
  urgent:     number;
  warning:    number;
  on_track:   number;
  extensions: number;   // pending extension count
}

export interface HRDeadlineInsights {
  completion_rate:    number;
  completed_on_time:  number;
  late_completions:   number;
  with_extensions:    number;
  avg_response_days:  number;
  fastest_hours:      number;
  slowest_days:       number;
  high_risk:          number;
  medium_risk:        number;
  low_risk:           number;
}

export interface HRDeadlineListResponse {
  items:    HRDeadlineItem[];
  stats:    HRDeadlineStats;
  insights: HRDeadlineInsights;
  total:    number;
}