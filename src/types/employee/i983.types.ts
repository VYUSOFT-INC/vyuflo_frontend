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

  // ══════════════════════════════════════════════════════════════════
  // HR / EMPLOYER SECTIONS (filled by HR side; blank on student side)
  // ══════════════════════════════════════════════════════════════════

  // ── Section 3: Employer Information ────────────────────────────────
  employer_name:                  string;
  employer_street:                string;
  employer_suite:                 string;
  employer_website:               string;
  employer_city:                  string;
  employer_state:                 string;
  employer_zip:                   string;
  employer_ein:                   string;
  start_date_employment:          string;   // ISO
  printed_name_employing_org:     string;
  site_name:                      string;
  site_address:                   string;
  official_name:                  string;
  official_title:                 string;
  official_email:                 string;
  official_phone:                 string;
  num_ft_employees:               string;
  naics_code:                     string;
  opt_hours_per_week:             string;
  annual_salary:                  string;
  other_compensation_1:           string;
  other_compensation_2:           string;
  other_compensation_3:           string;
  other_compensation_4:           string;

  // Section 3 signature block
  employer_signature_name_title:  string;   // "Printed Name and Title"
  employer_signature_date:        string;   // ISO

  // ── Section 5: Training Plan for STEM OPT Students ─────────────────
  training_student_role:          string;
  training_goals_objectives:      string;
  training_employer_oversight:    string;
  training_measures_assessments:  string;

  // ── Section 6: Employer Certification (final signature) ────────────
  section6_employer_name_title:   string;
  section6_employer_date:         string;   // ISO
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

  // Employer / HR sections — blank on student side, editable on HR side
  employer_name: '', employer_street: '', employer_suite: '',
  employer_website: '', employer_city: '', employer_state: '',
  employer_zip: '', employer_ein: '', start_date_employment: '',
  printed_name_employing_org: '', site_name: '', site_address: '',
  official_name: '', official_title: '', official_email: '', official_phone: '',
  num_ft_employees: '', naics_code: '', opt_hours_per_week: '',
  annual_salary: '',
  other_compensation_1: '', other_compensation_2: '',
  other_compensation_3: '', other_compensation_4: '',
  employer_signature_name_title: '', employer_signature_date: '',

  training_student_role: '', training_goals_objectives: '',
  training_employer_oversight: '', training_measures_assessments: '',

  section6_employer_name_title: '', section6_employer_date: '',
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

// ── HR / Employer validation ──────────────────────────────────────────

export function isI983EmployerSectionComplete(f: I983FormData): boolean {
  return Boolean(
    (f.employer_name ?? '').trim() &&
    (f.employer_street ?? '').trim() &&
    (f.employer_city ?? '').trim() &&
    (f.employer_state ?? '').trim() &&
    (f.employer_zip ?? '').trim() &&
    (f.employer_ein ?? '').trim() &&
    (f.start_date_employment ?? '').trim() &&
    (f.official_name ?? '').trim() &&
    (f.official_email ?? '').trim() &&
    (f.opt_hours_per_week ?? '').trim(),
  );
}

export function isI983TrainingPlanComplete(f: I983FormData): boolean {
  return Boolean(
    (f.training_student_role ?? '').trim() &&
    (f.training_goals_objectives ?? '').trim() &&
    (f.training_employer_oversight ?? '').trim() &&
    (f.training_measures_assessments ?? '').trim(),
  );
}

export function isI983EmployerSignatureComplete(f: I983FormData): boolean {
  return (f.employer_signature_name_title ?? '').trim().length >= 3;
}

export function isI983EmployerReadyToSubmit(f: I983FormData): boolean {
  return (
    isI983EmployerSectionComplete(f) &&
    isI983TrainingPlanComplete(f) &&
    isI983EmployerSignatureComplete(f)
  );
}
