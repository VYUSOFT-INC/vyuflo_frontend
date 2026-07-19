// src/data/visaChecklist.ts
//
// Static reference material that COMPLEMENTS the backend visa-type
// catalog:
//   • DOC_DETAILS  — per-document description shown when a doc row is
//                    expanded.  Backend only sends the doc name string;
//                    this file provides the "What it is / Format / Tip"
//                    body.
//   • FAQs         — hand-crafted for popular visas + template-based
//                    fallback FAQs for everything else.
//   • VisaType     — the shape the UI works with (adapted from the
//                    backend `BackendVisaType` in visaChecklist.api.ts).
//
// The list of visa types is fetched from GET /visa-types at runtime —
// see visaChecklist.api.ts.  Nothing about individual visa contents
// (name, docs, description) is hardcoded here.

import type { BackendVisaType } from '../api/employee/visaChecklist.api';

// ────────────────────────────────────────────────────────────────
// Category mapping — backend enum → UI enum
// ────────────────────────────────────────────────────────────────
export type VisaCategoryKey =
  | 'employment'
  | 'student'
  | 'visitor'
  | 'dependent'
  | 'gc-employment'
  | 'gc-family'
  | 'exchange'
  | 'other';

export interface VisaCategory {
  key:   VisaCategoryKey;
  label: string;
  blurb: string;
}

export const VISA_CATEGORIES: VisaCategory[] = [
  { key: 'employment',    label: 'Employment-Based',        blurb: 'Work visas for professionals, executives, and specialty occupations.' },
  { key: 'student',       label: 'Student',                 blurb: 'Academic and vocational study programs.' },
  { key: 'visitor',       label: 'Visitor',                 blurb: 'Short-term business or tourism travel.' },
  { key: 'dependent',     label: 'Dependent',               blurb: 'Family members of principal visa holders.' },
  { key: 'gc-employment', label: 'Green Card (Employment)', blurb: 'Permanent residence via employment sponsorship.' },
  { key: 'gc-family',     label: 'Green Card (Family)',     blurb: 'Permanent residence via family sponsorship.' },
  { key: 'exchange',      label: 'Exchange Visitor',        blurb: 'Approved cultural / academic exchange programs.' },
  { key: 'other',         label: 'Other',                   blurb: 'Additional visa categories.' },
];

/** Map any backend category string to the UI enum (defensive fallback). */
export function mapBackendCategory(raw: string | null | undefined): VisaCategoryKey {
  const s = (raw || '').toLowerCase();
  if (s === 'employment')                                         return 'employment';
  if (s === 'student')                                            return 'student';
  if (s === 'visitor')                                            return 'visitor';
  if (s === 'dependent')                                          return 'dependent';
  if (s === 'exchange')                                           return 'exchange';
  if (s === 'permanent_resident' || s === 'green_card_employment' || s === 'gc-employment')
                                                                  return 'gc-employment';
  if (s === 'green_card_family' || s === 'gc-family' || s === 'family')
                                                                  return 'gc-family';
  return 'other';
}

// ────────────────────────────────────────────────────────────────
// UI-shape visa type — normalized from BackendVisaType
// ────────────────────────────────────────────────────────────────
export interface VisaType {
  /** Stable key = backend `code` (e.g. "H-1B"). */
  key:          string;
  category:     VisaCategoryKey;
  /** Short name, from backend `code`. */
  name:         string;
  /** Full title, from backend `name` (e.g. "H-1B Specialty Occupation Visa"). */
  title:        string;
  /** Purpose = backend `description` (or short_label as fallback). */
  purpose:      string;
  /** Required documents — string list from backend. */
  documents:    string[];
  /** Optional metadata pulled from backend for display. */
  processingLabel?: string | null;
  governmentFee?:   number;
  successRate?:     number;
  uscisUrl?:        string | null;
  requiresEmployer?: boolean;
  /** Original backend id (used for detail fetches / drill-downs). */
  backendId?:    string;
}

/**
 * Convert one BackendVisaType → UI VisaType.
 *
 * required_documents is defensively normalized — backend may send it as:
 *   • string[]                         → use as-is
 *   • JSON-encoded string  '["A","B"]' → JSON.parse
 *   • undefined / null / empty         → []
 */
export function toUiVisa(b: BackendVisaType): VisaType {
  const purpose =
    (b.description && b.description.trim()) ||
    (b.short_label && b.short_label.trim()) ||
    b.name;
  return {
    key:              b.code,
    category:         mapBackendCategory(b.category),
    name:             b.code,
    title:            b.name,
    purpose,
    documents:        parseDocuments(b.required_documents),
    processingLabel:  b.processing_time_label ?? null,
    governmentFee:    b.government_fee_usd,
    successRate:      b.success_rate,
    uscisUrl:         b.uscis_url ?? null,
    requiresEmployer: b.requires_employer_sponsor,
    backendId:        b.id,
  };
}

