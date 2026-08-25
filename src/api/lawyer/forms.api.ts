// src/api/lawyer/forms.api.ts
//
// Lawyer-side review endpoints for I-9 + I-983. Mirrors
// BACKEND_LAWYER_FORM_REVIEW.md. The employee/HR form-store lives at
// /employee/forms/{type}/... — lawyer read/approve/reject endpoints live
// under /lawyer/forms/{type}/... and are additive.
//
// Every call degrades gracefully: if the backend hasn't shipped the
// endpoint yet we fall back to the persistent local draft (via
// loadOrCreateI9 / loadOrCreateI983) so the UI still works end-to-end
// against localStorage during development.

import axios from '../axios';
import type { I9FormRecord, FormReviewStatus } from '../../types/employee/i9.types';
import type { I983FormRecord } from '../../types/employee/i983.types';
import {
  loadOrCreateI9,
  listLocalDrafts as listLocalI9Drafts,
  saveLocalDraft as saveLocalI9Draft,
} from '../employee/i9Form.api';
import {
  loadOrCreateI983,
  listLocalDrafts as listLocalI983Drafts,
  saveLocalDraft as saveLocalI983Draft,
} from '../employee/i983Form.api';

export type FormType = 'i9' | 'i983';

/** One row on the lawyer's Visa Forms landing page. */
export interface LawyerFormListItem {
  form_type:    FormType;
  form_id:      string;
  application_id: string;
  case_reference: string;
  review_status: FormReviewStatus;
  employee: { user_id: string; full_name: string; email: string };
  employer: { id: string; name: string; logo_url?: string | null };
  visa_type: { code: string; name: string } | null;
  employee_submitted_at: string | null;
  hr_submitted_at:       string | null;
  last_reviewed_at:      string | null;
}

export interface LawyerFormListResponse {
  items: LawyerFormListItem[];
  total: number;
  counts_by_status: Record<'submitted' | 'needs_corrections' | 'approved', number>;
  employers: Array<{ id: string; name: string }>;
}

