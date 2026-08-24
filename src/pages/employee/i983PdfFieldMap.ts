// src/pages/employee/i983PdfFieldMap.ts
//
// Bridge between our React form state (I983FormData) and the actual
// AcroForm field names inside the ICE Form I-983 PDF (extracted via
// pypdf — 77 fields on the real government form).
//
// This split editor is for the STUDENT side, so we only fill the
// student-facing bits of the form:
//   • Section 1 — Student Information
//   • Section 2 — Student Certification (signature/date/name)
// Employer (Sections 3–5) and DSO / evaluation fields are intentionally
// left blank in the PDF preview so those parties can fill them later.

import type { I983FormData } from '../../types/employee/i983.types';

/** Exact AcroForm field names in the ICE I-983 PDF (student fill). */
export const I983_PDF_FIELDS = {
  // ── Section 1 — Student Information ─────────────────────────────────
  // The government form uses ONE text field with "Surname, Given" combined.
  student_name_combined:  'Student Name (Surname/Primary Name, Given Name)',
  student_email:          'Student Email Address',
  school_recommending:    'Name of School Recommending STEM OPT',
  school_stem_degree:     'Name of School Where STEM Degree Was Earned',
  sevis_school_code:      'SEVIS School Code of School Recommending STEM OPT (including 3 digit suffix)',
  dso_name:               'Designated School Official DSO Name',
  dso_email:              'Designated School Official DSO Email',
  dso_phone:              'Designated School Official DSO Phone Number',
  student_sevis_id:       'Student SEVIS ID No',
  stem_opt_from:          'STEM OPT Requested Period: From (mm-dd-yyyy)',
  stem_opt_to:            'STEM OPT Requested Period: To (mm-dd-yyyy)',
  qualifying_major:       'Qualifying Major and Classification of Instructional Programs CIP Code',
  degree_level_type:      'Level/Type of Qualifying Degree',
  degree_date_awarded:    'Date Awarded (mm-dd-yyyy)',
  employment_auth_number: 'Employment Authorization Number',
  based_on_prior_degree:  'Based on Prior Degree?',   // /Btn

  // ── Section 2 — Student Certification (typed signature) ────────────
  // The PDF has three Student blocks (1/2/3) — page 1 is the Section 2
  // student certification; (2)/(3) are re-signature blocks on later pages.
  student_signed_name:    'Printed Name of Student (1)',
  student_signed_date:    'Date (mm-dd-yyyy) (1)',

  // ══════════════════════════════════════════════════════════════════
  // HR / EMPLOYER FIELDS
  // ══════════════════════════════════════════════════════════════════

  // ── Section 3 — Employer Information ───────────────────────────────
  employer_name:               'Employer Name',
  employer_street:             'Street Address',
  employer_suite:              'Suite',
  employer_website:            'Employer Website URL',
  employer_city:               'City',
  employer_state:              'State',
  employer_zip:                'ZIP Code',
  employer_ein:                'Employer ID Number EIN',
  start_date_employment:       'Start Date of Employment mmddyyyy',
  printed_name_employing_org:  'Printed Name of Employing Organization',
  site_name:                   'Site Name',
  site_address:                'Site Address (Street, City, State, ZIP)',
  official_name:               'Name of Official',
  official_title:              "Official's Title",
  official_email:              "Official's Email",
  official_phone:              "Official's Phone Number",
  num_ft_employees:            'Number of Full-Time Employees in US',
  naics_code:                  'North American Industry Classification System (NAICS) Code',
  opt_hours_per_week:          'OPT Hours Per Week (must be at least 20 hours/week)',
  annual_salary:               'Annual Salary in US dollars',
  other_compensation_1:        'Other Compensation (Type and Estimated Amount or Value) - 1',
  other_compensation_2:        'Other Compensation (Type and Estimated Amount or Value) - 2',
  other_compensation_3:        'Other Compensation (Type and Estimated Amount or Value) - 3',
  other_compensation_4:        'Other Compensation (Type and Estimated Amount or Value) - 4',

  // Section 3 employer signature (block 1)
  employer_sig_name_title:     'Printed Name and Title of Employer Official with Signatory Authority (1)',
  employer_sig_date:           'Date (mm-dd-yyyy) (2)',

  // Section 3 also duplicates a couple of student-identifying rows
  student_name_page2:          'Student Name (Surname/Primary Name, Given Name) (2)',
  employer_name_page2:         'Employer Name (2)',

  // ── Section 5 — Training Plan ──────────────────────────────────────
  training_student_role:
    "Student Role: Describe the student's role with the employer and how that role is directly related to enhancing the student s knowledge obtained through his or her qualifying STEM degree",
  training_goals_objectives:
    'Goals and Objectives: Describe how the assignment(s) with the employer will help the student achieve his or her specific objectives for work-based learning related to his or her STEM degree. The description must both specify the students goals regarding specific knowledge, skills, or techniques as well as the means by which they will be achieved',
  training_employer_oversight:
    'Employer Oversight: Explain how the employer provides oversight and supervision of individuals filling positions such as that being filled by the named F1 student. If the employer has a training program or related policy in place that controls such oversight and supervision, please describe',
  training_measures_assessments:
    'Measures and Assessments: Explain how the employer measures and confirms whether individuals filling positions such as that being filled by the named F1 student are acquiring new knowledge and skills. If the employer has a training program or related policy in place that controls such measures and assessments, please describe',

  // ── Section 6 — Employer Certification (final signature) ───────────
  section6_employer_name_title: 'Printed Name and Title of Employer Official with Signatory Authority (2)',
  section6_employer_date:       'Date (mm-dd-yyyy) (3)',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────

/** ISO YYYY-MM-DD → MM-DD-YYYY for the government form. */
function toPdfDate(iso: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}-${m[3]}-${m[1]}` : iso;
}

function joinName(surname: string, given: string): string {
  const s = (surname || '').trim();
  const g = (given || '').trim();
  if (!s && !g) return '';
  if (!s) return g;
  if (!g) return s;
  return `${s}, ${g}`;
}

/** Level/type + CIP code composited into one string per PDF's single field. */
function joinMajorCip(major: string, cip: string): string {
  const m = (major || '').trim();
  const c = (cip || '').trim();
  if (m && c) return `${m} (CIP ${c})`;
  return m || c;
}

// ── Public: build fill payload ────────────────────────────────────────

export interface PdfFieldValues {
  texts:      Array<{ name: string; value: string }>;
  checkboxes: Array<{ name: string; checked: boolean }>;
  dropdowns:  Array<{ name: string; value: string }>;
}

/**
 * Turn the current I983FormData into the shape the split-editor's PDF
 * regeneration loop consumes. Mirrors buildPdfFieldValues() in i9PdfFieldMap.ts.
 */
export function buildPdfFieldValues(f: I983FormData): PdfFieldValues {
  const F = I983_PDF_FIELDS;

  const texts: PdfFieldValues['texts'] = [
    { name: F.student_name_combined,  value: joinName(f.student_surname, f.student_given_name) },
    { name: F.student_email,          value: f.student_email },
    { name: F.school_recommending,    value: f.school_recommending },
    { name: F.school_stem_degree,     value: f.school_stem_degree },
    { name: F.sevis_school_code,      value: f.sevis_school_code },
    { name: F.dso_name,               value: f.dso_name },
    { name: F.dso_email,              value: f.dso_email },
    { name: F.dso_phone,              value: f.dso_phone },
    { name: F.student_sevis_id,       value: f.student_sevis_id },
    { name: F.stem_opt_from,          value: toPdfDate(f.stem_opt_from) },
    { name: F.stem_opt_to,            value: toPdfDate(f.stem_opt_to) },
    { name: F.qualifying_major,       value: joinMajorCip(f.qualifying_major, f.cip_code) },
    { name: F.degree_level_type,      value: f.degree_level_type },
    { name: F.degree_date_awarded,    value: toPdfDate(f.degree_date_awarded) },
    { name: F.employment_auth_number, value: f.employment_authorization_number },
    { name: F.student_signed_name,    value: f.student_signature_typed_name },
    { name: F.student_signed_date,    value: toPdfDate(f.student_signature_date) },

    // ── Employer / HR fields ─────────────────────────────────────────
    { name: F.employer_name,              value: f.employer_name },
    { name: F.employer_street,            value: f.employer_street },
    { name: F.employer_suite,             value: f.employer_suite },
    { name: F.employer_website,           value: f.employer_website },
    { name: F.employer_city,              value: f.employer_city },
    { name: F.employer_state,             value: f.employer_state },
    { name: F.employer_zip,               value: f.employer_zip },
    { name: F.employer_ein,               value: f.employer_ein },
    { name: F.start_date_employment,      value: toPdfDate(f.start_date_employment) },
    { name: F.printed_name_employing_org, value: f.printed_name_employing_org || f.employer_name },
    { name: F.site_name,                  value: f.site_name },
    { name: F.site_address,               value: f.site_address },
    { name: F.official_name,              value: f.official_name },
    { name: F.official_title,             value: f.official_title },
    { name: F.official_email,             value: f.official_email },
    { name: F.official_phone,             value: f.official_phone },
    { name: F.num_ft_employees,           value: f.num_ft_employees },
    { name: F.naics_code,                 value: f.naics_code },
    { name: F.opt_hours_per_week,         value: f.opt_hours_per_week },
    { name: F.annual_salary,              value: f.annual_salary },
    { name: F.other_compensation_1,       value: f.other_compensation_1 },
    { name: F.other_compensation_2,       value: f.other_compensation_2 },
    { name: F.other_compensation_3,       value: f.other_compensation_3 },
    { name: F.other_compensation_4,       value: f.other_compensation_4 },

    { name: F.employer_sig_name_title,    value: f.employer_signature_name_title },
    { name: F.employer_sig_date,          value: toPdfDate(f.employer_signature_date) },

    // Repeat identifiers on page 2 for continuity
    { name: F.student_name_page2,         value: joinName(f.student_surname, f.student_given_name) },
    { name: F.employer_name_page2,        value: f.employer_name },

    // Section 5
    { name: F.training_student_role,         value: f.training_student_role },
    { name: F.training_goals_objectives,     value: f.training_goals_objectives },
    { name: F.training_employer_oversight,   value: f.training_employer_oversight },
    { name: F.training_measures_assessments, value: f.training_measures_assessments },

    // Section 6
    { name: F.section6_employer_name_title, value: f.section6_employer_name_title },
    { name: F.section6_employer_date,       value: toPdfDate(f.section6_employer_date) },
  ];

  const checkboxes: PdfFieldValues['checkboxes'] = [
    { name: F.based_on_prior_degree, checked: f.based_on_prior_degree === 'yes' },
  ];

  // I-983 has no /Ch dropdowns in the student sections.
  const dropdowns: PdfFieldValues['dropdowns'] = [];

  return { texts, checkboxes, dropdowns };
}
