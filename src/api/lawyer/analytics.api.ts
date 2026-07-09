// src/api/lawyer/analytics.api.ts
//
// Lawyer Analytics endpoints — Screen 23.

import axios from '../axios';

import type {
  AnalyticsFilters,
  KpiCardsResponse,
  CaseStatusResponse,
  CasesByVisaResponse,
  CaseloadOverTimeResponse,
  UpcomingActionsResponse,
} from '../../types/lawyer/analytics.types';

/* ── Build common query params ──────────────────────────────────────── */
function periodParams(f: AnalyticsFilters): Record<string, string> {
  const params: Record<string, string> = { period: f.period };
  if (f.period === 'custom') {
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to)   params.date_to   = f.date_to;
  }
  return params;
}

/* ── 1. KPI cards ────────────────────────────────────────────────────── */
export async function getKpiCards(f: AnalyticsFilters): Promise<KpiCardsResponse> {
  const res = await axios.get<KpiCardsResponse>('/analytics/kpi-cards', { params: periodParams(f) });
  return res.data;
}

/* ── 2. Case Status Breakdown ───────────────────────────────────────── */
export async function getCaseStatus(f: AnalyticsFilters): Promise<CaseStatusResponse> {
  const res = await axios.get<CaseStatusResponse>('/analytics/case-status', { params: periodParams(f) });
  return res.data;
}

/* ── 3. Cases by Visa Type ──────────────────────────────────────────── */
export async function getCasesByVisa(f: AnalyticsFilters): Promise<CasesByVisaResponse> {
  const res = await axios.get<CasesByVisaResponse>('/analytics/cases-by-visa', { params: periodParams(f) });
  return res.data;
}

/* ── 4. Caseload Over Time + Success Rate ───────────────────────────── */
export async function getCaseloadOverTime(f: AnalyticsFilters): Promise<CaseloadOverTimeResponse> {
  const res = await axios.get<CaseloadOverTimeResponse>('/analytics/caseload-over-time', { params: periodParams(f) });
  return res.data;
}

/* ── 5. Upcoming Actions Required ───────────────────────────────────── */
export async function getUpcomingActions(limit = 10, offset = 0): Promise<UpcomingActionsResponse> {
  const res = await axios.get<UpcomingActionsResponse>('/analytics/upcoming-actions', {
    params: { limit, offset },
  });
  return res.data;
}

/* ── Bundled export ─────────────────────────────────────────────────── */
export const analyticsApi = {
  getKpiCards,
  getCaseStatus,
  getCasesByVisa,
  getCaseloadOverTime,
  getUpcomingActions,
};