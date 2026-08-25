// src/pages/employee/i9PdfFieldMap.ts
//
// Bridge between our React form state (I9FormData) and the actual
// AcroForm field names inside the USCIS I-9 PDF (extracted via pypdf —
// 133 fields on the real government form).
//
// This lets the split-editor fill only the employee-facing Section 1
// fields. Section 2 (employer) fields are intentionally NOT mapped
// here — anti-discrimination rules forbid the employee from touching
// those. Attorney/HR side would use a separate mapping.

import type { I9FormData } from '../../types/employee/i9.types';

/** Exact AcroForm field names in the government I-9 PDF (Section 1). */
export const I9_PDF_FIELDS = {
  last_name:            'Last Name (Family Name)',
  first_name:           'First Name Given Name',
  middle_initial:       'Employee Middle Initial (if any)',
  other_last_names:     'Employee Other Last Names Used (if any)',
  address:              'Address Street Number and Name',
  apt_number:           'Apt Number (if any)',
  city:                 'City or Town',
  state:                'State',                  // /Ch (dropdown)
  zip_code:             'ZIP Code',
  date_of_birth:        'Date of Birth mmddyyyy',
  ssn:                  'US Social Security Number',
  email:                'Employees E-mail Address',
  phone:                'Telephone Number',
  uscis_a_number:       'USCIS ANumber',          // status 3 OR status 4 alt
  i94_number:           'Form I94 Admission Number',
  passport_and_country: 'Foreign Passport Number and Country of IssuanceRow1',
  work_authorized_until: 'Exp Date mmddyyyy',
  signature:            'Signature of Employee',
  signature_date:       "Today's Date mmddyyy",
  // Checkbox names for citizenship status (/Btn)
  cb_1:                 'CB_1',   // A citizen of the United States
  cb_2:                 'CB_2',   // A noncitizen national
  cb_3:                 'CB_3',   // Lawful permanent resident
  cb_4:                 'CB_4',   // An alien authorized to work

  // ── Section 2 — Employer Review and Verification ───────────────────
  // Field names verified against actual AcroForm widget positions in the
  // USCIS I-9 PDF (edition 08/01/23). Previous mapping had List A rows
  // swapped with Supplement B fields (both use the "Document Number N"
  // family), causing values to appear on the wrong page. Do not "clean up"
  // the odd names below — the "(if any)" and "1." variants are USCIS's
  // own naming; they mark the primary List A row 1 slots.
  // Trailing period is present on the raw widget name but pypdf's
  // get_fields() drops it — pdf-lib matches the un-suffixed name. Keep
  // the alias below for defensive double-write in case the PDF template
  // version differs.
  s2_list_a_title:              'Document Title 1',
  s2_list_a_title_alt:          'Document Title 1.',
  s2_list_a_issuing_authority:  'Issuing Authority 1',
  s2_list_a_document_number:    'Document Number 0 (if any)',            // this IS the List A row 1 doc # (misnamed by USCIS)
  s2_list_a_expiration:         'Expiration Date if any',                // List A row 1 expiration

  s2_list_b_title:              'List B Document 1 Title',
  s2_list_b_issuing_authority:  'List B Issuing Authority 1',
  s2_list_b_document_number:    'List B Document Number 1',
  s2_list_b_expiration:         'List B Expiration Date 1',

  s2_list_c_title:              'List C Document Title 1',
  s2_list_c_issuing_authority:  'List C Issuing Authority 1',
  s2_list_c_document_number:    'List C Document Number 1',
  s2_list_c_expiration:         'List C Expiration Date 1',

  s2_additional_information:    'Additional Information',
  s2_first_day_of_employment:   'FirstDayEmployed mmddyyyy',              // was wrongly 'Document Title 2' (Supplement B row 3)
  s2_employer_signature:        'Signature of Employer or AR',
  s2_employer_signature_name:   'Last Name First Name and Title of Employer or Authorized Representative',
  s2_employer_signature_date:   'S2 Todays Date mmddyyyy',
  s2_employer_business_name:    'Employers Business or Org Name',
  s2_employer_business_address: 'Employers Business or Org Address',
} as const;

/** Convert ISO YYYY-MM-DD → MM/DD/YYYY, which is the format the PDF's
 *  date fields expect. Returns empty string on empty/invalid input. */
export function toPdfDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Combine passport number + country into the single PDF field the form uses. */
export function combinePassport(number: string, country: string): string {
  if (!number && !country) return '';
  if (!country) return number;
  if (!number)  return country;
  return `${number}, ${country}`;
}