/** Robust parser for required_documents — accepts array, JSON string, or empty. */
function parseDocuments(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x) => typeof x === 'string' && x.trim().length > 0);
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    // Try JSON.parse — backend sometimes stores docs as a JSON-encoded string
    // (see admin CreateVisaTypePayload — `required_documents: '["Passport Copy"]'`).
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x) => typeof x === 'string' && x.trim().length > 0);
      }
    } catch { /* not JSON — fall through */ }
    // Last resort: comma-split (in case backend sends "A, B, C")
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// ────────────────────────────────────────────────────────────────
// POPULAR visa codes — matched against backend `code` field.
// If a code isn't in the backend catalog we fall back to the first
// N active visas from the response, so the "Popular" row is never
// empty.
// ────────────────────────────────────────────────────────────────
export const POPULAR_VISA_KEYS: string[] = ['H-1B', 'F-1', 'O-1A', 'L-1A'];

// ────────────────────────────────────────────────────────────────
// DOCUMENT DETAILS
// ────────────────────────────────────────────────────────────────
export interface DocumentDetail {
  what:      string;
  format?:   string;
  tip?:      string;
}

export const DOC_DETAILS: Record<string, DocumentDetail> = {
  // ── Identity ──────────────────────────────────────────────────
  'Passport': {
    what:   'Current valid passport with the biographic (photo) page.',
    format: 'Color scan, both sides if any endorsements. Must be valid for at least 6 months beyond intended U.S. stay.',
    tip:    'Include all prior passports if visa stamps or U.S. entries are on them.',
  },
  'Valid Passport': {
    what:   'Passport valid for at least 6 months beyond intended U.S. stay.',
    format: 'Color scan of biographic page. Include prior passports if any U.S. history.',
  },
  'Passport Copy': {
    what:   'Clear color scan of the passport biographic (photo) page.',
    format: 'PDF or JPEG, all four corners visible, no glare.',
  },
  'Passport-sized Photograph': {
    what:   'Recent U.S. passport-style photograph.',
    format: '2×2 inches (51×51 mm), white background, taken within the last 6 months.',
    tip:    'No glasses, neutral expression, full face visible.',
  },
  'Passport Photos': {
    what:   'Recent U.S. passport-style photographs.',
    format: '2×2 inches, white background, taken within the last 6 months.',
  },

  // ── Education ────────────────────────────────────────────────
  'Degree certificates': {
    what:   'Certificates for every degree earned (Bachelor\'s, Master\'s, PhD, etc.).',
    format: 'Original + English translation if issued in another language.',
  },
  'Degree Certificates': {
    what:   'Certificates for every degree earned.',
    format: 'Original + English translation if in another language.',
  },
  'Degree certificates and transcripts': {
    what:   'Degree certificate for every completed program + official transcripts / mark sheets.',
    format: 'Original + English translation for non-English documents.',
    tip:    'Include credential evaluation (WES / ECA) if the degree was earned abroad.',
  },
  'Academic Transcripts': {
    what:   'Official transcripts / mark sheets for every degree program.',
    format: 'Sealed / attested by the issuing institution when possible.',
  },
  'Credential Evaluation (if required)': {
    what:   'WES, ECA, or similar U.S. equivalency evaluation.',
    tip:    'Required when the degree was earned outside the U.S. and the employer / school asks for U.S. equivalency.',
  },
  'Educational Transcripts': {
    what:   'Official academic transcripts / mark sheets.',
    format: 'Sealed / attested by the issuing institution.',
  },

  // ── Employment ───────────────────────────────────────────────
  'Resume': {
    what:   'Current professional resume.',
    format: '1–2 pages, PDF, includes education + full work history.',
  },
  'Updated Resume / CV': {
    what:   'Current professional resume / CV.',
    format: '1–2 pages, PDF.',
  },
  'Resume / CV': {
    what:   'Current professional resume / CV.',
    format: '1–2 pages, PDF.',
  },
  'Experience letters': {
    what:   'Letters from previous employers confirming role, dates and responsibilities.',
    format: 'On company letterhead, signed by HR or manager. Must list job title, dates of employment, and duties in detail.',
  },
  'Experience Letters': {
    what:   'Letters from previous employers confirming role, dates and responsibilities.',
    format: 'On company letterhead, signed by HR or manager.',
  },
  'Job offer letter': {
    what:   'Formal offer letter from the U.S. petitioning employer.',
    format: 'On company letterhead, signed. Must include position title, wage, start date, and location.',
  },
  'Job Offer Letter': {
    what:   'Formal offer letter from the sponsoring employer.',
    format: 'On company letterhead, signed. Must include position title, wage, start date.',
  },
  'Offer Letter': {
    what:   'Formal offer letter from the sponsoring employer.',
    format: 'On company letterhead, signed.',
  },
  'Employment letter': {
    what:   'Letter from the sponsoring employer confirming the job offer and role.',
    format: 'On company letterhead, signed.',
  },
  'Employment Verification Letter': {
    what:   'Letter from the current or previous employer verifying employment.',
    format: 'On company letterhead, includes role, dates, and duties.',
  },
  'Employment verification': {
    what:   'Verification letter from your foreign employer confirming employment for at least 1 continuous year within the last 3 years.',
    format: 'On company letterhead, signed by HR.',
  },
  'Pay stubs (if applicable)': {
    what:   'Recent U.S. pay stubs — required for H-1B transfers or extensions.',
    format: 'Last 3 months, PDF.',
  },
  'Pay Stubs (Last 3 Months)': {
    what:   'Most recent 3 months of pay stubs from your U.S. employer.',
    format: 'PDF.',
  },
  'Employment agreement': {
    what:   'Signed employment agreement or engagement contract with the petitioning employer.',
  },

  // ── USCIS / Government Forms ─────────────────────────────────
  'Labor Condition Application (LCA)': {
    what:   'Certified LCA (Form ETA-9035) filed by the employer with the DOL.',
    format: 'Must be certified and posted at the worksite for at least 10 business days before filing.',
  },
  'LCA': {
    what:   'Certified Labor Condition Application (Form ETA-9035).',
    format: 'Filed by employer with DOL, certified before I-129 submission.',
  },
  'Form I-129': {
    what:   'Petition for a Nonimmigrant Worker.',
    format: 'Filed by the employer with USCIS.',
    tip:    'Include the visa-specific supplement (H, L, O, etc.).',
  },
  'DS-160': {
    what:   'Online Nonimmigrant Visa Application (DS-160).',
    format: 'Complete on ceac.state.gov and save the confirmation page with barcode.',
  },
  'DS-160 Confirmation': {
    what:   'Printed confirmation page from your submitted DS-160.',
    format: 'PDF, barcode must be legible.',
  },
  'Form I-20': {
    what:   'Certificate of Eligibility for Nonimmigrant Student Status, issued by your SEVP-certified school.',
    format: 'Signed by the Designated School Official (DSO) AND by you.',
  },
  'I-20': {
    what:   'Certificate of Eligibility issued by your SEVP-certified school.',
  },
  'SEVIS Fee Receipt': {
    what:   'Receipt confirming payment of the SEVIS I-901 fee.',
    format: 'PDF from FMJfee.com; keep both digital and printed copies.',
  },
  'Admission Letter': {
    what:   'Official acceptance letter from the U.S. institution.',
    format: 'On institution letterhead; program dates and estimated cost of attendance visible.',
  },
  'Acceptance Letter': {
    what:   'Official acceptance letter from the U.S. institution.',
  },
  'DS-2019': {
    what:   'Certificate of Eligibility for Exchange Visitor (J-1) Status.',
    format: 'Signed by the responsible officer at your program sponsor.',
  },
  'Form DS-2019': {
    what:   'DS-2019 issued by your J-1 program sponsor.',
  },
  'Form I-797 (if applicable)': {
    what:   'USCIS Notice of Action for any prior approval (H-1B, L-1, I-140, etc.).',
    format: 'All pages, all sides.',
  },
  'Previous I-797': {
    what:   'USCIS Notice of Action for a prior approval.',
    format: 'All pages, all sides.',
  },
  'Current I-797 Approval Notice': {
    what:   'Your current USCIS Approval Notice (I-797).',
  },
  'I-140 Petition': {
    what:   'Immigrant Petition for Alien Worker (Form I-140), filed by the employer.',
  },
  'I-140': {
    what:   'Immigrant Petition for Alien Worker (Form I-140).',
  },
  'PERM (if applicable)': {
    what:   'Approved PERM Labor Certification (ETA-9089) — required for EB-2 and EB-3.',
    format: 'Certified copy from DOL.',
  },
  'PERM Certification': {
    what:   'Approved PERM Labor Certification (ETA-9089).',
    format: 'Certified copy from DOL.',
  },
  'PERM Labor Certification': {
    what:   'Approved PERM Labor Certification (ETA-9089).',
    format: 'Certified copy from DOL.',
  },
  'EAD Application (Form I-765)': {
    what:   'Application for Employment Authorization Document (Form I-765).',
  },
  'EAD Card': {
    what:   'Employment Authorization Document card issued by USCIS.',
  },

  // ── Financial ────────────────────────────────────────────────
  'Financial documents': {
    what:   'Proof of funds to cover tuition + living expenses for the first year.',
    format: 'Recent bank statements, fixed deposits, sponsor affidavit, or scholarship letter.',
  },
  'Financial evidence': {
    what:   'Proof of ability to cover expenses during your program.',
    format: 'Recent bank statements + sponsor affidavit if applicable.',
  },
  'Financial proof': {
    what:   'Proof of funds to cover your program duration.',
  },
  'Financial Support Evidence': {
    what:   'Documents showing you have the financial resources for your U.S. stay.',
    format: 'Bank statements, sponsor letters, or scholarship documents.',
  },
  'Financial records': {
    what:   'Recent bank statements, tax returns, and any additional financial evidence.',
  },
  'Bank Statements': {
    what:   'Bank statements for the most recent 3 months.',
    format: 'Official bank statements or e-statements. Must show account holder name.',
  },
  'Bank Statements (Last 3 Months)': {
    what:   'Bank statements from the most recent 3 months.',
    format: 'Must show account holder name and account balance.',
  },
  'Bank statements': {
    what:   'Bank statements for the most recent 3 months.',
  },
  'Tax returns': {
    what:   'Federal tax returns for the last 2–3 years.',
    format: 'IRS transcript preferred; complete filed returns acceptable.',
  },
  'Tax Returns': {
    what:   'Federal tax returns for the last 2–3 years.',
    format: 'IRS transcript preferred.',
  },
  'Affidavit of Support': {
    what:   'Signed statement from your financial sponsor accepting responsibility for your expenses.',
  },
  'Affidavit of Support (Form I-864)': {
    what:   'Form I-864 signed by your U.S. citizen or LPR sponsor.',
    format: 'Signed original; sponsor must meet the 125%-of-poverty income requirement.',
  },
  'Affidavit of Support (I-864)': {
    what:   'Form I-864 signed by your U.S. citizen or LPR sponsor.',
  },
  'Sponsor Letter': {
    what:   'Letter from your financial sponsor confirming support commitment.',
    format: 'Signed, with the sponsor\'s relationship to you and financial capacity.',
  },
  'Investment records': {
    what:   'Records proving the substantial capital investment (bank transfers, wire receipts, corporate stock).',
  },
  'Investment proof': {
    what:   'Records proving capital investment in the U.S. enterprise.',
  },
  'Investment Evidence': {
    what:   'Records proving the substantial capital investment.',
    format: 'Bank transfers, wire receipts, corporate stock.',
  },
  'Source of funds evidence': {
    what:   'Documentation showing the lawful source of your invested funds.',
    format: 'Bank statements, sale deeds, gift affidavits, inheritance papers, salary history.',
  },
  'Source of Funds Documentation': {
    what:   'Documentation showing the lawful source of your invested funds.',
  },
  'Business plan': {
    what:   'Detailed business plan for the new U.S. enterprise.',
    format: 'Includes market analysis, staffing projections, and 5-year financial projections.',
  },
  'Business Plan': {
    what:   'Comprehensive 5-year business plan for the U.S. enterprise.',
  },
  'Corporate documents': {
    what:   'Articles of incorporation, bylaws, shareholder agreements, and any operating agreements.',
  },
  'Business documents': {
    what:   'Business registrations, licenses, and operating documents.',
  },
  'Company Registration Documents': {
    what:   'Business registrations and licenses for the U.S. entity.',
  },
  'Trade records': {
    what:   'Trade contracts, purchase orders, and invoices showing substantial trade with the U.S.',
  },

  // ── Company / Sponsor ────────────────────────────────────────
  'Organizational chart': {
    what:   'Employer\'s current organizational chart showing where the position fits.',
    format: 'Include reporting relationships and headcounts.',
  },
  'Organizational Chart': {
    what:   'Employer\'s current organizational chart showing where the position fits.',
  },
  'Company financials': {
    what:   'Recent audited financial statements or tax returns for the U.S. sponsoring entity.',
  },
  'Company Financial Statements': {
    what:   'Recent audited financial statements or tax returns.',
  },
  'Support letter': {
    what:   'Employer\'s support letter describing the job, qualifications required, and the relationship between offices (for L-1).',
    format: 'On company letterhead, signed by an authorized officer.',
  },
  'Employer Support Letter': {
    what:   'Detailed letter from employer explaining the role, need, and beneficiary\'s qualifications.',
  },
  'Employer Attestation': {
    what:   'Employer\'s formal attestation about the position and conditions.',
  },
  'Payroll records': {
    what:   'Payroll records for the beneficiary at the foreign or U.S. entity.',
  },
  'Job Description': {
    what:   'Detailed description of duties, responsibilities, and minimum qualifications for the offered role.',
  },
  'Business purpose documentation': {
    what:   'Documents explaining the specific business purpose of your U.S. visit.',
    format: 'Meeting invitations, conference registration, or business correspondence.',
  },
  'Invitation letter': {
    what:   'Letter from the U.S. host inviting you for the business purpose.',
    format: 'On company letterhead, signed.',
  },
  'Invitation Letter (if applicable)': {
    what:   'Letter from the U.S. host inviting you.',
    format: 'On company letterhead, signed.',
  },

  // ── Achievement / Extraordinary Ability ──────────────────────
  'Awards and recognitions': {
    what:   'Certificates, medals, and citations for major awards or recognitions in the field.',
  },
  'Awards': {
    what:   'Certificates, medals, and citations for major awards.',
  },
  'Awards and Recognition Evidence': {
    what:   'Documentation of awards, medals, and recognition in the field.',
  },
  'Publications': {
    what:   'Copies of published articles, papers, or media coverage authored by or about the beneficiary.',
  },
  'Published Work or Media Coverage': {
    what:   'Copies of published articles, papers, or media coverage.',
  },
  'Recommendation letters': {
    what:   'Letters from independent experts / peers evaluating the beneficiary\'s extraordinary ability.',
    format: 'Ideally 6–8 letters from recognized experts in the field.',
  },
  'Expert Reference Letters': {
    what:   'Letters from recognized experts in the field.',
    format: '6–8 letters from independent experts, on letterhead.',
  },
  'Research evidence': {
    what:   'Evidence of research contributions — patents, published papers, citations, grants.',
  },
  'Personal Statement': {
    what:   'Personal statement or Statement of Purpose (SOP) describing your background, goals, and reasons for U.S. study.',
    format: '500–1000 words, PDF.',
  },
  'Personal Statement / SOP': {
    what:   'Statement of Purpose describing your academic and career goals.',
    format: '500–1000 words, PDF.',
  },
  'Personal statement': {
    what:   'Personal statement explaining your national-interest contribution (for NIW).',
  },
  'Letters of Recommendation (2-3)': {
    what:   'Recommendation letters from professors or supervisors.',
    format: 'On letterhead, signed. Two or three typically required.',
  },
  'Portfolio or Showreel': {
    what:   'Portfolio, showreel, or demo of your creative work.',
  },
  'Proof of Specialized Knowledge': {
    what:   'Evidence you possess knowledge not commonly held in the industry.',
  },
  'Critical Role Evidence': {
    what:   'Evidence of a critical role in a distinguished organization.',
  },

  // ── Travel / Immigration ─────────────────────────────────────
  'I-94': {
    what:   'Most recent I-94 Arrival/Departure Record.',
    format: 'PDF from i94.cbp.dhs.gov (retrieve using passport info).',
  },
  'I-94 Arrival/Departure Record': {
    what:   'Most recent I-94 record.',
    format: 'PDF from i94.cbp.dhs.gov.',
  },
  'Travel itinerary': {
    what:   'Flight bookings and detailed travel plan for your U.S. visit.',
  },
  'Travel Itinerary': {
    what:   'Flight bookings and detailed travel plan for your U.S. visit.',
  },
  'Ties to home country': {
    what:   'Evidence of strong ties to your home country — property, family, ongoing employment, bank accounts.',
    tip:    'Critical for B-1/B-2 to prove non-immigrant intent.',
  },
  'Ties to Home Country Evidence': {
    what:   'Evidence of strong ties — property, family, employment, bank accounts back home.',
    tip:    'Critical for B-1/B-2 to prove non-immigrant intent.',
  },
  'Previous immigration documents': {
    what:   'Copies of all prior U.S. visas, I-797 approvals, I-94s, EAD cards, and Advance Parole documents.',
  },
  'Copy of Current Visa': {
    what:   'Copy of your current U.S. visa stamp.',
  },
  'Current Immigration Status Evidence': {
    what:   'Documents showing your current immigration status in the U.S.',
    format: 'I-94, current visa, most recent I-797 if any.',
  },

  // ── Family / Dependent ──────────────────────────────────────
  'Marriage certificate': {
    what:   'Government-issued marriage certificate for the spouse.',
    format: 'Original + English translation if applicable.',
  },
  'Marriage certificate (spouse)': {
    what:   'Government-issued marriage certificate for the spouse.',
    format: 'Original + English translation if applicable.',
  },
  'Marriage Certificate': {
    what:   'Government-issued marriage certificate.',
  },
  'Birth certificate': {
    what:   'Government-issued birth certificate.',
    format: 'Original + English translation if applicable.',
  },
  'Birth certificate (children)': {
    what:   'Birth certificate for each child dependent.',
  },
  'Birth Certificate': {
    what:   'Government-issued birth certificate.',
  },
  'Principal applicant\'s visa documents': {
    what:   'Copies of the principal (main) applicant\'s valid visa, I-797 approvals, and I-94.',
  },

  // ── Miscellaneous ────────────────────────────────────────────
  'Job contract': {
    what:   'Signed contract with the U.S. employer describing the seasonal position.',
  },
  'Labor certification': {
    what:   'DOL-approved temporary labor certification specific to the H-2A or H-2B position.',
  },
  'Temporary labor certification': {
    what:   'Approved temporary labor certification from the DOL.',
  },
  'Training plan': {
    what:   'Detailed training plan describing the curriculum, duration, and outcomes.',
  },
  'I-983 Training Plan': {
    what:   'Form I-983 training plan for STEM OPT.',
  },
  'Sponsorship documents': {
    what:   'Documents proving that the sponsoring organization can support the training program.',
  },
  'Program Sponsor Letter': {
    what:   'Letter from your program sponsor confirming support.',
  },
  'Professional licenses (if required)': {
    what:   'Professional licenses required to practice in the U.S. state of employment.',
  },
  'Professional License (if applicable)': {
    what:   'Professional licenses required to practice.',
  },
  'Evidence of treaty nationality': {
    what:   'Passport + citizenship documents proving nationality of a treaty country.',
  },
  'Financial statements': {
    what:   'Recent audited financial statements of the treaty enterprise.',
  },
  'Petition documents specific to sub-category': {
    what:   'Filing package specific to your EB-4 sub-category (religious worker, government employee, etc.).',
  },
  'Two Passport Photos': {
    what:   'Two recent U.S. passport-style photographs.',
    format: '2×2 inches, white background.',
  },
  'Medical Examination (Form I-693)': {
    what:   'USCIS civil surgeon medical examination Form I-693.',
    format: 'Sealed envelope from the civil surgeon; submit with I-485.',
  },
  'Form I-485': {
    what:   'Application to Register Permanent Residence or Adjust Status.',
  },
  'National Interest Waiver Justification Letter': {
    what:   'Personal statement justifying an NIW — proposed endeavor, ability, national interest.',
  },
  'Form I-140 Supporting Documents': {
    what:   'Supporting evidence for the I-140 petition.',
    format: 'Degrees, experience letters, publications, awards as applicable.',
  },
  'Enrollment Verification': {
    what:   'Verification of enrollment from the school.',
  },
  'STEM Degree Transcript': {
    what:   'Transcript for your STEM-eligible degree.',
  },
  'Proof of Employment Abroad': {
    what:   'Evidence of employment with the qualifying foreign entity.',
    format: 'Employment letter, pay stubs, tax records.',
  },
  'Form I-20 (OPT Recommendation)': {
    what:   'I-20 with OPT recommendation from your DSO.',
  },
  'Form I-20 (Updated)': {
    what:   'Updated I-20 reflecting recent changes.',
  },
  'Form I-20 (CPT Authorization)': {
    what:   'I-20 with CPT authorization from your DSO.',
  },
  'Contracts or Itinerary': {
    what:   'Contracts or detailed event itinerary.',
    format: 'For each engagement or event during the visa period.',
  },
};

