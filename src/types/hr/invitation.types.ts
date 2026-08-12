// src/types/hr/invitation.types.ts

// ── Request types ─────────────────────────────────────────────────────────────

export interface InviteByEmailRequest {
  email:            string;
  // Optional — when set, the employee must correctly re-enter this exact
  // passport number before their acceptance is allowed to go through.
  // Only a hash is ever stored server-side.
  passport_number?: string;
  personal_message?: string;
  expires_days?:    number;  // default 7
}

export interface InviteByCodeRequest {
  max_uses?:         number;  // null = unlimited
  personal_message?: string;
}

export interface AcceptInviteRequest {
  invite_token?:    string;
  invite_code?:     string;
  // Required only when ValidateTokenResponse.requires_passport_verification
  // was true. Never pre-filled — the employee must type it themselves.
  passport_number?: string;
}

export interface UpdateEmployeeRequest {
  job_title?:  string;
  department?: string;
  work_email?: string;
  start_date?: string;  // YYYY-MM-DD
  is_active?:  boolean;
}

// ── Response types ────────────────────────────────────────────────────────────

export type InviteMethod = "email" | "code";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface InvitationResponse {
  id:               string;
  invite_method:    InviteMethod;
  status:           InviteStatus;
  invited_email?:   string;
  invite_code?:     string;
  invite_token?:    string;
  max_uses?:        number;
  used_count:       number;
  expires_at?:      string;
  personal_message?: string;
  created_at:       string;
}

export interface ValidateTokenResponse {
  valid:         boolean;
  company_name?: string;
  hr_name?:      string;
  invite_method?: InviteMethod;
  message:       string;
  // True → the accept screen must show a blank passport number field and
  // block acceptance until it's correctly filled in.
  requires_passport_verification?: boolean;
}

export interface AcceptInviteResponse {
  message:               string;
  company_name:          string;
  employer_id:           string;
  // True when the account used to accept this invite has no login path
  // independent of the org's invited email — the frontend should prompt
  // for a personal/backup email right after acceptance so the person
  // doesn't lose access if the employer later removes them.
  needs_personal_email:  boolean;
}

export interface EmployeeResponse {
  id:                  string;
  employee_id:         string;
  full_name:           string;
  email:               string;
  profile_picture_url?: string;
  job_title?:          string;
  department?:         string;
  work_email?:         string;
  start_date?:         string;
  is_active:           boolean;
  access_revoked_at?:  string;
  active_applications: number;
  pending_documents:   number;
  linked_at:           string;
}

export interface InvitationListResponse {
  items: InvitationResponse[];
  total: number;
}

export interface EmployeeListResponse {
  items: EmployeeResponse[];
  total: number;
}