// src/types/hr/employees.types.ts
//
// Types for the HR Employee Roster (/employer/employees).
// Matches the dict shape returned by get_my_employees() in invitation_service.py.

// ── A single employee link row (from GET /employer/employees) ─────────────────

export interface EmployeeLink {
  id:                  string;   // employer_employees.id (UUID — used for PATCH / DELETE)
  employee_id:         string;   // the employee's user_id
  full_name:           string;   // from user_profiles.full_legal_name or user first+last
  email:               string;
  profile_picture_url: string | null;

  job_title:           string | null;
  department:          string | null;
  work_email:          string | null;
  start_date:          string | null;   // ISO date string or null

  is_active:           boolean;
  active_applications: number;
  pending_documents:   number;
  linked_at:           string;   // ISO datetime
}

// ── Backend response ──────────────────────────────────────────────────────────

export interface EmployeeListResponse {
  items: EmployeeLink[];
  total: number;
}

// ── Query params for GET /employer/employees ──────────────────────────────────

export interface EmployeeListQuery {
  is_active?: boolean;
  limit?:     number;
  offset?:    number;
}

// ── PATCH /employer/employees/:id body ────────────────────────────────────────

export interface UpdateEmployeeRequest {
  job_title?:   string;
  department?:  string;
  work_email?:  string;
}

// ── Stat cards (derived client-side from the items) ───────────────────────────

export interface RosterStats {
  total_employees:     number;
  active_applications: number;
  pending_documents:   number;
  inactive:            number;
}

// ── Filter dropdown options (derived client-side) ─────────────────────────────

export interface RosterFilterOptions {
  departments: string[];
}

// ── Pagination (client-side from total + limit/offset) ────────────────────────

export interface Pagination {
  page:        number;
  page_size:   number;
  total:       number;
  total_pages: number;
}