export interface FormVersionItem {
  version_no:  number;
  event:       'submit' | 'resubmit' | 'approve' | 'request_corrections';
  note:        string | null;
  snapshot_by: { user_id: string; full_name: string } | null;
  created_at:  string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMissing = (e: any) =>
  !e?.response || [401, 403, 404, 405, 409, 422, 500, 501, 502, 503, 504].includes(e.response.status);

/* ── List ─────────────────────────────────────────────────────────── */

export async function listLawyerForms(params?: {
  employer_id?:    string;
  visa_type_code?: string;
  status?:         LawyerFormListItem['review_status'];
  limit?:          number;
}): Promise<LawyerFormListResponse> {
  try {
    const res = await axios.get<LawyerFormListResponse>('/lawyer/forms', { params });
    if (res.data && Array.isArray(res.data.items)) return res.data;
  } catch (e) { if (!isMissing(e)) throw e; }

  // ── Local demo mode ───────────────────────────────────────────────
  // Backend `/lawyer/forms` isn't shipped yet (see BACKEND_FORMS_PENDING.md).
  // To keep the flow testable end-to-end from one browser, we synthesise
  // the queue from any locally-saved I-9 / I-983 drafts. Once the backend
  // ships the real endpoint, the try-branch above returns first and this
  // block is dead code.
  return buildLocalDemoList(params);
}

/** Build a fake list from localStorage drafts so the lawyer's queue shows
 *  whatever the employee/HR has filled in this browser. Anything with
 *  status='submitted' is treated as "waiting on review"; drafts show up
 *  as "In review" too so the lawyer can peek before HR finishes. */
function buildLocalDemoList(params?: {
  employer_id?: string; visa_type_code?: string; status?: LawyerFormListItem['review_status'];
}): LawyerFormListResponse {
  // Read both stores up-front so we can cross-reference (e.g. use the
  // I-983's employer_name to label an otherwise-anonymous I-9 record in
  // the same application).
  const i9Records   = listLocalI9Drafts();
  const i983Records = listLocalI983Drafts();

  // Build a per-application context: best available employee name,
  // employer name, etc., merged across the two form types.
  const contextByApp = new Map<string, { employeeName: string; employerName: string }>();
  const remember = (appId: string, name: string, employer: string) => {
    const cur = contextByApp.get(appId) ?? { employeeName: '', employerName: '' };
    if (name    && !cur.employeeName)  cur.employeeName  = name;
    if (employer && !cur.employerName) cur.employerName = employer;
    contextByApp.set(appId, cur);
  };
  for (const r of i9Records) {
    if (!r?.application_id) continue;
    const nm = [r.data?.first_name, r.data?.last_name].filter(Boolean).join(' ');
    remember(r.application_id, nm, '');
  }
  for (const r of i983Records) {
    if (!r?.application_id) continue;
    const nm = [r.data?.student_given_name, r.data?.student_surname].filter(Boolean).join(' ');
    remember(r.application_id, nm, r.data?.employer_name ?? '');
  }

  const items: LawyerFormListItem[] = [];
  const push = (rec: I9FormRecord | I983FormRecord, form_type: 'i9' | 'i983') => {
    if (!rec || !rec.application_id) return;
    const review_status: LawyerFormListItem['review_status'] =
      rec.review_status ?? (rec.status === 'submitted' ? 'submitted' : 'draft');
    if (review_status === 'draft') return;

    const ctx = contextByApp.get(rec.application_id) ?? { employeeName: '', employerName: '' };
    items.push({
      form_type,
      form_id:            rec.id,
      application_id:     rec.application_id,
      case_reference:     `#${(rec.application_id || '').slice(0, 8).toUpperCase()}`,
      review_status,
      employee: {
        user_id:   rec.employee_id,
        full_name: ctx.employeeName || 'Employee',
        email:     '',
      },
      employer: {
        id:       'local',
        name:     ctx.employerName || 'Local demo employer',
        logo_url: null,
      },
      visa_type: null,
      employee_submitted_at: rec.status === 'submitted' ? rec.updated_at : null,
      hr_submitted_at:       null,
      last_reviewed_at:      null,
    });
  };
  i9Records.forEach((r) => push(r, 'i9'));
  i983Records.forEach((r) => push(r, 'i983'));

  // Filter
  let filtered = items;
  if (params?.employer_id)    filtered = filtered.filter((i) => i.employer.id === params.employer_id);
  if (params?.visa_type_code) filtered = filtered.filter((i) => i.visa_type?.code === params.visa_type_code);
  if (params?.status)         filtered = filtered.filter((i) => i.review_status === params.status);

  // Collapse detailed backend states into the 3-bucket badge tally the
  // landing page's summary tiles render (submitted / needs_corrections /
  // approved). Everything else (draft, archived) is ignored.
  const counts_by_status: Record<'submitted' | 'needs_corrections' | 'approved', number> = {
    submitted: 0, needs_corrections: 0, approved: 0,
  };
  for (const i of filtered) {
    const s = i.review_status;
    if (s === 'submitted' || s === 'hr_approved') counts_by_status.submitted += 1;
    else if (s === 'needs_corrections') counts_by_status.needs_corrections += 1;
    else if (s === 'approved' || s === 'completed') counts_by_status.approved += 1;
    // draft → not counted
  }
  const employers = Array.from(
    new Map(filtered.map((i) => [i.employer.id, { id: i.employer.id, name: i.employer.name }])).values(),
  );
  return { items: filtered, total: filtered.length, counts_by_status, employers };
}

/* ── Fetch one ────────────────────────────────────────────────────── */

export async function getLawyerI9(formId: string): Promise<I9FormRecord> {
  // Always resolve the local record first — this is what employee/HR
  // actually wrote through the split editors. If backend returns a
  // record with empty/missing data we still want to render the local
  // values on the lawyer review page.
  const local = await loadOrCreateI9(formId);
  try {
    const res = await axios.get<I9FormRecord>(`/lawyer/forms/i9/${formId}`);
    if (res.data?.id) {
      return { ...res.data, data: { ...local.data, ...(res.data.data ?? {}) } };
    }
  } catch (e) { if (!isMissing(e)) throw e; }
  return local;
}

export async function getLawyerI983(formId: string): Promise<I983FormRecord> {
  const local = await loadOrCreateI983(formId);
  try {
    const res = await axios.get<I983FormRecord>(`/lawyer/forms/i983/${formId}`);
    if (res.data?.id) {
      return { ...res.data, data: { ...local.data, ...(res.data.data ?? {}) } };
    }
  } catch (e) { if (!isMissing(e)) throw e; }
  return local;
}

/* ── Approve ──────────────────────────────────────────────────────── */

/** Resolve a record whose `id` or `application_id` equals the given key.
 *  The lawyer editor stores `record.id` (backend UUID) but the local
 *  drafts are keyed by `application_id` — we must accept either. */
function resolveI9Local(key: string): I9FormRecord | null {
  return listLocalI9Drafts().find((r) => r.id === key || r.application_id === key) ?? null;
}
function resolveI983Local(key: string): I983FormRecord | null {
  return listLocalI983Drafts().find((r) => r.id === key || r.application_id === key) ?? null;
}

export async function approveForm(type: FormType, formId: string): Promise<I9FormRecord | I983FormRecord> {
  try {
    const res = await axios.post(`/lawyer/forms/${type}/${formId}/approve`, {});
    if (res.data?.id) return res.data;
  } catch (e) { if (!isMissing(e)) throw e; }
  // Local optimistic fallback — mirror the backend's state change on
  // the SAME record the lawyer opened (match by id OR application_id).
  if (type === 'i983') {
    const local = resolveI983Local(formId) ?? await loadOrCreateI983(formId);
    const next = { ...local, review_status: 'approved' as const, open_corrections: [] };
    saveLocalI983Draft(next);
    return next;
  }
  const local9 = resolveI9Local(formId) ?? await loadOrCreateI9(formId);
  const next9 = { ...local9, review_status: 'approved' as const, open_corrections: [] };
  saveLocalI9Draft(next9);
  return next9;
}

/* ── Request corrections ──────────────────────────────────────────── */

export interface RequestCorrectionsPayload {
  target: 'employee' | 'hr';
  note:   string;
  fields?: string[];
}

export async function requestCorrections(
  type: FormType,
  formId: string,
  payload: RequestCorrectionsPayload,
): Promise<I9FormRecord | I983FormRecord> {
  try {
    const res = await axios.post(`/lawyer/forms/${type}/${formId}/request-corrections`, payload);
    if (res.data?.id) return res.data;
  } catch (e) { if (!isMissing(e)) throw e; }
  // Local fallback — attach a fake correction to the local draft.
  const localCorrection = {
    id:            `local-${Date.now()}`,
    target:        payload.target,
    fields:        payload.fields ?? [],
    note:          payload.note,
    requested_by:  'attorney-local',
    created_at:    new Date().toISOString(),
    resolved_at:   null,
  };
  if (type === 'i983') {
    // Match by id OR application_id so we mutate the SAME record the
    // lawyer is reviewing — not a new phantom keyed under the UUID.
    const local = resolveI983Local(formId) ?? await loadOrCreateI983(formId);
    const next = {
      ...local,
      review_status: 'needs_corrections' as const,
      status: 'draft' as const,
      open_corrections: [...(local.open_corrections ?? []), localCorrection],
    };
    saveLocalI983Draft(next);
    return next;
  }
  const local9 = resolveI9Local(formId) ?? await loadOrCreateI9(formId);
  const next9 = {
    ...local9,
    review_status: 'needs_corrections' as const,
    status: 'draft' as const,
    open_corrections: [...(local9.open_corrections ?? []), localCorrection],
  };
  // Persist so the employee/HR dashboards' Action Items pick it up on
  // their next render (they read localStorage form drafts as fallback).
  saveLocalI9Draft(next9);
  return next9;
}

/* ── Corrections ──────────────────────────────────────────────────── */

/** Fetch open corrections for a form. Corrections aren't embedded on
 *  the form response by design — the backend serves them via this
 *  separate endpoint so list endpoints stay cheap. Every editor calls
 *  this alongside its loadOrCreate on mount so the amber banner + field
 *  unlock behavior work. */
export async function listFormCorrections(
  type: FormType,
  formId: string,
): Promise<import('../../types/employee/i9.types').FormCorrection[]> {
  try {
    const res = await axios.get<{ items?: import('../../types/employee/i9.types').FormCorrection[] } | import('../../types/employee/i9.types').FormCorrection[]>(
      `/forms/${type}/${formId}/corrections`,
    );
    const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
    return list;
  } catch (e) { if (!isMissing(e)) throw e; }
  return [];
}

/* ── Version history ──────────────────────────────────────────────── */

export async function listFormVersions(type: FormType, formId: string): Promise<FormVersionItem[]> {
  try {
    const res = await axios.get<{ items: FormVersionItem[] }>(`/lawyer/forms/${type}/${formId}/versions`);
    if (Array.isArray(res.data?.items)) return res.data.items;
  } catch (e) { if (!isMissing(e)) throw e; }
  return [];
}
