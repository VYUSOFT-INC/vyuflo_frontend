// src/types/lawyer/templates.types.ts
//
// Types for the Template Library (Figma Screen 22 — node 35:6251).
// Backs the visa-letter template grid used by attorneys to spin up
// Cover Letters, Support Letters, RFE Responses, and Petition Statements.
//
// Endpoint shape source: Vyuflo Swagger — Template Library section.

/* ════════════════════════════════════════════════════════════════════
   ENUMS
   ════════════════════════════════════════════════════════════════════ */

/** Four kinds of letters drafted by immigration attorneys. */
export type TemplateType =
  | 'cover_letter'        // Submitted with every USCIS petition
  | 'support_letter'      // From employer/expert/sponsor
  | 'rfe_response'        // Reply to USCIS Request For Evidence
  | 'petition_statement'; // Core legal argument (EB-1, NIW etc.)

/** Source toggle in the top-right of the library page. */
export type TemplateSource = 'my' | 'platform' | 'all';

/* ════════════════════════════════════════════════════════════════════
   TEMPLATE (list + detail)
   ════════════════════════════════════════════════════════════════════ */

/** Lightweight shape returned by GET /templates list. */
export interface TemplateListItem {
  id: string;
  title: string;
  description?: string | null;
  template_type: TemplateType | string;
  visa_type_code?: string | null;   // "H-1B", "O-1A", "L-1A", "TN", "EB-2"…
  page_count: number;               // visual length indicator
  use_count: number;                // popularity / social proof
  is_platform: boolean;             // true = firm-wide, false = personal
  is_active: boolean;               // soft-delete flag
  created_by: string;               // UUID — used to gate 3-dot menu
  created_at: string;
  updated_at: string;
}

/** Detail shape — includes the full letter text with {{placeholders}}. */
export interface TemplateDetail extends TemplateListItem {
  body_content: string;
}

/** Pagination envelope from GET /templates. */
export interface TemplateListResponse {
  items: TemplateListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/* ════════════════════════════════════════════════════════════════════
   PAYLOADS — create / edit / use
   ════════════════════════════════════════════════════════════════════ */

/** Body for POST /templates — always creates a personal (is_platform=false) one. */
export interface CreateTemplatePayload {
  title: string;
  description?: string;
  body_content: string;
  template_type: TemplateType | string;
  visa_type_code?: string;
  page_count?: number;
}

/** Body for PATCH /templates/{id} — partial update (all fields optional). */
export interface UpdateTemplatePayload {
  title?: string;
  description?: string;
  body_content?: string;
  template_type?: TemplateType | string;
  visa_type_code?: string;
  page_count?: number;
  is_active?: boolean;
}

/** Body for POST /templates/{id}/use — spawns a new Document from template. */
export interface UseTemplatePayload {
  application_id: string;
  custom_title?: string;
}

/** Response shape from POST /templates/{id}/use. */
export interface UseTemplateResponse {
  document_id: string;
  application_id: string;
  template_id: string;
  document_title: string;
  message: string;
}

/* ════════════════════════════════════════════════════════════════════
   FILTER STATE (URL-driven on the library page)
   ════════════════════════════════════════════════════════════════════ */

export interface TemplateFilters {
  source: TemplateSource;         // segmented toggle
  template_type?: TemplateType;   // tabs row
  visa_type_code?: string;        // optional filter chip
  search?: string;                // search bar
  page: number;
  page_size: number;
}