/** Case-insensitive lookup for a document's detail block. */
export function getDocDetail(docName: string): DocumentDetail | undefined {
  if (DOC_DETAILS[docName]) return DOC_DETAILS[docName];
  const lower = docName.toLowerCase();
  const key = Object.keys(DOC_DETAILS).find((k) => k.toLowerCase() === lower);
  return key ? DOC_DETAILS[key] : undefined;
}

// ────────────────────────────────────────────────────────────────
// Helpers over the merged (backend) UI list
// ────────────────────────────────────────────────────────────────
export function getVisaByKey(list: VisaType[], key: string): VisaType | undefined {
  return list.find((v) => v.key === key);
}

export function getVisasByCategory(list: VisaType[], cat: VisaCategoryKey): VisaType[] {
  return list.filter((v) => v.category === cat);
}

export function getCategoryLabel(cat: VisaCategoryKey): string {
  return VISA_CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
}

// ────────────────────────────────────────────────────────────────
// FAQs
// ────────────────────────────────────────────────────────────────
export interface Faq { q: string; a: string; }

const VISA_FAQS: Record<string, Faq[]> = {
  'H-1B': [
    { q: 'What is the H-1B annual cap?',
      a: 'USCIS grants 65,000 regular H-1B visas each fiscal year plus 20,000 additional for holders of U.S. master\'s or higher degrees. Cap-subject petitions must go through the annual electronic registration in March.' },
    { q: 'How long can I stay on H-1B?',
      a: 'Initial approval is up to 3 years, with one 3-year extension possible (6 years total). Extensions beyond 6 years are allowed if your I-140 is approved or a labor certification has been pending 365+ days.' },
    { q: 'Can I change employers on H-1B?',
      a: 'Yes. The new employer files an H-1B transfer petition. You can start working for the new employer as soon as USCIS receives the petition (H-1B portability).' },
    { q: 'What is the LCA?',
      a: 'The Labor Condition Application (ETA-9035) is filed by the employer with the DOL. It certifies that the employer will pay the prevailing wage for the role and that hiring you won\'t adversely affect U.S. workers.' },
    { q: 'Can my spouse work in the U.S.?',
      a: 'Your spouse enters on H-4. H-4 spouses can apply for an H-4 EAD if the H-1B holder has an approved I-140 (or has met certain AC21 conditions).' },
  ],
  'F-1': [
    { q: 'Can I work on F-1?',
      a: 'You can work up to 20 hours per week on-campus during the semester (full-time in breaks). Off-campus work requires CPT (during studies) or OPT (after / during studies).' },
    { q: 'What is CPT vs OPT?',
      a: 'CPT (Curricular Practical Training) is training authorized by your DSO as part of your curriculum, typically an internship. OPT (Optional Practical Training) is up to 12 months of work in your field after graduation.' },
    { q: 'What is STEM OPT?',
      a: 'A 24-month extension of regular OPT for students with an eligible STEM degree working for an E-Verify employer. Total OPT + STEM OPT can be up to 36 months.' },
    { q: 'How long can I stay on F-1?',
      a: 'For the duration of your academic program (Duration of Status / D/S) plus a 60-day grace period after program completion.' },
    { q: 'Can I travel outside the U.S. on F-1?',
      a: 'Yes — you need a valid passport, valid F-1 visa, and an I-20 with a travel signature from your DSO signed within the last 12 months (or 6 months if on OPT).' },
  ],
  'L-1A': [
    { q: 'What\'s the difference between L-1A and L-1B?',
      a: 'L-1A is for managers and executives (max 7 years). L-1B is for employees with specialized knowledge (max 5 years).' },
    { q: 'How long must I have worked at the foreign office?',
      a: 'At least 1 continuous year within the 3 years immediately preceding your U.S. transfer.' },
    { q: 'Can I self-petition L-1?',
      a: 'No. L-1 requires an employer petition and a qualifying relationship (parent, subsidiary, affiliate, or branch) between the foreign and U.S. entities.' },
    { q: 'Can L-1A lead to a Green Card?',
      a: 'Yes — L-1A qualifies for EB-1C (Multinational Executive/Manager), which does not require PERM.' },
  ],
  'L-1B': [
    { q: 'What counts as "specialized knowledge"?',
      a: 'Knowledge of the company\'s products, services, research, techniques, or management that is not commonly held in the industry.' },
    { q: 'How long is L-1B valid?',
      a: 'Initial period up to 3 years, extendable up to a total of 5 years.' },
    { q: 'Can I switch to L-1A later?',
      a: 'Yes, if you\'re promoted to a managerial or executive role. Filing L-1A also allows you to seek EB-1C green card.' },
  ],
  'O-1A': [
    { q: 'What counts as extraordinary ability?',
      a: 'Sustained national or international acclaim demonstrated by satisfying at least 3 of USCIS\'s 8 evidentiary criteria (awards, published material, judging others\' work, original contributions, scholarly articles, high salary, critical role, memberships).' },
    { q: 'What is the consultation letter?',
      a: 'A written advisory opinion from a peer group, labor union, or management organization in your field. Required unless no such organization exists.' },
    { q: 'How long is O-1 valid?',
      a: 'Initial approval up to 3 years, with 1-year extensions in unlimited increments (as long as you continue the event/project).' },
    { q: 'Can I have multiple employers on O-1?',
      a: 'Yes — either through a U.S. agent petitioning on your behalf, or by having each employer file a separate O-1 petition.' },
  ],
  'O-1B': [
    { q: 'How is O-1B different from O-1A?',
      a: 'O-1B is for arts, TV, and film. O-1A is for sciences, education, business, and athletics. The evidentiary criteria differ.' },
    { q: 'What counts as extraordinary achievement in film/TV?',
      a: 'A very high level of accomplishment evidenced by a degree of skill and recognition significantly above ordinary in the field.' },
  ],
  'EB-5': [
    { q: 'What\'s the minimum investment?',
      a: '$1,050,000 in a standard commercial enterprise, or $800,000 in a Targeted Employment Area (TEA) or infrastructure project.' },
    { q: 'How many jobs must the investment create?',
      a: 'At least 10 full-time jobs for qualifying U.S. workers within 2 years.' },
    { q: 'Direct vs Regional Center investment?',
      a: 'Direct — you personally run the business and create the jobs directly. Regional Center — investment is pooled with other investors and indirect job creation counts.' },
  ],
  'TN': [
    { q: 'Which professions qualify?',
      a: 'Only the ~60 professions listed in USMCA Appendix 2 (accountant, engineer, scientist, teacher, etc.). Each has specific education/credential requirements.' },
    { q: 'Can Canadians apply at the border?',
      a: 'Yes — Canadian citizens can apply directly at a Class A port of entry. Mexican citizens must apply for a TN visa at a U.S. consulate first.' },
    { q: 'How long is TN valid?',
      a: 'Up to 3 years per admission, renewable indefinitely as long as you maintain non-immigrant intent.' },
  ],
  'B-1': [
    { q: 'Can I work on B-1?',
      a: 'No. B-1 permits business activities — meetings, negotiations, conferences — but not gainful employment paid from a U.S. source.' },
    { q: 'How long can I stay?',
      a: 'Typically up to 6 months per admission. Extensions of up to 6 more months are possible with Form I-539.' },
  ],
  'B-2': [
    { q: 'Can I study on B-2?',
      a: 'Only short recreational courses. Any degree-seeking or credit-earning study requires F-1 or M-1.' },
    { q: 'Can I extend my B-2 stay?',
      a: 'Yes, file Form I-539 before your I-94 expires. Extensions of up to 6 months at a time are common.' },
  ],
};

