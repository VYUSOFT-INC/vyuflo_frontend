// src/types/employee/i9.types.ts
//
// Types for USCIS Form I-9 — Employment Eligibility Verification.
// This iteration covers ONLY employee-fillable fields (Section 1 + the
// employee signature). Section 2 (employer), Supplement A (preparer),
// Supplement B (reverification) are intentionally out of scope here —
// those are filled by the employer/attorney later.

/** Citizenship / immigration status choice on Section 1. Backend expects
 *  the raw digit string "1"…"4" to match the USCIS field numbering. */
export type CitizenshipStatus = '1' | '2' | '3' | '4';

export const CITIZENSHIP_LABEL: Record<CitizenshipStatus, string> = {
  '1': 'A citizen of the United States',
  '2': 'A noncitizen national of the United States',
  '3': 'A lawful permanent resident',
  '4': 'An alien authorized to work',
};

/** Only required when citizenship_status === '4'. USCIS requires ONE of
 *  three identifiers — enforced client-side via oneOfKey. */
export type AuthorizedAlienKey =
  | 'uscis_a_number'
  | 'i94_admission_number'
  | 'foreign_passport';

export interface I9FormData {
  // ── Personal ──────────────────────────────────────────────────────────
  last_name:            string;
  first_name:           string;
  middle_initial:       string;
  other_last_names:     string;

  // ── Address ───────────────────────────────────────────────────────────
  address:              string;
  apt_number:           string;
  city:                 string;
  state:                string;   // 2-letter US state
  zip_code:             string;   // 5 or 9 digits

  // ── Contact ───────────────────────────────────────────────────────────
  date_of_birth:        string;   // ISO YYYY-MM-DD
  ssn:                  string;   // XXX-XX-XXXX (raw digits also OK)
  email:                string;
  phone:                string;

  // ── Attestation ───────────────────────────────────────────────────────
  citizenship_status:   CitizenshipStatus | null;

  // (3) Lawful permanent resident — one field:
  lpr_uscis_a_number:   string;   // A-Number

  // (4) Alien authorized to work — expiration + ONE identifier:
  work_authorized_until: string;  // ISO YYYY-MM-DD

  auth_key:             AuthorizedAlienKey | null;
  auth_uscis_a_number:  string;   // used when auth_key = 'uscis_a_number'
  auth_i94_number:      string;   // used when auth_key = 'i94_admission_number'
  auth_passport_number: string;   // used when auth_key = 'foreign_passport'
  auth_passport_country: string;  // used when auth_key = 'foreign_passport'

  // ── Signature ─────────────────────────────────────────────────────────
  signature_typed_name: string;   // "typed name" e-signature
  signature_date:       string;   // ISO YYYY-MM-DD (auto-filled to today on submit)

  // ══════════════════════════════════════════════════════════════════
  // Section 2 — Employer Review and Verification (filled by HR/attorney)
  // Employee-side pages ignore these; HR-side split editor renders them.
  // ══════════════════════════════════════════════════════════════════

  // List A OR (List B + List C)
  s2_list_a_title:               string;
  s2_list_a_issuing_authority:   string;
  s2_list_a_document_number:     string;
  s2_list_a_expiration:          string;   // ISO YYYY-MM-DD

  s2_list_b_title:               string;
  s2_list_b_issuing_authority:   string;
  s2_list_b_document_number:     string;
  s2_list_b_expiration:          string;

  s2_list_c_title:               string;
  s2_list_c_issuing_authority:   string;
  s2_list_c_document_number:     string;
  s2_list_c_expiration:          string;

  s2_additional_information:     string;

  // Employer attestation
  s2_first_day_of_employment:    string;   // ISO YYYY-MM-DD
  s2_employer_signature_name:    string;   // typed rep name
  s2_employer_signature_date:    string;   // ISO
  s2_employer_business_name:     string;
  s2_employer_business_address:  string;
}

/** All-empty starting state. Used on new-form open and after Reset. */
export const EMPTY_I9: I9FormData = {
  last_name: '', first_name: '', middle_initial: '', other_last_names: '',
  address: '', apt_number: '', city: '', state: '', zip_code: '',
  date_of_birth: '', ssn: '', email: '', phone: '',
  citizenship_status:    null,
  lpr_uscis_a_number:    '',
  work_authorized_until: '',
  auth_key:              null,
  auth_uscis_a_number:   '',
  auth_i94_number:       '',
  auth_passport_number:  '',
  auth_passport_country: '',
  signature_typed_name:  '',
  signature_date:        '',
  // Section 2 (employer) — empty defaults
  s2_list_a_title: '', s2_list_a_issuing_authority: '', s2_list_a_document_number: '', s2_list_a_expiration: '',
  s2_list_b_title: '', s2_list_b_issuing_authority: '', s2_list_b_document_number: '', s2_list_b_expiration: '',
  s2_list_c_title: '', s2_list_c_issuing_authority: '', s2_list_c_document_number: '', s2_list_c_expiration: '',
  s2_additional_information: '',
  s2_first_day_of_employment: '', s2_employer_signature_name: '', s2_employer_signature_date: '',
  s2_employer_business_name: '', s2_employer_business_address: '',
};

