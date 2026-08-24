// src/types/lawyer/intake.types.ts
//
// All types for Client Intake (Lawyer flow — Phase 2 review-only).
// Matches Swagger: /api/v1/intake/* + /api/v1/users/{user_id}/profile +
// /api/v1/documents/* (for OCR-driven employment + visa data)

/* ── Dropdown options ───────────────────────────────────────────────── */
export interface VisaStatusOption {
  value: string;   // e.g. "F1"
  label: string;   // e.g. "F-1 Student"
}

export interface VisaStatusOptionsResponse {
  items: VisaStatusOption[];
}

/* ── Previous visa entry ────────────────────────────────────────────── */
export interface PreviousVisa {
  visa_type:       string;
  visa_number:     string;
  issue_date:      string;
  expiry_date:     string;
  issuing_country: string;
}

/* ── Intake data (IntakeImmigrationHistory row) ─────────────────────── */
export interface IntakeData {
  id?:                  string;
  intake_session_id?:   string;

  // Step 1 — Personal Info
  first_name:           string;
  last_name:            string;
  date_of_birth:        string;
  gender:               string;
  nationality:          string;
  passport_number:      string;
  passport_expiry_date: string;
  email:                string;

  // Step 3 — Immigration
  current_visa_status:  string;
  visa_expiration_date: string;
  has_visa_denial:      boolean;
  visa_denial_details:  string;
  has_overstay:         boolean;
  previous_visas:       PreviousVisa[];

  // Step 3 — Overstay details (Phase 2 — backend just added)
  overstay_days?:       number | null;
  overstay_period?:     string | null;

  // Step 3 — Disclosure audit trail (Phase 2 — backend just added)
  disclosures_acknowledged_at?:         string | null;
  disclosures_verified_by_attorney_id?: string | null;
  disclosures_verified_at?:             string | null;

  created_at?:          string;
  updated_at?:          string;
}

/* ── Session ────────────────────────────────────────────────────────── */
export interface IntakeSession {
  id:                 string;
  application_id:     string;
  token:              string | null;
  token_expires_at:   string | null;
  current_step:       number;
  step_1_completed:   boolean;
  step_2_completed:   boolean;
  step_3_completed:   boolean;
  step_4_completed:   boolean;
  step_5_completed:   boolean;
  is_draft:           boolean;
  last_saved_at:      string | null;
  is_submitted:       boolean;
  submitted_at:       string | null;
  created_at:         string;
  updated_at:         string;
  intake_data:        IntakeData | null;
}

/* ── Create session payload + response ──────────────────────────────── */
export interface CreateSessionPayload {
  application_id: string;
  generate_link?: boolean;
}

export interface GenerateLinkResponse {
  token:            string;
  client_url:       string;
  token_expires_at: string;
}

/* ── Responses ──────────────────────────────────────────────────────── */
export interface SaveDraftResponse {
  detail:        string;
  last_saved_at: string;
  current_step:  number;
}

export interface SubmitResponse {
  detail:       string;
  submitted_at: string;
  session_id:   string;
}

/* ── PUT /data params + payload ────────────────────────────────────── */
export type StepNumber = 1 | 2 | 3 | 4 | 5;

export interface SaveIntakeDataParams {
  step_completed?: StepNumber;
}

export type SaveIntakeDataPayload = Partial<IntakeData>;

/* ── Disclosure verification payload (Step 3 lawyer action) ─────────── */
export interface VerifyDisclosuresPayload {
  disclosures_verified_at?:             string;
  disclosures_verified_by_attorney_id?: string;
}

/* ── Lawyer's assigned-applications worklist ────────────────────────── */
export type IntakeStatus = 'pending_intake' | 'intake_in_progress' | 'intake_completed';

export interface AssignedApplication {
  application_id:    string;
  client_id?:        string;
  user_id?:          string;
  client_name:       string;
  client_email:      string;
  visa_type:         string | null;
  visa_type_label:   string | null;
  status:            IntakeStatus;
  intake_session_id: string | null;
  intake_step:       number | null;
  assigned_at:       string;
  hr_reviewed_by:    string | null;
}

/* ════════════════════════════════════════════════════════════════════
 *  Phase 2 — Read-only review aggregated data
 * ════════════════════════════════════════════════════════════════════ */

/* ── Employment data (from Employment Letter OCR or null) ───────────── */
export interface EmploymentReviewData {
  has_letter:       boolean;
  letter_doc_id:    string | null;
  company_name:     string | null;
  job_title:        string | null;
  start_date:       string | null;
  annual_salary:    string | null;
  is_student:       boolean;   // inferred from visa_type (F1/F2)
  source:           'ocr' | 'manual' | 'none';
}

/* ── Immigration data (intake_data + visa stamp OCR) ────────────────── */
export interface ImmigrationReviewData {
  current_visa_status:   string | null;
  visa_expiration_date:  string | null;
  has_visa_denial:       boolean;
  visa_denial_details:   string | null;
  has_overstay:          boolean;
  overstay_days:         number | null;
  overstay_period:       string | null;
  previous_visas:        PreviousVisa[];

  // Verification audit (for "Mark as Verified" button state)
  disclosures_verified_at:             string | null;
  disclosures_verified_by_attorney_id: string | null;
}

/* ── Personal info (from profile OR intake_data) ────────────────────── */
export interface PersonalReviewData {
  full_name:            string;
  first_name:           string;
  last_name:            string;
  date_of_birth:        string | null;
  gender:               string | null;
  nationality:          string | null;
  passport_number:      string | null;
  passport_expiry_date: string | null;
  email:                string;
  phone:                string | null;
  source:               'profile' | 'intake' | 'app';   // where data came from
}

/* ── Case context (from application) ────────────────────────────────── */
export interface CaseReviewData {
  application_id: string;
  visa_type:      string | null;
  visa_type_label: string | null;
  client_name:    string;
  client_email:   string;
  status:         IntakeStatus | null;
}

/* ── Aggregated review payload returned by useIntakeReview hook ─────── */
export interface IntakeReviewData {
  session:     IntakeSession;
  personal:    PersonalReviewData;
  employment:  EmploymentReviewData;
  immigration: ImmigrationReviewData;
  case_info:   CaseReviewData;
}

/* ── Empty-state helper ─────────────────────────────────────────────── */
export const EMPTY_INTAKE_DATA: IntakeData = {
  first_name:           '',
  last_name:            '',
  date_of_birth:        '',
  gender:               '',
  nationality:          '',
  passport_number:      '',
  passport_expiry_date: '',
  email:                '',
  current_visa_status:  '',
  visa_expiration_date: '',
  has_visa_denial:      false,
  visa_denial_details:  '',
  has_overstay:         false,
  previous_visas:       [],
};

export const EMPTY_PREVIOUS_VISA: PreviousVisa = {
  visa_type:       '',
  visa_number:     '',
  issue_date:      '',
  expiry_date:     '',
  issuing_country: '',
};