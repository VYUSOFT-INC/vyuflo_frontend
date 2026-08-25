// src/api/employee/i983Form.api.ts
//
// Persistence for the I-983 form.
//
// Drafts are keyed in localStorage by **application_id**, not by record.id.
// That keeps the record stable when the backend flips it from a client
// draft ("draft-i983-<app>") to a real UUID — both employee and HR editors
// look the record up by the URL's application_id, and both see the same
// entry regardless of who saved it last.

import axios from '../axios';
import type { I983FormData, I983FormRecord } from '../../types/employee/i983.types';
import { EMPTY_I983 } from '../../types/employee/i983.types';

const DRAFT_KEY = 'vyuflo:employee:i983-drafts:v2';   // v2 → keyed by application_id
const LEGACY_KEY = 'vyuflo:employee:i983-drafts:v1'; // one-time migration source

type DraftMap = Record<string /* application_id */, I983FormRecord>;

// ── low-level draft storage ──────────────────────────────────────────

function readDrafts(): DraftMap {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate v1 (keyed by record.id) → v2 (keyed by application_id).
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return {};
    const legacyMap: Record<string, I983FormRecord> = JSON.parse(legacy);
    const migrated: DraftMap = {};
    for (const rec of Object.values(legacyMap)) {
      if (rec && typeof rec === 'object' && rec.application_id) migrated[rec.application_id] = rec;
    }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(migrated)); } catch { /* quota */ }
    return migrated;
  } catch { return {}; }
}

function writeDrafts(d: DraftMap) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* quota */ }
}

export function saveLocalDraft(r: I983FormRecord) {
  if (!r || !r.application_id) return;
  const all = readDrafts();
  all[r.application_id] = { ...r, updated_at: new Date().toISOString() };
  writeDrafts(all);
}

export function removeLocalDraft(applicationId: string) {
  if (!applicationId) return;
  const all = readDrafts();
  delete all[applicationId];
  writeDrafts(all);
}

export function listLocalDrafts(): I983FormRecord[] {
  return Object.values(readDrafts());
}

// ── helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMissing = (e: any) =>
  !e?.response || [401, 403, 404, 405, 409, 422, 500, 501, 502, 503, 504].includes(e.response.status);

/** True only if the backend gave us back a real record (has string id). */
function isValidBackendRecord(x: unknown): x is I983FormRecord {
  return !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string';
}

/**
 * Normalise a backend record so the fields we depend on are always
 * present. In particular the backend can return a partial `data` object;
 * we merge it on top of the client's latest data so nothing the user
 * typed is silently dropped by an ignorant server.
 */
function mergeIntoLocal(
  applicationId: string,
  clientData: I983FormData,
  backend: I983FormRecord,
): I983FormRecord {
  return {
    ...backend,
    application_id: backend.application_id || applicationId,
    data: { ...EMPTY_I983, ...clientData, ...(backend.data ?? {}) },
  };
}

// ── public API ───────────────────────────────────────────────────────

export async function loadOrCreateI983(applicationId: string): Promise<I983FormRecord> {
  // 1. Try backend
  try {
    const res = await axios.get<I983FormRecord[]>('/employee/forms/i983', { params: { application_id: applicationId } });
    const list = Array.isArray(res.data) ? res.data : [];
    if (list.length && isValidBackendRecord(list[0])) {
      const rec = list[0];
      // Merge with any local draft — the local copy may have unsaved edits
      // if the last save round-tripped through a broken endpoint.
      const local = readDrafts()[applicationId];
      const merged: I983FormRecord = {
        ...rec,
        application_id: rec.application_id || applicationId,
        data: { ...EMPTY_I983, ...(rec.data ?? {}), ...(local?.data ?? {}) },
      };
      saveLocalDraft(merged);
      return merged;
    }
  } catch (e) { if (!isMissing(e)) throw e; }

  // 2. Local fallback
  const local = readDrafts()[applicationId];
  if (local) {
    // Defensive merge — older schema versions may miss newer fields.
    return {
      ...local,
      application_id: local.application_id || applicationId,
      data: { ...EMPTY_I983, ...(local.data ?? {}) },
    };
  }

  // 3. Fresh blank
  const now = new Date().toISOString();
  return {
    id: `draft-i983-${applicationId}`,
    application_id: applicationId,
    employee_id: '',
    status: 'draft',
    data: { ...EMPTY_I983 },
    created_at: now,
    updated_at: now,
    submitted_at: null,
  };
}

export async function saveI983Draft(r: I983FormRecord, data: I983FormData): Promise<I983FormRecord> {
  // Always persist local FIRST so we never lose the user's edits, no
  // matter what the backend does.
  const next: I983FormRecord = {
    ...r,
    application_id: r.application_id,
    data,
    status: 'draft',
    updated_at: new Date().toISOString(),
  };
  saveLocalDraft(next);

  try {
    let res;
    if (r.id.startsWith('draft-')) {
      res = await axios.post<I983FormRecord>('/employee/forms/i983', { application_id: r.application_id, data });
    } else {
      res = await axios.put<I983FormRecord>(`/employee/forms/i983/${r.id}`, { data });
    }
    if (isValidBackendRecord(res.data)) {
      const merged = mergeIntoLocal(r.application_id, data, res.data);
      saveLocalDraft(merged);
      return merged;
    }
    // Backend returned junk — keep local.
    return next;
  } catch (e) {
    if (!isMissing(e)) throw e;
    return next;
  }
}

export async function submitI983(r: I983FormRecord, data: I983FormData): Promise<I983FormRecord> {
  const submittedAt = new Date().toISOString();
  const next: I983FormRecord = {
    ...r,
    application_id: r.application_id,
    data,
    status: 'submitted',
    submitted_at: submittedAt,
    updated_at: submittedAt,
  };
  saveLocalDraft(next);

  try {
    let working: I983FormRecord = r;
    if (r.id.startsWith('draft-')) {
      const created = await axios.post<I983FormRecord>('/employee/forms/i983', { application_id: r.application_id, data });
      if (isValidBackendRecord(created.data)) working = created.data;
    } else {
      await axios.put(`/employee/forms/i983/${r.id}`, { data });
    }
    const res = await axios.post<I983FormRecord>(`/employee/forms/i983/${working.id}/submit`, {});
    if (isValidBackendRecord(res.data)) {
      const merged = mergeIntoLocal(r.application_id, data, res.data);
      merged.status = 'submitted';
      merged.submitted_at = res.data.submitted_at || submittedAt;
      saveLocalDraft(merged);
      return merged;
    }
    return next;
  } catch (e) {
    if (!isMissing(e)) throw e;
    return next;
  }
}
