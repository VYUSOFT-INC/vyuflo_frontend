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

/* ═══════════════════════════════════════════════════════════════════════
   ATTORNEY AVAILABILITY (weekly working hours)
═══════════════════════════════════════════════════════════════════════ */

import type {
  AttorneyAvailabilityRow,
  SaveAvailabilityRequest,
} from '../../types/lawyer/calendar.types';

/** List the current attorney's weekly availability rules.
 *  Prefers /attorneys/me/availability (per BACKEND spec doc). Falls
 *  back to resolving the attorney profile id from /attorneys/me and
 *  hitting /attorneys/{id}/availability. */
export async function listMyAvailability(): Promise<AttorneyAvailabilityRow[]> {
  // Primary — spec'd shortcut
  try {
    const res = await axios.get<AttorneyAvailabilityRow[]>('/attorneys/me/availability');
    if (Array.isArray(res.data)) return res.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data as any)?.items ?? [];
  } catch { /* fall through */ }

  // Fallback — resolve profile id first
  try {
    const meRes = await axios.get('/attorneys/me');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileId: string | undefined = (meRes.data as any)?.id;
    if (profileId) {
      const res = await axios.get<AttorneyAvailabilityRow[]>(
        `/attorneys/${profileId}/availability`,
      );
      return Array.isArray(res.data) ? res.data : [];
    }
  } catch { /* fall through */ }

  return [];
}

/** Replace the full weekly availability with the given rows in one call.
 *  Backend semantics (per BACKEND spec doc): delete rows not in the
 *  payload, upsert the rest. If the /me shortcut isn't deployed, this
 *  falls back to per-row POSTs to /attorneys/{id}/availability. */
export async function saveMyAvailability(
  body: SaveAvailabilityRequest,
): Promise<AttorneyAvailabilityRow[]> {
  // Primary — one bulk call
  try {
    const res = await axios.put<AttorneyAvailabilityRow[]>(
      '/attorneys/me/availability',
      body,
    );
    if (Array.isArray(res.data)) return res.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data as any)?.items ?? [];
  } catch { /* fall through */ }

  // Fallback — resolve profile id and POST each row
  try {
    const meRes = await axios.get('/attorneys/me');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileId: string | undefined = (meRes.data as any)?.id;
    if (profileId) {
      const results: AttorneyAvailabilityRow[] = [];
      for (const row of body.rows) {
        const res = await axios.post<AttorneyAvailabilityRow>(
          `/attorneys/${profileId}/availability`,
          row,
        );
        results.push(res.data);
      }
      return results;
    }
  } catch { /* fall through */ }

  throw new Error('Could not save availability — backend endpoints unavailable.');
}

/** After changing availability, tell backend to (re)materialise
 *  ConsultationSlot rows for the next `days` days. */
export async function regenerateMySlots(days = 60): Promise<{ created: number }> {
  const today = new Date();
  const from  = today.toISOString().slice(0, 10);
  const toDt  = new Date(today); toDt.setDate(toDt.getDate() + days);
  const to    = toDt.toISOString().slice(0, 10);

  // Primary
  try {
    const res = await axios.post<{ created?: number }>(
      '/attorneys/me/slots/generate',
      { from_date: from, to_date: to },
    );
    return { created: res.data?.created ?? 0 };
  } catch { /* fall through */ }

  // Fallback — resolve profile id
  try {
    const meRes = await axios.get('/attorneys/me');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileId: string | undefined = (meRes.data as any)?.id;
    if (profileId) {
      const res = await axios.post<unknown[]>(
        `/attorneys/${profileId}/slots/generate`,
        { attorney_id: profileId, from_date: from, to_date: to },
      );
      return { created: Array.isArray(res.data) ? res.data.length : 0 };
    }
  } catch { /* fall through */ }

  return { created: 0 };
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
  listMyAvailability,
  saveMyAvailability,
  regenerateMySlots,
};