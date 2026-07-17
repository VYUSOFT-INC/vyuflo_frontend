// src/types/lawyer/clients.types.ts
//
// Client Profile aggregated view — Screen 26.
//
// Aggregated from:
//   • GET /lawyer/applications      (assigned application — case/email/visa)
//   • GET /users/{user_id}/profile  (personal info)
//
// Only fields that exist in those responses are populated.
// Fields marked "Phase 2" stay null for now and will be filled when
// backend extends with OCR + sponsor_employer data.

export interface ActiveCaseSnapshot {
  case_id:          string;
  case_number:      string;
  visa_type_name:   string | null;
  status:           string;
  progress_percent: number;
  current_stage:    string | null;
  due_date:         string | null;
}

export interface ClientProfileResponse {
  /* ── Identity (from /users/{id}/profile + assigned app) ──────────── */
  client_id:            string;
  full_name:            string;
  initials:             string;
  profile_picture_url:  string | null;

  /* ── Contact (assigned app + profile) ────────────────────────────── */
  email:                string | null;     // from assigned application
  phone:                string | null;     // country_code + phone_number formatted

  /* ── Personal Info (from profile) ────────────────────────────────── */
  nationality:          string | null;
  country_of_residence: string | null;
  date_of_birth:        string | null;
  gender:               string | null;

  /* ── Preferences (from profile) ──────────────────────────────────── */
  timezone:             string | null;
  preferred_language:   string | null;

  /* ── Onboarding state (from profile) ─────────────────────────────── */
  onboarding_step:      number | null;
  onboarding_completed: boolean | null;

  /* ── Timestamps (from profile) ───────────────────────────────────── */
  client_since:         string | null;     // profile.created_at
  updated_at:           string | null;

  /* ── Case context (from assigned application) ────────────────────── */
  current_visa_status:  string | null;
  total_cases:          number;
  active_cases:         number;
  active_case:          ActiveCaseSnapshot | null;
}