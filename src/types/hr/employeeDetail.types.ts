// src/types/hr/employeeDetail.types.ts
//
// Types for HR Employee Profile Detail screen (Screen 21).
// Route: /employer/employees/:employeeId
// All data comes from a single GET /hr/employees/:employee_link_id/detail endpoint.

// ── Case / Application ────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'draft'
  | 'in_progress'
  | 'action_needed'
  | 'rfe_response'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export interface ApplicationSummary {
  id:                 string;
  application_number: string;
  visa_type_code:     string;   // "H-1B", "L-1A", etc.
  visa_type_name:     string;   // "H-1B Extension", "L-1A Transfer"
  status:             ApplicationStatus;
  current_stage:      string | null;
  progress_percent:   number;
  start_date:         string | null;
  due_date:           string | null;
  next_milestone:     string | null;
  assigned_attorney_name: string | null;
  assigned_attorney_avatar: string | null;
}

// ── Document ──────────────────────────────────────────────────────────────────

export type DocumentStatus = 'verified' | 'pending_review' | 'missing' | 'rejected' | 'uploaded';

export interface DocumentSummary {
  id:          string;
  name:        string;
  status:      DocumentStatus;
  updated_at:  string;
  file_format: string | null;
}

// ── Activity ──────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id:         string;
  title:      string;
  actor:      string;
  occurred_at: string;
  dot_color:  'green' | 'blue' | 'orange' | 'gray';
}

// ── Stats cards ───────────────────────────────────────────────────────────────

export interface EmployeeDetailStats {
  active_cases:     number;
  total_cases:      number;
  documents_total:  number;
  documents_verified: number;
  next_deadline_days: number | null;   // null = no upcoming deadline
}

// ── Employee info ─────────────────────────────────────────────────────────────

export interface EmployeeDetailProfile {
  // Identity
  employee_link_id:    string;   // employer_employees.id
  user_id:             string;
  full_name:           string;
  email:               string;
  profile_picture_url: string | null;

  // Job info (editable by HR)
  job_title:           string | null;
  department:          string | null;
  work_email:          string | null;
  start_date:          string | null;

  // Company context
  company_name:        string | null;
  company_location:    string | null;   // city / state from employer profile

  // Visa info (from most recent application)
  visa_code:           string | null;   // "H-1B"
  visa_status_label:   string | null;   // "H-1A Active" pill label

  // Employment link meta
  linked_at:           string;
  is_active:           boolean;
}

// ── Full page payload ─────────────────────────────────────────────────────────

export interface EmployeeDetailData {
  profile:      EmployeeDetailProfile;
  stats:        EmployeeDetailStats;
  active_case:  ApplicationSummary | null;   // the primary in-progress case
  all_cases:    ApplicationSummary[];        // historical list
  documents:    DocumentSummary[];
  activity:     ActivityItem[];
}