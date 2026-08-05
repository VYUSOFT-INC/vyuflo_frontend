// src/types/lawyer/newCase.types.ts
//
// Types for the Lawyer "New Case (Intake)" 3-step wizard.
// Route: /lawyer/cases/new
// Backend expected: POST /lawyer/cases (spec doc will detail).

export type NewCasePriority = "standard" | "urgent" | "premium";

export type NewCaseStep = "visa" | "basic" | "review";

/** Visa type categories shown as tabs in Step 1. */
export type VisaCategory = "work" | "student" | "dependent" | "other";

export interface VisaTypeOption {
  id:            string;                // backend uuid (or code fallback)
  code:          string;                // "H-1B"
  name:          string;                // "H-1B Specialty Occupation"
  description:   string;
  category:      VisaCategory;
  duration:      string;                // "6-12 months"
  doc_count:     number;                // "8 documents"
  icon?:         string;                // optional emoji/lucide name
}

/** Consulted-client option shown in the Step 2 dropdown. */
export interface ConsultedClient {
  user_id:       string;
  full_name:     string;
  email:         string;
  last_consulted_iso?: string;          // for sort/subtitle
  visa_hint?:    string;                // suggested visa from consultation notes
}

/** POST /lawyer/cases body */
export interface NewCaseCreateRequest {
  client_user_id: string;
  visa_type_code: string;
  case_name:      string;               // min 3 chars
  target_date?:   string;               // ISO date "YYYY-MM-DD"
  priority:       NewCasePriority;
  source:         "consultation";       // origin marker
}

export interface NewCaseCreateResponse {
  id:             string;
  case_number:    string;               // human-readable "#VF-2026-090"
  status:         string;               // "in_progress"
  created_at:     string;
  message?:       string;
}

/** Default visa-type catalog used when /visa-types endpoint fails or returns 0. */
export const DEFAULT_VISA_TYPES: VisaTypeOption[] = [
  { id: "H-1B",  code: "H-1B",  name: "H-1B Specialty Occupation",  description: "Most common work visa for professionals with bachelor's degree or higher", category: "work",      duration: "6-12 months", doc_count: 8,  icon: "💼" },
  { id: "L-1A",  code: "L-1A",  name: "L-1A Intracompany Transfer",  description: "For managers and executives transferring within company",                  category: "work",      duration: "4-8 months",  doc_count: 10, icon: "🏢" },
  { id: "L-1B",  code: "L-1B",  name: "L-1B Specialized Knowledge",  description: "For employees with specialized knowledge",                                 category: "work",      duration: "3-5 months",  doc_count: 15, icon: "📊" },
  { id: "O-1",   code: "O-1",   name: "O-1 Extraordinary Ability",   description: "For individuals with extraordinary ability in sciences, arts, etc.",       category: "work",      duration: "3-6 months",  doc_count: 12, icon: "⭐" },
  { id: "TN",    code: "TN",    name: "TN NAFTA Professional",       description: "For Canadian and Mexican citizens in professional occupations",            category: "work",      duration: "1-3 months",  doc_count: 6,  icon: "🌎" },
  { id: "E-2",   code: "E-2",   name: "E-2 Treaty Investor",         description: "For investors from treaty countries making substantial investment",        category: "work",      duration: "3-5 months",  doc_count: 15, icon: "💰" },
  { id: "F-1",   code: "F-1",   name: "F-1 Student Visa",            description: "For academic students at accredited institutions",                         category: "student",   duration: "1-3 months",  doc_count: 7,  icon: "🎓" },
  { id: "J-1",   code: "J-1",   name: "J-1 Exchange Visitor",        description: "For students, scholars, and trainees in exchange programs",                category: "student",   duration: "2-4 months",  doc_count: 8,  icon: "🎒" },
  { id: "H-4",   code: "H-4",   name: "H-4 Dependent",               description: "Spouse or child of H-1B holder",                                           category: "dependent", duration: "2-4 months",  doc_count: 6,  icon: "👨‍👩‍👧" },
  { id: "L-2",   code: "L-2",   name: "L-2 Dependent",               description: "Spouse or child of L-1 holder",                                            category: "dependent", duration: "2-4 months",  doc_count: 6,  icon: "👪" },
  { id: "EB-1",  code: "EB-1",  name: "EB-1 Priority Worker",        description: "Green card for persons of extraordinary ability, professors, executives", category: "other",     duration: "8-14 months", doc_count: 14, icon: "🏆" },
  { id: "EB-2",  code: "EB-2",  name: "EB-2 Advanced Degree",        description: "Green card for advanced-degree professionals or exceptional ability",     category: "other",     duration: "10-18 months",doc_count: 13, icon: "🎯" },
  { id: "EB-5",  code: "EB-5",  name: "EB-5 Investor",               description: "Green card for foreign investors",                                        category: "other",     duration: "12-24 months",doc_count: 20, icon: "💎" },
  { id: "K-1",   code: "K-1",   name: "K-1 Fiancé(e)",               description: "Visa for fiancé(e)s of US citizens",                                       category: "other",     duration: "6-9 months",  doc_count: 9,  icon: "💍" },
];