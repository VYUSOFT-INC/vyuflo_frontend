// src/types/lawyer/calendar.types.ts
//
// Calendar module types — matches backend Swagger:
//   GET    /api/v1/calendar/events           — list events for date range
//   POST   /api/v1/calendar/events           — create event
//   GET    /api/v1/calendar/events/{id}      — event details
//   PATCH  /api/v1/calendar/events/{id}      — update event
//   DELETE /api/v1/calendar/events/{id}      — soft-cancel event
//   GET    /api/v1/calendar/agenda           — today's agenda panel
//   GET    /api/v1/calendar/deadlines        — critical deadlines sidebar
//   GET    /api/v1/calendar/cases/search     — linked-case type-ahead for modal

/* ── View type ──────────────────────────────────────────────────────── */
export type CalendarView = 'day' | 'week' | 'month';

/* ── Event types (deadline is read-only; created by system, not UI) ─── */
export type EventType =
  | 'consultation'
  | 'court_hearing'
  | 'doc_review'
  | 'internal_sync'
  | 'deadline';

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

/* ── Deadline urgency levels (from deadlines table) ─────────────────── */
export type DeadlineUrgency = 'critical' | 'high' | 'medium' | 'low';

/* ── Calendar event (basic list row) ────────────────────────────────── */
export interface CalendarEvent {
  id:               string;
  event_type:       EventType;
  title:            string;
  event_date:       string;          // YYYY-MM-DD
  start_time:       string;          // HH:MM:SS or ISO time portion
  end_time:         string;
  is_all_day:       boolean;
  status:           EventStatus | string;
  is_deadline:      boolean;         // synthetic flag (true if merged from deadlines)
  deadline_urgency?: DeadlineUrgency | null;
}

/* ── Events list response ───────────────────────────────────────────── */
export interface EventListResponse {
  view:       CalendarView | string;
  start_date: string;
  end_date:   string;
  events:     CalendarEvent[];
  total:      number;
}

/* ── Agenda panel (right sidebar, today's running events) ───────────── */
export interface AgendaItem {
  id:               string;
  event_type:       EventType;
  title:            string;
  start_time:       string;
  end_time:         string;
  is_all_day:       boolean;
  location:         string | null;
  status:           EventStatus | string;
  is_deadline:      boolean;
  is_active:        boolean;          // currently running (now is between start/end)
  deadline_urgency?: DeadlineUrgency | null;
}

export interface AgendaResponse {
  date:  string;
  items: AgendaItem[];
}

/* ── Critical Deadlines sidebar ─────────────────────────────────────── */
export interface DeadlineItem {
  deadline_id:    string;
  title:          string;
  due_date:       string;             // ISO datetime
  days_remaining: number;
  urgency:        DeadlineUrgency;
  case_number:    string;
}

export interface DeadlinesResponse {
  items: DeadlineItem[];
}

/* ── Linked case search (Add Event modal type-ahead) ────────────────── */
export interface LinkedCaseSearchItem {
  application_id:     string;
  application_number: string;
  client_name:        string;
  visa_type:          string | null;
}

export interface LinkedCasesResponse {
  items: LinkedCaseSearchItem[];
}

/* ── Full event details (Event Details Drawer) ──────────────────────── */
export interface LinkedCaseSnapshot {
  application_id:     string;
  application_number: string;
  client_name:        string;
  visa_type:          string | null;
}

export interface EventDetail {
  id:               string;
  event_type:       EventType;
  title:            string;
  event_date:       string;
  start_time:       string;
  end_time:         string;
  is_all_day:       boolean;
  location:         string | null;
  notes:            string | null;
  status:           EventStatus | string;
  reminder_enabled: boolean;
  reminder_minutes: number;
  attorney_id:      string;
  attorney_name:    string;
  linked_case:      LinkedCaseSnapshot | null;
  is_deadline:      boolean;
  created_at:       string;
  updated_at:       string;
}

/* ── Create event payload ───────────────────────────────────────────── */
export interface CreateEventPayload {
  event_type:        Exclude<EventType, 'deadline'>;   // backend rejects 'deadline'
  title:             string;
  event_date:        string;                            // YYYY-MM-DD
  start_time:        string;                            // HH:MM:SS or ISO time
  end_time:          string;
  is_all_day:        boolean;
  location?:         string | null;
  notes?:            string | null;
  application_id?:   string | null;
  status?:           EventStatus;
  reminder_enabled?: boolean;
  reminder_minutes?: number;
}

/* ── Update event payload (PATCH — partial) ─────────────────────────── */
export type UpdateEventPayload = Partial<CreateEventPayload>;

/* ── Display helpers — event type config ────────────────────────────── */
export const EVENT_TYPE_CONFIG: Record<EventType, {
  label: string;
  bg: string;
  text: string;
  dot: string;
  chip: string;
}> = {
  consultation: {
    label: 'Consultation',
    bg:    'bg-blue-50',
    text:  'text-blue-700',
    dot:   'bg-blue-500',
    chip:  'border-l-blue-500 bg-blue-50/70',
  },
  court_hearing: {
    label: 'Court Hearing',
    bg:    'bg-red-50',
    text:  'text-red-700',
    dot:   'bg-red-500',
    chip:  'border-l-red-500 bg-red-50/70',
  },
  doc_review: {
    label: 'Doc Review',
    bg:    'bg-amber-50',
    text:  'text-amber-700',
    dot:   'bg-amber-500',
    chip:  'border-l-amber-500 bg-amber-50/70',
  },
  internal_sync: {
    label: 'Internal Sync',
    bg:    'bg-violet-50',
    text:  'text-violet-700',
    dot:   'bg-violet-500',
    chip:  'border-l-violet-500 bg-violet-50/70',
  },
  deadline: {
    label: 'Deadline',
    bg:    'bg-rose-50',
    text:  'text-rose-700',
    dot:   'bg-rose-500',
    chip:  'border-l-rose-500 bg-rose-50/70',
  },
};

export const URGENCY_CONFIG: Record<DeadlineUrgency, { label: string; bg: string; text: string }> = {
  critical: { label: 'Critical', bg: 'bg-red-100',    text: 'text-red-800'    },
  high:     { label: 'High',     bg: 'bg-orange-100', text: 'text-orange-800' },
  medium:   { label: 'Medium',   bg: 'bg-amber-100',  text: 'text-amber-800'  },
  low:      { label: 'Low',      bg: 'bg-blue-100',   text: 'text-blue-800'   },
};