const GENERIC_FAQS: Record<VisaCategoryKey, Faq[]> = {
  'employment': [
    { q: 'What is the {name} visa for?',
      a: '{purpose}' },
    { q: 'How long does {name} processing take?',
      a: 'Regular USCIS processing typically takes 3–6 months. Premium Processing (Form I-907, additional fee) guarantees a response within 15 business days for most petitions.' },
    { q: 'Can my family come with me?',
      a: 'Yes — spouses and unmarried children under 21 can accompany you on a dependent visa. See the Dependent category for the matching dependent visa.' },
    { q: 'Can I file for a Green Card while on {name}?',
      a: 'Employment-based visas generally allow dual intent — you can pursue permanent residence (EB-1/EB-2/EB-3) while holding this status.' },
  ],
  'student': [
    { q: 'What is the {name} visa for?',
      a: '{purpose}' },
    { q: 'Can I work in the U.S. on {name}?',
      a: 'On-campus work is generally allowed up to 20 hours/week during the term. Off-campus work requires specific authorization (CPT, OPT, or economic-hardship EAD).' },
    { q: 'Can my spouse or children join me?',
      a: 'Yes — see the corresponding dependent visa in the Dependent category.' },
    { q: 'What happens after my program ends?',
      a: 'You have a 60-day grace period to depart the U.S., change status, or transfer to another SEVP-certified school.' },
  ],
  'visitor': [
    { q: 'What is the {name} visa for?',
      a: '{purpose}' },
    { q: 'How long can I stay?',
      a: 'Typically up to 6 months per admission. The exact length is set at the port of entry and shown on your I-94.' },
    { q: 'Can I work on this visa?',
      a: 'No — visitor visas do not authorize employment paid from U.S. sources.' },
    { q: 'Can I extend my stay?',
      a: 'Yes, file Form I-539 before your I-94 expires. Approval isn\'t guaranteed.' },
  ],
  'dependent': [
    { q: 'Who qualifies for {name}?',
      a: '{purpose}' },
    { q: 'Can I work as a dependent?',
      a: 'Depends on the visa. Some dependents (e.g. L-2, certain H-4) can apply for an EAD. Others (F-2) cannot work.' },
    { q: 'Can I study as a dependent?',
      a: 'Most dependent visas allow full-time academic study without needing to change to F-1.' },
    { q: 'How long is dependent status valid?',
      a: 'Tied to the principal applicant\'s status. If the principal\'s status ends, so does yours.' },
  ],
  'gc-employment': [
    { q: 'What is {name}?',
      a: '{purpose}' },
    { q: 'How long is the wait?',
      a: 'Depends on your country of birth and the visa category. Check the monthly USCIS Visa Bulletin for priority date movement.' },
    { q: 'Can I keep working while my Green Card is pending?',
      a: 'Yes — file Form I-765 for an EAD alongside your I-485 application. EAD is typically valid for 2 years.' },
    { q: 'What is priority date retrogression?',
      a: 'When demand exceeds visa supply, the priority date cutoff moves backward. Your case remains pending until your date is current again.' },
  ],
  'gc-family': [
    { q: 'Who qualifies for {name}?',
      a: '{purpose}' },
    { q: 'How long is the wait?',
      a: 'Immediate relative categories (IR) have no annual cap. Family preference categories (F1–F4) have annual limits — check the monthly Visa Bulletin.' },
    { q: 'Can the beneficiary work while the petition is pending?',
      a: 'Only after filing Form I-485 (Adjustment of Status) or by obtaining a separate work-eligible visa.' },
    { q: 'Do I need to be in the U.S. to file?',
      a: 'No — beneficiaries outside the U.S. go through Consular Processing at a U.S. embassy or consulate abroad.' },
  ],
  'exchange': [
    { q: 'What is the {name} visa for?',
      a: '{purpose}' },
    { q: 'Is there a two-year home residency requirement?',
      a: 'J-1 visas often carry a 2-year home country physical presence requirement (Section 212(e)). Check your DS-2019 for the annotation.' },
    { q: 'Can I extend or change status?',
      a: 'Extensions are program-specific. Changes of status may be limited if the 2-year rule applies (waiver required).' },
    { q: 'Can my spouse work?',
      a: 'J-2 spouses can apply for a J-2 EAD after arrival in the U.S.' },
  ],
  'other': [
    { q: 'What is the {name} visa for?',
      a: '{purpose}' },
    { q: 'How do I apply?',
      a: 'Application steps vary by visa type. Follow the required documents list above and consult an immigration attorney for filing specifics.' },
    { q: 'What is the processing time?',
      a: 'Processing times vary. Check the USCIS website or the Visa Bulletin for the most current information.' },
  ],
};

/**
 * FAQs for a given visa — hand-crafted first, template fallback otherwise.
 * Guaranteed to return 3–5 FAQs for every visa.
 */
export function getFaqsForVisa(visa: VisaType): Faq[] {
  const hand = VISA_FAQS[visa.key];
  if (hand && hand.length > 0) return hand;
  const generic = GENERIC_FAQS[visa.category] || GENERIC_FAQS['other'];
  return generic.map((f) => ({
    q: f.q.replaceAll('{name}', visa.name),
    a: f.a
      .replaceAll('{name}',    visa.name)
      .replaceAll('{purpose}', visa.purpose),
  }));
}