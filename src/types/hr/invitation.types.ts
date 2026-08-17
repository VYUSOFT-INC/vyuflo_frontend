// src/types/hr/invitation.types.ts

// ── Request types ─────────────────────────────────────────────────────────────

export interface InviteByEmailRequest {
  email:            string;
  passport_number:  string;
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
  passport_number?: string;
}

// NEW — public, no existing account. Creates the account, links it to the
// employer, and logs the person in, all in one call.
export interface AcceptInviteNewUserRequest {
  invite_token?:    string;
  invite_code?:     string;
  first_name:       string;
  last_name:        string;
  email:            string;
  other_email?:     string;
  password:         string;
  passport_number?: string;
  terms_accepted:   boolean;
}

// NEW — public, step 1 of merge flow. Sends a one-time code to the
// matched account's email.
export interface RequestMergeOtpRequest {
  invite_token?: string;
  invite_code?:  string;
  login_email:   string;
}

// NEW — public, step 2 of merge flow. Confirms the code and links the
// invite to the matched existing account.
export interface AcceptInviteExistingUserRequest {
  invite_token?:    string;
  invite_code?:     string;
  login_email:      string;
  otp_code:         string;
  other_email?:     string;
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
  // The email the invite was sent to — used to prefill the signup/merge forms.
  invited_email?: string;
  // True → the accept screen must show a blank passport number field.
  requires_passport_verification?: boolean;
  // True → show the "log in with existing account" merge flow.
  // False → show the "create a new account" flow.
  account_exists?: boolean;
}

export interface AcceptInviteResponse {
  message:               string;
  company_name:          string;
  employer_id:           string;
  needs_personal_email:  boolean;
}

export interface EmployerDomainResponse {
  domain: string | null;
}

// NEW — returned by both /hr/accept/new-user and /hr/accept/existing-user.
// Mirrors the shape of a normal login response, since both endpoints log
// the person straight in.
export interface AcceptInviteAuthResponse {
  access_token:  string;
  refresh_token: string;
  roles:         string[];
  company_name:  string;
  employer_id:   string;
  linked_email?: string;
  // True → primary email matches the employer's domain and no second
  // verified email is on file — show the "add a personal email" prompt
  // even if the optional field was skipped during signup/merge.
  needs_personal_email?: boolean;
  message:       string;
}

export interface RequestMergeOtpResponse {
  message: string;
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