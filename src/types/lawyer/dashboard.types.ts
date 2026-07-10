// src/types/lawyer/dashboard.types.ts
//
// Matches Swagger schemas for:
//   GET /api/v1/lawyer-dashboard             — full aggregated payload
//   GET /api/v1/lawyer-dashboard/kpi-cards   — KPI-only (60s polling)
//   GET /api/v1/lawyer-dashboard/recent-cases — paginated recent cases
//
// Today's Schedule + Critical Deadlines live on the calendar endpoints:
//   GET /api/v1/calendar/agenda      → Today's Schedule
//   GET /api/v1/calendar/deadlines   → Critical Deadlines sidebar
// Those return arrays of the two AgendaItem / DeadlineItem shapes below.

/* ── 4 stat tiles on the top row ─────────────────────────────────────── */
export interface KpiCards {
  active_cases:            number;
  active_cases_delta_week: number;   // +N this week
  unbilled_hours:          number;
  unbilled_amount_cents:   number;   // display as $USD
  deadlines_today:         number;
  requires_action:         boolean;  // shows the red "requires immediate action" chip
  new_client_intakes:      number;
  pending_review:          number;   // "pending review" caption on New Intakes tile
}

/* ── One row in the Recent Cases table ───────────────────────────────── */
export interface RecentCaseItem {
  application_id:     string;
  application_number: string;
  client_name:        string;
  client_avatar_url:  string | null;
  visa_type_code:     string;         // "H-1B" / "O-1A" etc.
  status:             string;         // machine key: "in_progress" | "action_required" | ...
  status_label:       string;         // human label: "In Progress" / "Action Required"
  next_action:        string;         // "Submit LCA" / "Review RFE Response"
  updated_at:         string;         // ISO
}

export interface RecentCasesResponse {
  items: RecentCaseItem[];
  total: number;
}

/* ── Monthly billing panel on the right column ───────────────────────── */
export interface MonthlyBilling {
  monthly_billed_cents: number;
  mom_change_pct:       number;   // percent change vs. last month
  mom_positive:         boolean;  // arrow direction / green vs. red
  target_cents:         number;
  target_pct:           number;   // 0-100 progress bar
  billed_hours:         number;
  unbilled_hours:       number;
}

/* ── Full aggregated dashboard payload ───────────────────────────────── */
export interface LawyerDashboardResponse {
  attorney_first_name: string;
  attorney_role:       string;
  greeting_date:       string;      // YYYY-MM-DD
  kpi_cards:           KpiCards;
  recent_cases:        RecentCasesResponse;
  monthly_billing:     MonthlyBilling;
}

/* ── Today's Schedule — one calendar item ────────────────────────────── */
export interface AgendaItem {
  id:              string;
  start_time:      string;             // HH:MM (24h) or ISO
  end_time?:       string | null;
  title:           string;
  description?:    string | null;
  location?:       string | null;      // "Conference Room A", "Zoom", etc.
  event_type?:     string | null;      // "consultation" | "hearing" | "review" | "internal"
  accent_color?:   string | null;      // optional per-event highlight
}

/* ── Critical Deadlines — one deadline item ──────────────────────────── */
export interface DeadlineItem {
  id:              string;
  title:           string;             // "RFE Response: Rodriguez"
  subtitle?:       string | null;      // "O-1A Visa Application"
  due_date:        string;             // ISO or YYYY-MM-DD
  days_left:       number;             // negative if overdue, 0 if today
  urgency:         'today' | 'overdue' | 'critical' | 'soon' | 'normal' | string;
  case_id?:        string | null;
  application_id?: string | null;
}