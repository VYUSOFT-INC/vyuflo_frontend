// // src/types/hr/dashboard.types.ts
// //
// // Types for the HR Compliance Dashboard (/employer/dashboard).
// // Everything the dashboard renders comes from a single HRDashboardData payload.

// // ── Expiring visas ──────────────────────────────────────────────────────────

// /** Urgency bucket — drives the filter tabs and row colors. */
// export type ExpiryUrgency = 'critical' | 'warning' | 'upcoming'; // <30d / 30–60d / 60–90d

// /** Where the renewal workflow currently stands for an expiring visa. */
// export type RenewalStatus =
//   | 'renewal_pending'
//   | 'docs_needed'
//   | 'in_progress'
//   | 'active';

// /** Which action button the row shows. */
// export type ExpiringAction = 'renew' | 'review' | 'monitor';

// export interface ExpiringVisa {
//   id:            string;
//   employee_id:   string;          // user/profile id (used to deep-link to the employee)
//   employee_name: string;
//   employee_code: string;          // display code, e.g. "EMP-0041"
//   avatar_url?:   string | null;
//   department?:   string;
//   visa_code:     string;          // "H-1B" | "O-1" | "L-1" | "TN" | "E-3" …
//   visa_label?:   string;          // "Work" | "Talent" | "Transfer" | "Status" | "Specialty"
//   expiry_date:   string;          // ISO date
//   days_left:     number;
//   urgency:       ExpiryUrgency;
//   status:        RenewalStatus;
//   action:        ExpiringAction;
// }

// // ── Stat cards ────────────────────────────────────────────────────────────────

// export interface DashboardStats {
//   total_employees:  number;
//   active_visas:     number;
//   expiring_soon:    number;
//   pending_renewals: number;
//   // Signed percentage deltas vs last quarter (optional — omit to hide the trend line).
//   total_employees_delta?:  number;
//   active_visas_delta?:     number;
//   expiring_soon_delta?:    number;
//   pending_renewals_delta?: number;
// }

// // ── Compliance score ────────────────────────────────────────────────────────

// export interface ComplianceScore {
//   score:              number;   // 0–100
//   label:              string;   // "Good Standing"
//   period?:            string;   // "JUN 2025"
//   needs_action_count: number;   // "47 employees need action…"
//   active_compliant:   number;
//   expiring_under_30:  number;
//   expiring_30_90:     number;
// }

// // ── Recent activity feed ──────────────────────────────────────────────────────

// export type ActivityType =
//   | 'visa_approved'
//   | 'expiry_alert'
//   | 'documents_uploaded'
//   | 'renewal_initiated'
//   | 'employee_added'
//   | 'interview_scheduled'
//   | 'application_rejected';

// export interface ActivityItem {
//   id:          string;
//   type:        ActivityType;
//   title:       string;   // "Visa Approved"
//   description: string;   // "Emma Clarke's H-1B petition approved by USCIS."
//   created_at:  string;   // ISO datetime
// }

// // ── Expiration timeline (stacked bars, next 6 months) ─────────────────────────

// export interface TimelineBucket {
//   month:    string;   // label, e.g. "Jul 2025"
//   critical: number;   // <30d
//   warning:  number;   // 30–60d
//   upcoming: number;   // 60–90d
// }

// // ── The single payload powering the whole dashboard ───────────────────────────

// export interface HRDashboardData {
//   stats:      DashboardStats;
//   compliance: ComplianceScore;
//   expiring:   ExpiringVisa[];   // top slice (full list lives on the Deadlines page)
//   activity:   ActivityItem[];   // top slice (full list lives on Notifications)
//   timeline:   TimelineBucket[];
// }


// src/types/hr/dashboard.types.ts
//
// Types for the HR Compliance Dashboard (/employer/dashboard).
// Everything the dashboard renders comes from a single HRDashboardData payload.

// ── Expiring visas ──────────────────────────────────────────────────────────

export type ExpiryUrgency = 'critical' | 'warning' | 'upcoming';
export type RenewalStatus = 'renewal_pending' | 'docs_needed' | 'in_progress' | 'active';
export type ExpiringAction = 'renew' | 'review' | 'monitor';

export interface ExpiringVisa {
  id:            string;
  employee_id:   string;
  employee_name: string;
  employee_code: string;
  avatar_url?:   string | null;
  department?:   string;
  visa_code:     string;
  visa_label?:   string;
  expiry_date:   string;
  days_left:     number;
  urgency:       ExpiryUrgency;
  status:        RenewalStatus;
  action:        ExpiringAction;
}

// ── Stat cards ──────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_employees:  number;
  active_visas:     number;
  expiring_soon:    number;
  pending_renewals: number;
  total_employees_delta?:  number;
  active_visas_delta?:     number;
  expiring_soon_delta?:    number;
  pending_renewals_delta?: number;
}

// ── Compliance score ────────────────────────────────────────────────────────

export interface ComplianceScore {
  score:              number;
  label:              string;
  period?:            string;
  needs_action_count: number;
  active_compliant:   number;
  expiring_under_30:  number;
  expiring_30_90:     number;
}

// ── Recent activity feed ────────────────────────────────────────────────────

export type ActivityType =
  | 'visa_approved'
  | 'expiry_alert'
  | 'documents_uploaded'
  | 'renewal_initiated'
  | 'employee_added'
  | 'interview_scheduled'
  | 'application_rejected';

export interface ActivityItem {
  id:          string;
  type:        ActivityType;
  title:       string;
  description: string;
  created_at:  string;
}

// ── Expiration timeline (stacked bars, next 6 months) ───────────────────────

export interface TimelineBucket {
  month:    string;
  critical: number;
  warning:  number;
  upcoming: number;
}

// ── Chart 3: Visa type distribution (donut) ─────────────────────────────────

export interface VisaDistribution {
  visa_code: string;      // "H-1B", "O-1", "L-1", etc.
  count:     number;
  percentage: number;     // pre-computed for tooltip display
}

// ── Chart 4: Cases by stage (horizontal bar) ────────────────────────────────

export interface CasesByStage {
  stage: string;          // "Document Collection", "Attorney Review", etc.
  count: number;
}

// ── Chart 5: Monthly case trend (line) ──────────────────────────────────────

export interface MonthlyTrend {
  month:    string;       // "Jan 2025", "Feb 2025"...
  filed:    number;
  approved: number;
  rejected: number;
}

// ── Chart 6: Compliance by department (horizontal bar) ──────────────────────

export interface DepartmentCompliance {
  department:      string;
  compliance_rate: number;  // 0–100
  total_employees: number;
}

// ── Chart 7: Processing time by visa type (grouped bar) ─────────────────────

export interface ProcessingTime {
  visa_code:      string;
  avg_days:       number;   // your company's average
  benchmark_days: number;   // industry average
}

// ── Chart 8: Document completion rate (progress bars) ───────────────────────

export interface DocumentCompletion {
  category:   string;     // "Passport & ID", "Employment", "Education", etc.
  completed:  number;
  total:      number;
  percentage: number;     // pre-computed
}

// ── The single payload powering the whole dashboard ─────────────────────────

export interface HRDashboardData {
  stats:      DashboardStats;
  compliance: ComplianceScore;
  expiring:   ExpiringVisa[];
  activity:   ActivityItem[];
  timeline:   TimelineBucket[];
  // Analytics charts
  visa_distribution:      VisaDistribution[];
  cases_by_stage:         CasesByStage[];
  monthly_trend:          MonthlyTrend[];
  department_compliance:  DepartmentCompliance[];
  processing_time:        ProcessingTime[];
  document_completion:    DocumentCompletion[];
}