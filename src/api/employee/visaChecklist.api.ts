// src/api/employee/visaChecklist.api.ts
//
// Fetches the visa-type catalog used by the Visa Document Checklist
// screen. Same list the Admin console manages under Visa Types Manager
// — so anything an admin adds shows up here automatically.
//
// Endpoints (in order of preference — first one that returns a
// well-shaped payload wins):
//
//   1. GET /visa-types                — public / employee-scoped
//   2. GET /admin/visa-types          — admin-scoped (requires app_admin)
//
// The function NEVER throws.  Any error (network / interceptor / 4xx / 5xx)
// returns an empty array so the UI can fall through to its own
// placeholder state.

import axios from '../axios';

/** Visa type as returned by the backend (superset of what we use). */
export interface BackendVisaType {
  id:                        string;
  code:                      string;
  name:                      string;
  short_label:               string | null;
  description:               string | null;
  category:                  string;             // employment | student | visitor | permanent_resident | exchange | dependent | …
  is_active:                 boolean;
  status:                    string;             // active | inactive | pending_review
  requires_employer_sponsor: boolean;
  required_documents:        string[];
  required_documents_count?: number;
  typical_processing_days?:  number;
  processing_time_label?:    string | null;
  government_fee_usd?:       number;
  uscis_url?:                string | null;
  success_rate?:             number;
  active_cases_count?:       number;
  display_order?:            number;
}

/**
 * List every active visa type available in the catalog.
 * Returns [] on any failure — caller falls back to placeholder / mock.
 */
export async function listVisaTypes(): Promise<BackendVisaType[]> {
  // Attempt 1 — public / employee-scoped endpoint.
  try {
    const res = await axios.get('/visa-types', { validateStatus: () => true });
    const payload = res?.data;
    // The endpoint can return either a raw array OR { items: [] }.
    if (Array.isArray(payload)) return payload as BackendVisaType[];
    if (payload && Array.isArray(payload.items)) return payload.items as BackendVisaType[];
  } catch { /* fall through */ }

  // Attempt 2 — admin endpoint (only works for app_admin role).
  try {
    const res = await axios.get('/admin/visa-types', {
      validateStatus: () => true,
      params: { page: 1, page_size: 500 },
    });
    const payload = res?.data;
    if (Array.isArray(payload)) return payload as BackendVisaType[];
    if (payload && Array.isArray(payload.items)) return payload.items as BackendVisaType[];
  } catch { /* fall through */ }

  return [];
}

/**
 * Fetch a single visa type with full detail — including
 * `required_documents`, which is often omitted from the list response.
 * Tries the public endpoint first, then the admin one.  Returns null
 * on failure so the caller can gracefully fall back to whatever data
 * the list already had.
 */
export async function getVisaTypeDetail(id: string): Promise<BackendVisaType | null> {
  if (!id) return null;

  // Attempt 1 — public / employee endpoint.
  try {
    const res = await axios.get(`/visa-types/${id}`, { validateStatus: () => true });
    if (res.status >= 200 && res.status < 300 && res.data) {
      return res.data as BackendVisaType;
    }
  } catch { /* fall through */ }

  // Attempt 2 — admin endpoint (works only for app_admin).
  try {
    const res = await axios.get(`/admin/visa-types/${id}`, { validateStatus: () => true });
    if (res.status >= 200 && res.status < 300 && res.data) {
      return res.data as BackendVisaType;
    }
  } catch { /* fall through */ }

  return null;
}

export const visaChecklistApi = { listVisaTypes, getVisaTypeDetail };