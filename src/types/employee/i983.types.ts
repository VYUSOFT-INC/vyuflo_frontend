// src/types/employee/i983.types.ts
//
// Types for ICE Form I-983 — Training Plan for STEM OPT Students.
// Iteration scope: STUDENT-fillable sections only.
//   • Section 1 — Student Information
//   • Section 2 — Student Certification (student's typed signature)
// Employer sections (3, 4, 5, 6) + DSO evaluation sections are read-only
// in the preview and filled by the attorney/employer/DSO later.

export interface I983FormData {
  // ── Section 1: Student Information ───────────────────────────────────
  student_surname:                string;   // Family / Primary Name
  student_given_name:             string;
  student_email:                  string;

  school_recommending:            string;   // Name of School Recommending STEM OPT
  school_stem_degree:             string;   // Name of School Where STEM Degree Was Earned
  sevis_school_code:              string;   // includes 3-digit suffix

  dso_name:                       string;   // Designated School Official name
  dso_email:                      string;
  dso_phone:                      string;

  student_sevis_id:               string;
  stem_opt_from:                  string;   // ISO YYYY-MM-DD
  stem_opt_to:                    string;   // ISO YYYY-MM-DD

  qualifying_major:               string;
  cip_code:                       string;   // Classification of Instructional Programs code
  degree_level_type:              string;   // Bachelor's, Master's, Doctorate, etc.
  degree_date_awarded:            string;   // ISO
  based_on_prior_degree:          'yes' | 'no' | '';
  employment_authorization_number: string;

  // ── Section 2: Student Certification (typed signature) ──────────────
  student_signature_typed_name:   string;
  student_signature_date:         string;   // ISO
}

export const EMPTY_I983: I983FormData = {
  student_surname: '', student_given_name: '', student_email: '',
  school_recommending: '', school_stem_degree: '', sevis_school_code: '',
  dso_name: '', dso_email: '', dso_phone: '',
  student_sevis_id: '', stem_opt_from: '', stem_opt_to: '',
  qualifying_major: '', cip_code: '', degree_level_type: '',
  degree_date_awarded: '', based_on_prior_degree: '',
  employment_authorization_number: '',
  student_signature_typed_name: '', student_signature_date: '',
};

export interface I983FormRecord {
  id:              string;
  application_id:  string;
  employee_id:     string;
  status:          'draft' | 'submitted';
  data:            I983FormData;
  created_at:      string;
  updated_at:      string;
  submitted_at?:   string | null;
}

/** Common degree-level dropdown choices for the STEM OPT form. */
export const DEGREE_LEVELS = [
  'Bachelor\'s',
  'Master\'s',
  'Doctorate',
  'Professional Doctorate',
  'Other',
] as const;

// ── Validation ────────────────────────────────────────────────────────

export function isI983StudentSectionComplete(f: I983FormData): boolean {
  return Boolean(
    f.student_surname.trim() &&
    f.student_given_name.trim() &&
    f.student_email.trim() &&
    f.school_recommending.trim() &&
    f.school_stem_degree.trim() &&
    f.sevis_school_code.trim() &&
    f.dso_name.trim() && f.dso_email.trim() &&
    f.student_sevis_id.trim() &&
    f.stem_opt_from && f.stem_opt_to &&
    f.qualifying_major.trim() &&
    f.degree_level_type.trim() &&
    f.employment_authorization_number.trim(),
  );
}

export function isI983SignatureComplete(f: I983FormData): boolean {
  return f.student_signature_typed_name.trim().length >= 3;
}

export function isI983ReadyToSubmit(f: I983FormData): boolean {
  return isI983StudentSectionComplete(f) && isI983SignatureComplete(f);
}
