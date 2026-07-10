// src/api/lawyer/dashboard.api.ts
//
// Backed by three Swagger-documented endpoints:
//   GET /api/v1/lawyer-dashboard              — full aggregated payload (mount-time)
//   GET /api/v1/lawyer-dashboard/kpi-cards    — lightweight polling every 60s
//   GET /api/v1/lawyer-dashboard/recent-cases — paginated View All modal
//
// Today's Schedule + Critical Deadlines panels come from the calendar module
// (GET /api/v1/calendar/agenda + /calendar/deadlines) — see fetchAgenda /
// fetchDeadlines helpers below.

import axios from '../axios';
import type {
  LawyerDashboardResponse,
  KpiCards,
  RecentCasesResponse,
  AgendaItem,
  DeadlineItem,
} from '../../types/lawyer/dashboard.types';

/* ── Full aggregated dashboard payload — call once on mount ──────────── */
export async function getDashboard(): Promise<LawyerDashboardResponse> {
  const res = await axios.get<LawyerDashboardResponse>('/lawyer-dashboard');
  return res.data;
}

/* ── KPI cards only — poll every 60s if real-time counts are needed ──── */
export async function getKpiCards(): Promise<KpiCards> {
  const res = await axios.get<KpiCards>('/lawyer-dashboard/kpi-cards');
  return res.data;
}

/* ── Paginated recent cases — "View All" modal / drill-down ──────────── */
export async function getRecentCases(
  limit  = 20,
  offset = 0,
): Promise<RecentCasesResponse> {
  const res = await axios.get<RecentCasesResponse>(
    '/lawyer-dashboard/recent-cases',
    { params: { limit, offset } },
  );
  return res.data;
}

/* ── Today's agenda (calendar module) ────────────────────────────────── */
export async function getTodaysAgenda(): Promise<AgendaItem[]> {
  try {
    const res = await axios.get<AgendaItem[] | { items: AgendaItem[] }>(
      '/calendar/agenda',
    );
    // Accept both bare array and { items: [...] } shapes.
    return Array.isArray(res.data) ? res.data : (res.data.items ?? []);
  } catch {
    return [];
  }
}

/* ── Critical deadlines (calendar module) ────────────────────────────── */
export async function getCriticalDeadlines(): Promise<DeadlineItem[]> {
  try {
    const res = await axios.get<DeadlineItem[] | { items: DeadlineItem[] }>(
      '/calendar/deadlines',
    );
    return Array.isArray(res.data) ? res.data : (res.data.items ?? []);
  } catch {
    return [];
  }
}

/* ── Bundled export ──────────────────────────────────────────────────── */
export const dashboardApi = {
  getDashboard,
  getKpiCards,
  getRecentCases,
  getTodaysAgenda,
  getCriticalDeadlines,
};