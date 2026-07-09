// src/types/lawyer/lawyerProfile.types.ts
//
// Profile & Settings module — Figma node 97:612 (Screen 13).
// Backed by:
//   GET    /api/v1/users/me/profile           → aggregated read
//   PATCH  /api/v1/users/me/profile           → first_name/last_name/timezone/preferred_language
//   PATCH  /api/v1/users/me/attorney-profile  → bar_number/bar_state/law_firm_name/bio/billing_target
//   PATCH  /api/v1/users/me/avatar            → multipart upload
//   DELETE /api/v1/users/me/avatar            → unset profile_picture_url

/* ─── Aggregated profile (GET response) ─────────────────────────────── */

/**
 * NOTE — backend currently returns a subset of what Swagger documented.
 * The real payload looks like:
 *   {
 *     id, user_id, full_legal_name, profile_picture_url,
 *     timezone, preferred_language, onboarding_step, ...
 *   }
 * The Swagger-documented fields (first_name, last_name, email, bar_*,
 * role) are NOT in the response yet. We mark every field optional so
 * either shape parses cleanly; the page derives missing pieces (e.g.
 * splits full_legal_name into first/last for display, pulls email from
 * the ui_session cookie). Once backend aggregates the documented fields,
 * the page picks them up automatically — no type change required.
 */
export interface MyProfile {
  id?:                          string;
  /** Linked auth user id — populated by current backend. */
  user_id?:                     string;
  /** Single-string name as backend stores it today. */
  full_legal_name?:             string | null;
  /** Promised by Swagger; not present in current response. */
  first_name?:                  string | null;
  last_name?:                   string | null;
  email?:                       string | null;
  /** May be null after avatar removal or before upload. */
  profile_picture_url?:         string | null;
  timezone?:                    string | null;
  preferred_language?:          string | null;
  /** Attorney-only fields — backend does NOT return these on GET yet. */
  bar_number?:                  string | null;
  bar_state?:                   string | null;
  law_firm_name?:               string | null;
  monthly_billing_target_cents?: number | null;
  bio?:                         string | null;
  /** Pretty role label e.g. "attorney"; falls back to ui_session cookie. */
  role?:                        string;
  /** Pass-through for any other server fields we don't model yet. */
  [key: string]: unknown;
}

/* ─── Update payloads ────────────────────────────────────────────────── */

/** PATCH /users/me/profile — all fields optional, only sent fields are written. */
export interface ProfileUpdate {
  first_name?:         string;
  last_name?:          string;
  timezone?:           string;
  preferred_language?: string;
}

/** PATCH /users/me/attorney-profile — creates row automatically if missing. */
export interface AttorneyProfileUpdate {
  bar_number?:                  string;
  bar_state?:                   string;
  law_firm_name?:               string;
  bio?:                         string;
  monthly_billing_target_cents?: number;
}

/* ─── Avatar response (upload + delete share this shape) ────────────── */

export interface AvatarResponse {
  profile_picture_url: string | null;
  message:             string;
}

/* ─── UI helpers ─────────────────────────────────────────────────────── */

/** Tab identifier — URL-driven via ?tab=. */
export type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'ai_extraction'
  | 'security'
  | 'appearance';