/** Persistence envelope. Backend stores JSON; frontend uses same shape
 *  in localStorage while drafting. */
/** Backend `status` enum on I-9 form records — one field, six values.
 *
 *  | value               | meaning                                                    |
 *  |---------------------|------------------------------------------------------------|
 *  | draft               | still being filled                                         |
 *  | submitted           | employee has submitted Section 1 (HR still to fill)         |
 *  | hr_approved         | HR submitted Section 2 (attorney to review)                 |
 *  | needs_corrections   | attorney sent back                                          |
 *  | approved            | attorney signed off                                         |
 *  | completed           | case closed post-approval                                   |
 *
 *  Per-role labels live in `<FormStatusBadge role="…" />` — same status
 *  renders as "In Review" for HR but "Waiting on HR" for the attorney. */
export type FormReviewStatus =
  | 'draft'
  | 'submitted'
  | 'hr_approved'
  | 'needs_corrections'
  | 'approved'
  | 'completed';

/** One open correction request from the attorney, targeted at either party. */
export interface FormCorrection {
  id:            string;
  target:        'employee' | 'hr';
  fields:        string[];       // e.g. ['last_name', 's2_list_a_title']
  note:          string;
  requested_by:  string;         // attorney user id
  requested_by_name?: string;
  created_at:    string;
  resolved_at?:  string | null;
}

export interface I9FormRecord {
  id:              string;    // server UUID (or "draft-<sessionId>" for local)
  application_id:  string;    // which case this form belongs to
  employee_id:     string;
  status:          'draft' | 'submitted';
  /** Lawyer decision — independent of the fill status. Defaults to 'draft'. */
  review_status?:  FormReviewStatus;
  /** Open (unresolved) correction requests from the attorney. */
  open_corrections?: FormCorrection[];
  data:            I9FormData;
  created_at:      string;
  updated_at:      string;
  submitted_at?:   string | null;
}

// ── Validation helpers ────────────────────────────────────────────────

/** Fields required on every I-9 Section 1 regardless of citizenship.
 *  Defensively coerces missing fields to '' so a stale localStorage draft
 *  from an older schema (e.g. missing `auth_key`) never crashes the render. */
export function isBaseSectionComplete(f: I9FormData): boolean {
  if (!f) return false;
  return Boolean(
    (f.last_name  ?? '').trim() &&
    (f.first_name ?? '').trim() &&
    (f.address    ?? '').trim() &&
    (f.city       ?? '').trim() &&
    (f.state      ?? '').trim() &&
    (f.zip_code   ?? '').trim() &&
    f.date_of_birth &&
    (f.email      ?? '').trim(),
  );
}

/** Citizenship attestation is complete — depends on which of 1–4 chosen. */
export function isAttestationComplete(f: I9FormData): boolean {
  if (!f || !f.citizenship_status) return false;

  if (f.citizenship_status === '1' || f.citizenship_status === '2') return true;

  if (f.citizenship_status === '3') {
    return (f.lpr_uscis_a_number ?? '').trim().length > 0;
  }

  if (f.citizenship_status === '4') {
    if (!f.work_authorized_until) return false;
    if (!f.auth_key) return false;
    if (f.auth_key === 'uscis_a_number')       return (f.auth_uscis_a_number ?? '').trim().length > 0;
    if (f.auth_key === 'i94_admission_number') return (f.auth_i94_number ?? '').trim().length > 0;
    if (f.auth_key === 'foreign_passport') {
      return (f.auth_passport_number  ?? '').trim().length > 0
          && (f.auth_passport_country ?? '').trim().length > 0;
    }
  }
  return false;
}

export function isSignatureComplete(f: I9FormData): boolean {
  return !!f && (f.signature_typed_name ?? '').trim().length >= 3;
}

export function isReadyToSubmit(f: I9FormData): boolean {
  return isBaseSectionComplete(f) && isAttestationComplete(f) && isSignatureComplete(f);
}

// ── US states constant ────────────────────────────────────────────────
export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },      { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },      { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },   { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },      { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },       { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },     { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },         { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },     { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },        { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },{ code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },    { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },     { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },     { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },{ code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },   { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },{code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },         { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },       { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },        { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },      { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },   { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },    { code: 'WY', name: 'Wyoming' },
  { code: 'PR', name: 'Puerto Rico' },  { code: 'VI', name: 'U.S. Virgin Islands' },
  { code: 'GU', name: 'Guam' },
];
