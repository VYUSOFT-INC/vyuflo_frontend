// src/types/lawyer/analytics.types.ts
//
// Lawyer Analytics — Screen 23.
// Matches backend Swagger paths:
//   GET /api/v1/analytics/kpi-cards
//   GET /api/v1/analytics/case-status
//   GET /api/v1/analytics/cases-by-visa
//   GET /api/v1/analytics/caseload-over-time
//   GET /api/v1/analytics/upcoming-actions

/* ── Period filter ──────────────────────────────────────────────────── */
export type AnalyticsPeriod = 'this_month' | 'q1_2026' | 'last_12_months' | 'custom';

export interface AnalyticsFilters {
  period:     AnalyticsPeriod;
  date_from?: string;          // required when period=custom (YYYY-MM-DD)
  date_to?:   string;          // required when period=custom
}

/* ── KPI cards (top 5 tiles) ────────────────────────────────────────── */
export interface KpiCardsResponse {
  active_cases:          number;
  new_clients_month:     number;
  avg_case_duration_days: number;
  pending_actions:       number;
  monthly_revenue:       number;
}

/* ── Case Status Breakdown (donut chart) ────────────────────────────── */
export interface CaseStatusItem {
  status:     string;     // raw code, e.g. "in_progress"
  label:      string;     // display name, e.g. "In Progress"
  count:      number;
  percentage: number;     // 0..100
  color_hex:  string;     // chart slice colour
}

export interface CaseStatusResponse {
  items: CaseStatusItem[];
  total: number;
}

/* ── Cases by Visa Type ─────────────────────────────────────────────── */
export interface CasesByVisaItem {
  visa_type_id: string;
  visa_code:    string;        // e.g. "H1B"
  visa_name:    string;        // e.g. "H-1B Specialty Occupation"
  count:        number;
  percentage:   number;
  color_hex:    string;
}

export interface CasesByVisaResponse {
  items: CasesByVisaItem[];
  total: number;
}

/* ── Caseload Over Time + Success Rate ──────────────────────────────── */
export interface MonthlyCaseload {
  month:         string;        // YYYY-MM
  label:         string;        // "Jan", "Feb"
  active_cases:  number;
}

export interface CaseloadOverTimeResponse {
  months:               MonthlyCaseload[];
  case_success_rate:    number;   // 0..100 (this attorney)
  industry_avg_rate:    number;   // 0..100 (hardcoded 79 for V1)
}

/* ── Upcoming Actions Required ──────────────────────────────────────── */
export type ActionPriority = 'high' | 'medium' | 'low';

export interface UpcomingAction {
  task_id:        string;
  application_id: string;
  client_user_id: string;
  client_name:    string;
  client_avatar:  string | null;   // URL or null
  case_number:    string;          // e.g. "#H1B-2026-041"
  visa_code:      string;          // e.g. "H1B"
  action_title:   string;
  due_date:       string;          // YYYY-MM-DD
  is_overdue:     boolean;
  priority:       ActionPriority;
}

export interface UpcomingActionsResponse {
  items:  UpcomingAction[];
  total:  number;
  limit:  number;
  offset: number;
}

/* ── UI helpers ─────────────────────────────────────────────────────── */
export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  this_month:     'This Month',
  q1_2026:        'Q1 2026',
  last_12_months: 'Last 12 Months',
  custom:         'Custom',
};

export const PRIORITY_CONFIG: Record<ActionPriority, { label: string; bg: string; text: string }> = {
  high:   { label: 'High',   bg: 'bg-red-50',    text: 'text-red-700'    },
  medium: { label: 'Medium', bg: 'bg-amber-50',  text: 'text-amber-700'  },
  low:    { label: 'Low',    bg: 'bg-emerald-50', text: 'text-emerald-700' },
};