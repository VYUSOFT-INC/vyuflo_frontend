// src/api/lawyer/intake.api.ts
//
// All Client Intake endpoints (lawyer side).
// Base URL is set in src/api/axios.ts (e.g. /api/v1).
// Note: All endpoints in this file use JWT (axios attaches token).
// The /intake/by-token/{token} client-side endpoint is intentionally NOT here —
// it should be called from a public route with a separate, unauthed axios.

import axios from '../axios';

import type {
  IntakeSession,
  IntakeData,
  VisaStatusOptionsResponse,
  CreateSessionPayload,
  GenerateLinkResponse,
  SaveDraftResponse,
  SubmitResponse,
  SaveIntakeDataParams,
  SaveIntakeDataPayload,
  AssignedApplication,
  IntakeStatus,
  VerifyDisclosuresPayload,
} from '../../types/lawyer/intake.types';

/* ── Visa status dropdown options ───────────────────────────────────── */
export async function getVisaStatusOptions(): Promise<VisaStatusOptionsResponse> {
  const res = await axios.get<VisaStatusOptionsResponse>('/intake/visa-status-options');
  return res.data;
}

/* ── Lawyer worklist — applications assigned to logged-in attorney ──── */
export async function listAssignedApplications(
  statusFilter?: IntakeStatus,
): Promise<AssignedApplication[]> {
  const res = await axios.get<AssignedApplication[]>('/lawyer/applications', {
    params: statusFilter ? { status_filter: statusFilter } : undefined,
  });
  return res.data;
}

/* ── Session CRUD ───────────────────────────────────────────────────── */
export async function createIntakeSession(
  payload: CreateSessionPayload,
): Promise<IntakeSession> {
  const res = await axios.post<IntakeSession>('/intake/sessions', payload);
  return res.data;
}

export async function getIntakeSession(sessionId: string): Promise<IntakeSession> {
  const res = await axios.get<IntakeSession>(`/intake/sessions/${sessionId}`);
  return res.data;
}

/* ── Generate / rotate client link (Step 3 button) ──────────────────── */
export async function generateClientLink(
  sessionId: string,
): Promise<GenerateLinkResponse> {
  const res = await axios.post<GenerateLinkResponse>(
    `/intake/sessions/${sessionId}/generate-link`,
  );
  return res.data;
}

/* ── Save Draft (top-right button) ──────────────────────────────────── */
export async function saveDraft(sessionId: string): Promise<SaveDraftResponse> {
  const res = await axios.post<SaveDraftResponse>(
    `/intake/sessions/${sessionId}/save-draft`,
  );
  return res.data;
}

/* ── Final submit (Step 5) ──────────────────────────────────────────── */
export async function submitIntake(sessionId: string): Promise<SubmitResponse> {
  const res = await axios.post<SubmitResponse>(`/intake/sessions/${sessionId}/submit`);
  return res.data;
}

/* ── Load intake data (called on each step mount) ──────────────────── */
export async function getIntakeData(sessionId: string): Promise<IntakeData | null> {
  // 204 No Content means nothing saved yet.
  const res = await axios.get<IntakeData>(`/intake/sessions/${sessionId}/data`, {
    validateStatus: (s) => s === 200 || s === 204,
  });
  if (res.status === 204) return null;
  return res.data;
}

/* ── Save intake data (auto-save, Save Draft, or Continue) ─────────── */
export async function saveIntakeData(
  sessionId: string,
  data: SaveIntakeDataPayload,
  params: SaveIntakeDataParams = {},
): Promise<IntakeData> {
  const res = await axios.put<IntakeData>(
    `/intake/sessions/${sessionId}/data`,
    data,
    { params },
  );
  return res.data;
}

/* ── Verify disclosures (Phase 2 — Step 3 "Mark as Verified" action) ──
 * Uses the existing PUT /intake/sessions/{id}/data endpoint with audit
 * fields in the payload. Backend persists to IntakeImmigrationHistory.
 * ─────────────────────────────────────────────────────────────────── */
export async function verifyDisclosures(
  sessionId: string,
  payload: VerifyDisclosuresPayload = {},
): Promise<IntakeData> {
  const body: SaveIntakeDataPayload = {
    disclosures_verified_at:
      payload.disclosures_verified_at || new Date().toISOString(),
    disclosures_verified_by_attorney_id:
      payload.disclosures_verified_by_attorney_id,
  };
  const res = await axios.put<IntakeData>(
    `/intake/sessions/${sessionId}/data`,
    body,
  );
  return res.data;
}

/* ── Aggregated client profile (legacy — kept for backward compat) ───── */
export async function getClientProfile(clientId: string) {
  const res = await axios.get(`/clients/${clientId}/profile`);
  return res.data;
}

/* ── Lawyer review — ACCEPT the submitted intake ─────────────────────
 * POST /intake/sessions/{id}/accept
 * Backend converts intake into active case, sets Application.
 * intake_accepted_at, emits "Your intake was accepted" notification
 * to the employee. Row disappears from the Client Intake queue.
 * ─────────────────────────────────────────────────────────────────── */
export async function acceptIntake(
  sessionId: string,
  note?: string,
): Promise<IntakeReviewDecisionResponse> {
  const res = await axios.post<IntakeReviewDecisionResponse>(
    `/intake/sessions/${sessionId}/accept`,
    { note: note?.trim() || null },
  );
  return res.data;
}

/* ── Lawyer review — REQUEST CHANGES (send whole form back) ──────────
 * POST /intake/sessions/{id}/request-changes
 * Backend resets is_submitted, clears all step_*_completed flags,
 * pins current_step=1, increments revision_count, and emits
 * "Your intake needs corrections" notification (priority=high) to
 * the employee with the correction_note as the body.
 * ─────────────────────────────────────────────────────────────────── */
export async function requestIntakeChanges(
  sessionId: string,
  correctionNote: string,
): Promise<IntakeReviewDecisionResponse> {
  const res = await axios.post<IntakeReviewDecisionResponse>(
    `/intake/sessions/${sessionId}/request-changes`,
    { correction_note: correctionNote },
  );
  return res.data;
}

/* Response type — matches IntakeReviewDecisionResponse in backend
 * app/schemas/attorney/intake.py. */
export interface IntakeReviewDecisionResponse {
  detail:              string;
  session_id:          string;
  application_id:      string;
  review_status:       'changes_requested' | 'accepted';
  reviewed_at:         string;
  revision_count:      number;
  intake_accepted_at?: string | null;
  case_pipeline_stage?: 'intake' | 'filed' | 'rfe' | 'decision' | null;
}

/* ── Bundled export — easier to mock in tests ───────────────────────── */
export const intakeApi = {
  getVisaStatusOptions,
  listAssignedApplications,
  createIntakeSession,
  getIntakeSession,
  generateClientLink,
  saveDraft,
  submitIntake,
  getIntakeData,
  saveIntakeData,
  verifyDisclosures,
  getClientProfile,
  acceptIntake,
  requestIntakeChanges,
};