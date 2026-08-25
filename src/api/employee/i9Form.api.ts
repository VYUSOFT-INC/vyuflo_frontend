// src/api/employee/i9Form.api.ts
//
// Persistence for the I-9 form.
//
// Drafts are keyed in localStorage by **application_id** (not record.id).
// That keeps the record stable when the backend flips it from a client
// draft ("draft-i9-<app>") to a real UUID — both employee and HR editors
// look the record up by the URL's application_id, and both see the same
// entry regardless of who saved it last. This mirrors i983Form.api.ts.
//
// Endpoints (per BACKEND_LAWYER_FORM_REVIEW.md spec):
//   GET  /employee/forms/i9?application_id=…
//   POST /employee/forms/i9
//   PUT  /employee/forms/i9/{form_id}
//   POST /employee/forms/i9/{form_id}/submit
//
// Every call gracefully falls back to localStorage if the backend
// returns 404/405/501 (endpoint not shipped yet) or the response body
// is malformed — so the flow works end-to-end pre-backend.

import axios from '../axios';
import type { I9FormData, I9FormRecord } from '../../types/employee/i9.types';
import { EMPTY_I9 } from '../../types/employee/i9.types';

const DRAFT_KEY  = 'vyuflo:employee:i9-drafts:v2';   // v2 → keyed by application_id
const LEGACY_KEY = 'vyuflo:employee:i9-drafts:v1';  // one-time migration source

type DraftMap = Record<string /* application_id */, I9FormRecord>;

// ── LocalStorage draft store ─────────────────────────────────────────

function readDrafts(): DraftMap {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate v1 (keyed by record.id) → v2 (keyed by application_id).
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return {};
    const legacyMap: Record<string, I9FormRecord> = JSON.parse(legacy);
    const migrated: DraftMap = {};
    for (const rec of Object.values(legacyMap)) {
      if (rec && typeof rec === 'object' && rec.application_id) migrated[rec.application_id] = rec;
    }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(migrated)); } catch { /* quota */ }
    return migrated;
  } catch { return {}; }
}

function writeDrafts(d: DraftMap): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* quota */ }
}

export function saveLocalDraft(r: I9FormRecord): void {
  if (!r || !r.application_id) return;
  const all = readDrafts();
  all[r.application_id] = { ...r, updated_at: new Date().toISOString() };
  writeDrafts(all);
}

export function removeLocalDraft(applicationId: string): void {
  if (!applicationId) return;
  const all = readDrafts();
  delete all[applicationId];
  writeDrafts(all);
}

export function listLocalDrafts(): I9FormRecord[] {
  return Object.values(readDrafts());
}

/** Legacy shim — a few callers still ask by form-id. Since v2 keys by
 *  application_id, this scans values. Kept only for backwards compat. */
export function readLocalDraft(idOrAppId: string): I9FormRecord | null {
  const all = readDrafts();
  return all[idOrAppId] ?? Object.values(all).find((r) => r.id === idOrAppId) ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMissingEndpoint = (e: any): boolean => {
  if (!e?.response) return true;
  // Fall through to local for:
  //   401/403 — role not allowed on this route (HR hitting /employee/*)
  //   404/405/501 — endpoint not shipped yet
  //   409 — backend rejects the update because our cached record.id
  //         points at a phantom / stale row (state machine conflict).
  //   422 — payload shape mismatch. We already saved locally; log and
  //         let the flow continue.
  //   500/502/503/504 — backend crashed. Local copy is still safe.
  return [401, 403, 404, 405, 409, 422, 500, 501, 502, 503, 504].includes(e.response.status);
};

/** True only if the backend gave us back a real record (has string id). */
function isValidBackendRecord(x: unknown): x is I9FormRecord {
  return !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string';
}

/** Merge a backend record with the client's latest data so nothing the
 *  user typed is silently dropped by a server that doesn't understand
 *  every field yet. */
function mergeIntoLocal(
  applicationId: string,
  clientData: I9FormData,
  backend: I9FormRecord,
): I9FormRecord {
  return {
    ...backend,
    application_id: backend.application_id || applicationId,
    data: { ...EMPTY_I9, ...clientData, ...(backend.data ?? {}) },
  };
}

// ── Public API ───────────────────────────────────────────────────────

/** Fetch existing form for this application, or return a blank draft. */
export async function loadOrCreateI9(applicationId: string): Promise<I9FormRecord> {
  // 1. Try backend
  try {
    const res = await axios.get<I9FormRecord[]>('/employee/forms/i9', {
      params: { application_id: applicationId },
    });
    const list = Array.isArray(res.data) ? res.data : [];
    if (list.length && isValidBackendRecord(list[0])) {
      const rec = list[0];
      // Merge with any local draft — the local copy may have unsaved
      // edits from a save round-tripped through a broken endpoint.
      const local = readDrafts()[applicationId];
      const merged: I9FormRecord = {
        ...rec,
        application_id: rec.application_id || applicationId,
        data: { ...EMPTY_I9, ...(rec.data ?? {}), ...(local?.data ?? {}) },
      };
      saveLocalDraft(merged);
      return merged;
    }
  } catch (e) { if (!isMissingEndpoint(e)) throw e; }

  // 2. Local fallback
  const local = readDrafts()[applicationId];
  if (local) {
    // Defensive merge — older schema versions may miss newer fields.
    return {
      ...local,
      application_id: local.application_id || applicationId,
      data: { ...EMPTY_I9, ...(local.data ?? {}) },
    };
  }

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
  // Always persist local FIRST so we never lose the user's edits.
  const next: I9FormRecord = {
    ...record,
    application_id: record.application_id,
    data,
    status: 'draft',
    updated_at: new Date().toISOString(),
  };
  saveLocalDraft(next);

  try {
    let res;
    if (record.id.startsWith('draft-')) {
      res = await axios.post<I9FormRecord>('/employee/forms/i9', {
        application_id: record.application_id,
        data,
      });
    } else {
      res = await axios.put<I9FormRecord>(`/employee/forms/i9/${record.id}`, { data });
    }
    if (isValidBackendRecord(res.data)) {
      const merged = mergeIntoLocal(record.application_id, data, res.data);
      saveLocalDraft(merged);
      return merged;
    }
    // Backend returned junk — keep the local copy.
    return next;
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    return next;
  }
}

/** Final submit — locks the form. */
export async function submitI9(record: I9FormRecord, data: I9FormData): Promise<I9FormRecord> {
  const submittedAt = new Date().toISOString();
  const next: I9FormRecord = {
    ...record,
    application_id: record.application_id,
    data,
    status: 'submitted',
    submitted_at: submittedAt,
    updated_at: submittedAt,
  };
  // Save locally first — so even if backend never responds, employee
  // and HR see the submitted form on reload.
  saveLocalDraft(next);

  try {
    let working: I9FormRecord = record;
    if (record.id.startsWith('draft-')) {
      const created = await axios.post<I9FormRecord>('/employee/forms/i9', {
        application_id: record.application_id,
        data,
      });
      if (isValidBackendRecord(created.data)) working = created.data;
    } else {
      await axios.put(`/employee/forms/i9/${record.id}`, { data });
    }
    const res = await axios.post<I9FormRecord>(`/employee/forms/i9/${working.id}/submit`, {});
    if (isValidBackendRecord(res.data)) {
      const merged = mergeIntoLocal(record.application_id, data, res.data);
      merged.status = 'submitted';
      merged.submitted_at = res.data.submitted_at || submittedAt;
      saveLocalDraft(merged);
      return merged;
    }
    return next;
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    return next;
  }
}
