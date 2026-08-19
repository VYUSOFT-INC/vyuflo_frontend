// src/api/employee/i983Form.api.ts
import axios from '../axios';
import type { I983FormData, I983FormRecord } from '../../types/employee/i983.types';
import { EMPTY_I983 } from '../../types/employee/i983.types';

const DRAFT_KEY = 'vyuflo:employee:i983-drafts:v1';

function readDrafts(): Record<string, I983FormRecord> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); } catch { return {}; }
}
function writeDrafts(d: Record<string, I983FormRecord>) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* quota */ } }
export function saveLocalDraft(r: I983FormRecord) { const all = readDrafts(); all[r.id] = { ...r, updated_at: new Date().toISOString() }; writeDrafts(all); }
export function removeLocalDraft(id: string) { const all = readDrafts(); delete all[id]; writeDrafts(all); }
export function listLocalDrafts(): I983FormRecord[] { return Object.values(readDrafts()); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMissing = (e: any) => !e?.response || [404, 405, 501].includes(e.response.status);

export async function loadOrCreateI983(applicationId: string): Promise<I983FormRecord> {
  try {
    const res = await axios.get<I983FormRecord[]>('/employee/forms/i983', { params: { application_id: applicationId } });
    const list = Array.isArray(res.data) ? res.data : [];
    if (list.length) return list[0];
  } catch (e) { if (!isMissing(e)) throw e; }

  const local = listLocalDrafts().find((d) => d.application_id === applicationId);
  if (local) return local;

  const now = new Date().toISOString();
  return {
    id: `draft-i983-${applicationId}`, application_id: applicationId, employee_id: '',
    status: 'draft', data: { ...EMPTY_I983 }, created_at: now, updated_at: now, submitted_at: null,
  };
}

export async function saveI983Draft(r: I983FormRecord, data: I983FormData): Promise<I983FormRecord> {
  const next: I983FormRecord = { ...r, data, status: 'draft', updated_at: new Date().toISOString() };
  saveLocalDraft(next);
  try {
    if (r.id.startsWith('draft-')) {
      const res = await axios.post<I983FormRecord>('/employee/forms/i983', { application_id: r.application_id, data });
      removeLocalDraft(r.id); saveLocalDraft(res.data); return res.data;
    }
    const res = await axios.put<I983FormRecord>(`/employee/forms/i983/${r.id}`, { data });
    saveLocalDraft(res.data); return res.data;
  } catch (e) { if (!isMissing(e)) throw e; return next; }
}

export async function submitI983(r: I983FormRecord, data: I983FormData): Promise<I983FormRecord> {
  const submittedAt = new Date().toISOString();
  const next: I983FormRecord = { ...r, data, status: 'submitted', submitted_at: submittedAt, updated_at: submittedAt };
  try {
    if (r.id.startsWith('draft-')) {
      const created = await axios.post<I983FormRecord>('/employee/forms/i983', { application_id: r.application_id, data });
      r = created.data;
    } else {
      await axios.put(`/employee/forms/i983/${r.id}`, { data });
    }
    const res = await axios.post<I983FormRecord>(`/employee/forms/i983/${r.id}/submit`, {});
    removeLocalDraft(r.id); saveLocalDraft(res.data); return res.data;
  } catch (e) { if (!isMissing(e)) throw e; saveLocalDraft(next); return next; }
}
