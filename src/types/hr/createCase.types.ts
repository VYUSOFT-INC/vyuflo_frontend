// src/types/hr/createCase.types.ts
//
// Mirrors hr_case_schemas.py exactly.
// Single source of truth for HR case creation frontend.

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type HRCasePriority = 'standard' | 'urgent' | 'premium';

export type HRCaseStatus =
  | 'draft'
  | 'in_progress'
  | 'action_needed'
  | 'rfe_response'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type HRCaseStage =
  | 'profile_eligibility'
  | 'documentation'
  | 'lca_filing'
  | 'uscis_submission';

export type HRApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST BODIES  (what the frontend sends)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /hr/cases — mirrors HRCaseCreate schema */
export interface HRCaseCreateRequest {
  employee_link_id:  string;           // employer_employees.id  (UUID)
  visa_type_code:    string;           // "H-1B" | "L-1A" | etc.
  case_name:         string;           // min 3 chars
  case_description?: string;
  target_date?:      string;           // ISO date  "YYYY-MM-DD"
  priority:          HRCasePriority;
  internal_notes?:   string;
  attorney_user_id?: string;           // users.id of attorney
  sponsor_employer?: string;
}

/** PATCH /hr/cases/:id — mirrors HRCaseUpdate schema */
export interface HRCaseUpdateRequest {
  case_name?:            string;
  case_description?:     string;
  target_date?:          string;
  priority?:             HRCasePriority;
  internal_notes?:       string;
  attorney_user_id?:     string;
  sponsor_employer?:     string;
  has_action_required?:  boolean;
  action_required_note?: string;
}

/** PATCH /hr/cases/:id/status */
export interface HRCaseStatusUpdateRequest {
  status:         HRCaseStatus;
  current_stage?: HRCaseStage;
  note?:          string;
}

/** PATCH /hr/cases/:id/hr-approval */
export interface HRApprovalUpdateRequest {
  hr_approval_status: HRApprovalStatus;
  hr_notes?:          string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NESTED RESPONSE OBJECTS
// ─────────────────────────────────────────────────────────────────────────────

export interface VisaTypeBasic {
  id:   string;
  code: string;   // "H-1B"
  name: string;   // "H-1B Specialty Occupation"
}

export interface EmployeeBasic {
  user_id:             string;
  full_name:           string;
  email:               string;
  job_title:           string | null;
  department:          string | null;
  profile_picture_url: string | null;
}

export interface AttorneyBasic {
  user_id:       string;
  full_name:     string;
  email:         string;
  law_firm_name: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE SCHEMAS  (what the backend returns)
// ─────────────────────────────────────────────────────────────────────────────

/** Slim response from POST /hr/cases */
export interface HRCaseCreateResponse {
  id:                 string;
  application_number: string;
  message:            string;
  employee_name:      string;
  visa_type_code:     string;
}

/** Full case object from GET /hr/cases/:id and PATCH endpoints */
export interface HRCaseResponse {
  id:                   string;
  application_number:   string;
  status:               HRCaseStatus;
  current_stage:        HRCaseStage | null;
  progress_percent:     number;
  is_draft:             boolean;
  has_action_required:  boolean;
  action_required_note: string | null;

  start_date:      string | null;   // ISO date
  due_date:        string | null;   // = target_date set at creation
  submission_date: string | null;

  // HR-specific fields (decoded from application.notes JSON by backend)
  case_name:           string;
  case_description:    string | null;
  priority:            HRCasePriority;
  internal_notes:      string | null;
  sponsor_employer:    string | null;
  hr_approval_status:  HRApprovalStatus | null;
  hr_notes:            string | null;
  hr_approved_at:      string | null;

  assigned_hr_id:       string;
  assigned_attorney_id: string | null;

  // Nested objects
  visa_type: VisaTypeBasic | null;
  employee:  EmployeeBasic | null;
  attorney:  AttorneyBasic | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}

/** GET /hr/cases — list with KPI summary */
export interface HRCaseListResponse {
  items:         HRCaseResponse[];
  total:         number;
  total_active:  number;
  action_needed: number;
  approved_ytd:  number;
  expiring_soon: number;
}

/** Single history row from GET /hr/cases/:id/history */
export interface HRCaseHistoryItem {
  id:             string;
  application_id: string;
  stage:          HRCaseStage;
  status:         HRCaseStatus;
  note:           string | null;
  completed_at:   string | null;
  changed_by:     string;
  created_at:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM STATE  (local UI state, not sent to backend directly)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCaseForm {
  selected_employee_id: string | null;   // employer_employees.id  (link ID)
  visa_type_code:       string | null;   // "H-1B" — code, NOT uuid
  case_name:            string;
  case_description:     string;
  target_date:          string;           // ISO date string
  priority:             HRCasePriority;
  internal_notes:       string;
  attorney_id:          string | null;   // users.id of attorney
  sponsor_employer:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROSTER EMPLOYEE  (from GET /hr/employees — used in Step 1 picker)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeeOption {
  id:                  string;   // employer_employees.id  (link ID — this is what we send)
  user_id:             string;   // users.id  (NOT sent; backend resolves from link ID)
  full_name:           string;
  email:               string;
  job_title:           string | null;
  department:          string | null;
  profile_picture_url: string | null;
  active_cases:        number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTORNEY OPTION  (from GET /attorneys — used in Step 4 picker)
// ─────────────────────────────────────────────────────────────────────────────

export interface AttorneyOption {
  user_id:             string;
  full_name:           string;
  email:               string;
  profile_picture_url: string | null;
  law_firm_name:       string | null;
  specialisations:     string[];
  active_cases:        number;
  is_accepting:        boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP CONFIG  (used in stepper)
// ─────────────────────────────────────────────────────────────────────────────

export type CaseStep = 1 | 2 | 3 | 4 | 5;

export interface VisaTypeOption {
  code:           string;
  name:           string;
  description:    string;
  timeline:       string;
  doc_count:      number;
  category:       'work';
  icon_bg:        string;
  icon_color:     string;
  lca_required:   boolean;
  total_estimate: string;
  requirements:   Array<{ name: string; description: string }>;
}