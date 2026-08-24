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

  const dropdowns: PdfFieldValues['dropdowns'] = [
    { name: F.state, value: f.state },
  ];

  return { texts, checkboxes, dropdowns };
}
