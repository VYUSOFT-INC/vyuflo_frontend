// // src/types/dashboard.types.ts

// export interface DashboardStats {
//   active_applications:  number;
//   documents_verified:   number;
//   documents_total:      number;
//   documents_action_required: number;
//   processing_days:      number;
//   processing_type:      string;    // "Standard Processing" | "Premium Processing"
//   sponsor_name:         string;
//   sponsor_stage:        string;    // "LCA Filed" | "I-129 Submitted" etc.
//   sponsor_verified:     boolean;
//   profile_readiness:    number;    // 0–100 percentage
// }

// export interface ActivityItem {
//   id:          string;
//   title:       string;
//   description: string;
//   timestamp:   string;     // ISO string
//   color:       string;     // "#5269f2" | "#10b981" | "#cbd5e1"
// }

// export interface GuidanceItem {
//   id:          string;
//   tag:         string;     // "Required" | "Optional" | "Tip" | "Info"
//   tag_color:   string;     // "blue" | "purple" | "gray"
//   title:       string;
//   description: string;
//   icon_type:   string;
// }

// export interface DashboardResponse {
//   stats:      DashboardStats;
//   activity:   ActivityItem[];
//   guidance:   GuidanceItem[];
// }

// export interface ProfileReadiness {
//   percentage: number;
//   items: {
//     label:    string;
//     done:     boolean;
//   }[];
// }

// src/types/employee/dashboard.types.ts
//
// Matches the backend DashboardResponse from app/schemas/dashboard.py

// ── Case Pipeline ────────────────────────────────────────────────────────────

export type CaseStageStatus = 'completed' | 'active' | 'upcoming' | 'blocked';

export interface CaseStage {
  key: string;
  label: string;
  status: CaseStageStatus;
  started_at?: string;
  completed_at?: string;
  note?: string;
}

export interface CaseSummary {
  application_id: string;
  visa_type: string;
  visa_label: string;
  case_number?: string;
  filed_date?: string;
  current_stage: string;
  stages: CaseStage[];
  overall_progress: number;
}

// ── KPI Stats ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  active_applications: number;
  documents_verified: number;
  documents_total: number;
  documents_action_required: number;
  processing_days_elapsed: number;
  processing_days_estimated: number;
  processing_type: string;
  next_deadline_label: string;
  next_deadline_date: string;
  next_deadline_days: number;
  profile_readiness: number;
  sponsor_name: string;
  sponsor_verified: boolean;
  compliance_score: number;
}

// ── Action Items ─────────────────────────────────────────────────────────────

export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low';
export type ActionCategory = 'document' | 'form' | 'payment' | 'appointment' | 'review' | 'info';

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  priority: ActionPriority;
  due_date?: string;
  days_left?: number;
  route?: string;
  completed: boolean;
}

// ── Documents ────────────────────────────────────────────────────────────────

export type DocStatus = 'verified' | 'pending_review' | 'action_required' | 'not_uploaded' | 'rejected';

export interface DocumentSummaryItem {
  id: string;
  name: string;
  category: string;
  status: DocStatus;
  uploaded_at?: string;
  note?: string;
}

// ── Deadlines ────────────────────────────────────────────────────────────────

export type DeadlineUrgency = 'overdue' | 'critical' | 'soon' | 'normal';

export interface Deadline {
  id: string;
  title: string;
  date: string;
  days_left: number;
  urgency: DeadlineUrgency;
  owner: 'employee' | 'attorney' | 'employer' | 'uscis';
  description?: string;
}

// ── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentSummary {
  total_fees: number;
  paid: number;
  pending: number;
  next_payment_label?: string;
  next_payment_amount?: number;
  next_payment_due?: string;
}

// ── Case Team ────────────────────────────────────────────────────────────────

export interface CaseTeamMember {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  available: boolean;
}

// ── Activity ─────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'stage_advanced'
  | 'document_uploaded'
  | 'document_verified'
  | 'document_rejected'
  | 'payment_received'
  | 'message_received'
  | 'deadline_reminder'
  | 'case_note'
  | 'form_submitted'
  | 'appointment_scheduled';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

// ── Profile Readiness ────────────────────────────────────────────────────────

export interface ReadinessSection {
  key: string;
  label: string;
  completed: boolean;
  required: boolean;
}

// ── Aggregate Response ───────────────────────────────────────────────────────

export interface DashboardResponse {
  stats: DashboardStats;
  case_summary: CaseSummary | null;
  action_items: ActionItem[];
  documents: DocumentSummaryItem[];
  deadlines: Deadline[];
  payments: PaymentSummary;
  case_team: CaseTeamMember[];
  activity: ActivityItem[];
  readiness: ReadinessSection[];
}