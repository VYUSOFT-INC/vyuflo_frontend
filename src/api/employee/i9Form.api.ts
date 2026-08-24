// src/api/employee/i9Form.api.ts
//
// API wrapper for the employee-side I-9 form.
// Endpoints (per BACKEND_I9_FORM.md spec):
//   GET  /employee/forms/i9                      — list this employee's forms
//   GET  /employee/forms/i9/{form_id}            — load one
//   POST /employee/forms/i9                      — create new (application_id in body)
//   PUT  /employee/forms/i9/{form_id}            — save draft (partial data OK)
//   POST /employee/forms/i9/{form_id}/submit     — final submit (locks the form)
//
// Every call falls back to localStorage if backend returns 404/501/network,
// so the flow keeps working before backend deploys.

import axios from '../axios';
import type { I9FormData, I9FormRecord } from '../../types/employee/i9.types';
import { EMPTY_I9 } from '../../types/employee/i9.types';

const DRAFT_KEY = 'vyuflo:employee:i9-drafts:v1';

// ── LocalStorage draft store ─────────────────────────────────────────

function readDrafts(): Record<string, I9FormRecord> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function writeDrafts(drafts: Record<string, I9FormRecord>): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch { /* quota */ }
}

/** Fetch a draft by form_id (or the "current" one for an application). */
export function readLocalDraft(formId: string): I9FormRecord | null {
  return readDrafts()[formId] ?? null;
}

/** Save/overwrite a draft. */
export function saveLocalDraft(record: I9FormRecord): void {
  const drafts = readDrafts();
  drafts[record.id] = { ...record, updated_at: new Date().toISOString() };
  writeDrafts(drafts);
}

/** Remove local copy — call after successful backend submit. */
export function removeLocalDraft(formId: string): void {
  const drafts = readDrafts();
  delete drafts[formId];
  writeDrafts(drafts);
}

/** List all local drafts (for "My Forms" page fallback). */
export function listLocalDrafts(): I9FormRecord[] {
  return Object.values(readDrafts());
}

// ── Backend calls with fallback ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMissingEndpoint = (e: any): boolean => {
  if (!e?.response) return true;
  return [404, 405, 501].includes(e.response.status);
};

/** Fetch existing form for this application, or return a blank draft. */
export async function loadOrCreateI9(applicationId: string): Promise<I9FormRecord> {
  // 1. Try backend
  try {
    const res = await axios.get<I9FormRecord[]>('/employee/forms/i9', {
      params: { application_id: applicationId },
    });
    const list = Array.isArray(res.data) ? res.data : [];
    if (list.length > 0) return list[0];
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
  }

  // 2. Try local draft
  const drafts = listLocalDrafts().filter((d) => d.application_id === applicationId);
  if (drafts.length > 0) return drafts[0];

  // 3. Fresh blank draft
  const now = new Date().toISOString();
  return {
    id:             `draft-i9-${applicationId}`,
    application_id: applicationId,
    employee_id:    '',
    status:         'draft',
    data:           { ...EMPTY_I9 },
    created_at:     now,
    updated_at:     now,
    submitted_at:   null,
  };
}

/** Save current data as draft (backend + local mirror). */
export async function saveI9Draft(record: I9FormRecord, data: I9FormData): Promise<I9FormRecord> {
  const nextRecord: I9FormRecord = { ...record, data, status: 'draft', updated_at: new Date().toISOString() };

  // Always save locally first (instant, no wait)
  saveLocalDraft(nextRecord);

  // Try backend
  try {
    if (record.id.startsWith('draft-')) {
      // POST new
      const res = await axios.post<I9FormRecord>('/employee/forms/i9', {
        application_id: record.application_id,
        data,
      });
      // Backend gave us a real id — swap local draft under new id
      removeLocalDraft(record.id);
      saveLocalDraft(res.data);
      return res.data;
    } else {
      const res = await axios.put<I9FormRecord>(`/employee/forms/i9/${record.id}`, { data });
      saveLocalDraft(res.data);
      return res.data;
    }
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    // Backend down — local draft already saved above
    return nextRecord;
  }
}

/** Final submit — locks the form. */
export async function submitI9(record: I9FormRecord, data: I9FormData): Promise<I9FormRecord> {
  const submittedAt = new Date().toISOString();
  const nextRecord: I9FormRecord = {
    ...record, data, status: 'submitted',
    submitted_at: submittedAt, updated_at: submittedAt,
  };

  // Try backend
  try {
    // Ensure latest data is saved first
    if (record.id.startsWith('draft-')) {
      const created = await axios.post<I9FormRecord>('/employee/forms/i9', {
        application_id: record.application_id,
        data,
      });
      record = created.data;
    } else {
      await axios.put(`/employee/forms/i9/${record.id}`, { data });
    }
    const res = await axios.post<I9FormRecord>(`/employee/forms/i9/${record.id}/submit`, {});
    // Clear local draft after backend accepts
    removeLocalDraft(record.id);
    saveLocalDraft(res.data);
    return res.data;
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    // Backend down — mark local as submitted so UI reflects it
    saveLocalDraft(nextRecord);
    return nextRecord;
  }
}
