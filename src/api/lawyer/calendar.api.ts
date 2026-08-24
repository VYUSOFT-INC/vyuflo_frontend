// src/api/lawyer/calendar.api.ts
//
// All Calendar endpoints — matches backend Swagger.
// Uses the shared axios instance (JWT attached by interceptor).

import axios from '../axios';

import type {
  CalendarView,
  EventListResponse,
  AgendaResponse,
  DeadlinesResponse,
  LinkedCasesResponse,
  EventDetail,
  CreateEventPayload,
  UpdateEventPayload,
} from '../../types/lawyer/calendar.types';

/* ── List events for a date range (Month / Week / Day view feed) ────── */
export async function listEvents(
  view:  CalendarView,
  start: string,         // YYYY-MM-DD
  end:   string,         // YYYY-MM-DD
): Promise<EventListResponse> {
  const res = await axios.get<EventListResponse>('/calendar/events', {
    params: { view, start, end },
  });
  return res.data;
}

/* ── Today's Agenda panel ───────────────────────────────────────────── */
export async function getAgenda(agendaDate?: string): Promise<AgendaResponse> {
  const res = await axios.get<AgendaResponse>('/calendar/agenda', {
    params: agendaDate ? { agenda_date: agendaDate } : undefined,
  });
  return res.data;
}

/* ── Critical Deadlines sidebar ─────────────────────────────────────── */
export async function getDeadlines(limit = 5): Promise<DeadlinesResponse> {
  const res = await axios.get<DeadlinesResponse>('/calendar/deadlines', {
    params: { limit },
  });
  return res.data;
}

/* ── Type-ahead: search assigned cases for "Linked Case" dropdown ───── */
export async function searchLinkedCases(q: string, limit = 10): Promise<LinkedCasesResponse> {
  const res = await axios.get<LinkedCasesResponse>('/calendar/cases/search', {
    params: { q, limit },
  });
  return res.data;
}

/* ── Single event details (Event Details Drawer) ────────────────────── */
export async function getEvent(eventId: string): Promise<EventDetail> {
  const res = await axios.get<EventDetail>(`/calendar/events/${eventId}`);
  return res.data;
}

/* ── Create new event (Save Event modal) ────────────────────────────── */
export async function createEvent(payload: CreateEventPayload): Promise<EventDetail> {
  const res = await axios.post<EventDetail>('/calendar/events', payload);
  return res.data;
}

/* ── Update event (Edit Details — PATCH partial) ────────────────────── */
export async function updateEvent(
  eventId: string,
  payload: UpdateEventPayload,
): Promise<EventDetail> {
  const res = await axios.patch<EventDetail>(`/calendar/events/${eventId}`, payload);
  return res.data;
}

/* ── Cancel event (soft delete — status='cancelled') ────────────────── */
export async function cancelEvent(eventId: string): Promise<string> {
  const res = await axios.delete<string>(`/calendar/events/${eventId}`);
  return res.data;
}

/* ── Bundled export ─────────────────────────────────────────────────── */
export const calendarApi = {
  listEvents,
  getAgenda,
  getDeadlines,
  searchLinkedCases,
  getEvent,
  createEvent,
  updateEvent,
  cancelEvent,
};