/** Concise mapping the split editor uses to push values into the PDF. */
export interface PdfFieldValues {
  texts:      Array<{ name: string; value: string }>;
  checkboxes: Array<{ name: string; checked: boolean }>;
  dropdowns:  Array<{ name: string; value: string }>;
}

export function buildPdfFieldValues(f: I9FormData): PdfFieldValues {
  const F = I9_PDF_FIELDS;

  const texts: PdfFieldValues['texts'] = [
    { name: F.last_name,        value: f.last_name },
    { name: F.first_name,       value: f.first_name },
    { name: F.middle_initial,   value: f.middle_initial },
    { name: F.other_last_names, value: f.other_last_names },
    { name: F.address,          value: f.address },
    { name: F.apt_number,       value: f.apt_number },
    { name: F.city,             value: f.city },
    { name: F.zip_code,         value: f.zip_code },
    { name: F.date_of_birth,    value: toPdfDate(f.date_of_birth) },
    { name: F.ssn,              value: f.ssn },
    { name: F.email,            value: f.email },
    { name: F.phone,            value: f.phone },
    { name: F.signature,        value: f.signature_typed_name },
    { name: F.signature_date,   value: toPdfDate(f.signature_date || (f.signature_typed_name ? new Date().toISOString().slice(0, 10) : '')) },
  ];

  // USCIS A-Number is shared between status 3 and status 4 (auth_key='uscis_a_number')
  const aNumber = f.citizenship_status === '3'
    ? f.lpr_uscis_a_number
    : (f.citizenship_status === '4' && f.auth_key === 'uscis_a_number' ? f.auth_uscis_a_number : '');
  texts.push({ name: F.uscis_a_number, value: aNumber });

  const i94 = f.citizenship_status === '4' && f.auth_key === 'i94_admission_number' ? f.auth_i94_number : '';
  texts.push({ name: F.i94_number, value: i94 });

  const passport = f.citizenship_status === '4' && f.auth_key === 'foreign_passport'
    ? combinePassport(f.auth_passport_number, f.auth_passport_country)
    : '';
  texts.push({ name: F.passport_and_country, value: passport });

  const workExp = f.citizenship_status === '4' ? toPdfDate(f.work_authorized_until) : '';
  texts.push({ name: F.work_authorized_until, value: workExp });

  const checkboxes: PdfFieldValues['checkboxes'] = [
    { name: F.cb_1, checked: f.citizenship_status === '1' },
    { name: F.cb_2, checked: f.citizenship_status === '2' },
    { name: F.cb_3, checked: f.citizenship_status === '3' },
    { name: F.cb_4, checked: f.citizenship_status === '4' },
  ];

  // ── Section 2 (employer) — HR-side editor pushes these onto the same PDF
  texts.push(
    { name: F.s2_list_a_title,              value: f.s2_list_a_title },
    { name: F.s2_list_a_title_alt,          value: f.s2_list_a_title },   // defensive — same value under the "." variant
    { name: F.s2_list_a_issuing_authority,  value: f.s2_list_a_issuing_authority },
    { name: F.s2_list_a_document_number,    value: f.s2_list_a_document_number },
    { name: F.s2_list_a_expiration,         value: toPdfDate(f.s2_list_a_expiration) },
    { name: F.s2_list_b_title,              value: f.s2_list_b_title },
    { name: F.s2_list_b_issuing_authority,  value: f.s2_list_b_issuing_authority },
    { name: F.s2_list_b_document_number,    value: f.s2_list_b_document_number },
    { name: F.s2_list_b_expiration,         value: toPdfDate(f.s2_list_b_expiration) },
    { name: F.s2_list_c_title,              value: f.s2_list_c_title },
    { name: F.s2_list_c_issuing_authority,  value: f.s2_list_c_issuing_authority },
    { name: F.s2_list_c_document_number,    value: f.s2_list_c_document_number },
    { name: F.s2_list_c_expiration,         value: toPdfDate(f.s2_list_c_expiration) },
    { name: F.s2_additional_information,    value: f.s2_additional_information },
    { name: F.s2_first_day_of_employment,   value: toPdfDate(f.s2_first_day_of_employment) },
    { name: F.s2_employer_signature,        value: f.s2_employer_signature_name },
    { name: F.s2_employer_signature_name,   value: f.s2_employer_signature_name },
    { name: F.s2_employer_signature_date,   value: toPdfDate(f.s2_employer_signature_date) },
    { name: F.s2_employer_business_name,    value: f.s2_employer_business_name },
    { name: F.s2_employer_business_address, value: f.s2_employer_business_address },
  );

  const dropdowns: PdfFieldValues['dropdowns'] = [
    { name: F.state, value: f.state },
  ];

  return { texts, checkboxes, dropdowns };
}
