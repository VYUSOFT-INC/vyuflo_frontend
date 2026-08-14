// src/pages/lawyer/calendar/CalendarPage.tsx
//
// Lawyer Calendar — 3-column layout (Figma node 35-3858):
//
//   ┌─────────────────────────────────────────────────────────────┐
//   │ Events & Appointments              [+ Create Event]         │
//   ├──────────┬──────────────────────────────────┬──────────────┤
//   │ VIEWS    │  CALENDAR GRID                   │ Today's      │
//   │ • Month  │  (hourly grid in Week/Day view)  │ Agenda       │
//   │ • Week   │                                  │              │
//   │ • Day    │                                  │ Critical     │
//   │ FILTERS  │                                  │ Deadlines    │
//   └──────────┴──────────────────────────────────┴──────────────┘
//
// Backend wired (8 endpoints). If API returns empty for agenda/deadlines,
// we show mock fallback data (clearly labeled) so the layout is testable.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { calendarApi } from '../../../api/lawyer/calendar.api';
import {
  addLocalReminder,
  removeLocalReminder,
  buildReminderFromEvent,
} from '../../../utils/localReminders';
import {
  upsertSharedReminder,
  removeSharedReminder,
} from '../../../lib/sharedReminders';
import {
  EVENT_TYPE_CONFIG,
  URGENCY_CONFIG,
  DAY_LABELS,
  DAY_SHORT,
  DEFAULT_TIMEZONE,
  DEFAULT_SLOT_DURATION,
} from '../../../types/lawyer/calendar.types';
import type {
  CalendarEvent,
  CalendarView,
  AgendaItem,
  DeadlineItem,
  EventDetail,
  EventType,
  EventStatus,
  LinkedCaseSearchItem,
  CreateEventPayload,
  AttorneyAvailabilityRow,
  DayOfWeek,
} from '../../../types/lawyer/calendar.types';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';

/* ── MOCK FALLBACK DATA (used when backend returns empty) ───────────── */
const MOCK_AGENDA: AgendaItem[] = [
  { id: 'mock-a1', event_type: 'consultation',  title: 'Client Consult: L. Chen',     start_time: '08:00:00', end_time: '10:00:00', is_all_day: false, location: 'Conference Room A', status: 'confirmed', is_deadline: false, is_active: false },
  { id: 'mock-a2', event_type: 'consultation',  title: 'Asylum Interview Prep',        start_time: '10:00:00', end_time: '11:30:00', is_all_day: false, location: 'Conference Room A', status: 'confirmed', is_deadline: false, is_active: true  },
  { id: 'mock-a3', event_type: 'doc_review',    title: 'Doc Review: Martinez',         start_time: '14:00:00', end_time: '15:00:00', is_all_day: false, location: null,                status: 'confirmed', is_deadline: false, is_active: false },
];

const MOCK_DEADLINES: DeadlineItem[] = [
  { deadline_id: 'mock-d1', title: 'File I-485 (Garcia)',         due_date: addDaysISO(7),  days_remaining: 7,  urgency: 'critical', case_number: 'VF-2026-001' },
  { deadline_id: 'mock-d2', title: 'Court Brief Due',              due_date: addDaysISO(12), days_remaining: 12, urgency: 'high',     case_number: 'VF-2026-007' },
  { deadline_id: 'mock-d3', title: 'Client Signature Needed',      due_date: addDaysISO(21), days_remaining: 21, urgency: 'medium',   case_number: 'VF-2026-014' },
];

function addDaysISO(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString();
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function CalendarPage() {
  const [view, setView]               = useState<CalendarView>('month');
  const [focusDate, setFocusDate]     = useState<Date>(() => new Date());
  const [events, setEvents]           = useState<CalendarEvent[]>([]);
  const [agenda, setAgenda]           = useState<AgendaItem[]>([]);
  const [deadlines, setDeadlines]     = useState<DeadlineItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [showAddModal, setShowAddModal]           = useState(false);
  const [showAvailModal, setShowAvailModal]       = useState(false);
  const [availability, setAvailability]           = useState<AttorneyAvailabilityRow[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);

  const { rangeStart, rangeEnd } = useMemo(() => getRange(focusDate, view), [focusDate, view]);

  /* ── Parallel API calls — events + agenda + deadlines ──────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, agendaRes, deadlinesRes] = await Promise.all([
        calendarApi.listEvents(view, fmtDate(rangeStart), fmtDate(rangeEnd)).catch(() => ({ events: [] })),
        calendarApi.getAgenda().catch(() => ({ items: [] })),
        calendarApi.getDeadlines(5).catch(() => ({ items: [] })),
      ]);
      setEvents(eventsRes.events ?? []);
      // Mock fallback: if backend empty, use mock so sidebars aren't blank during testing
      setAgenda((agendaRes.items?.length ?? 0) > 0 ? agendaRes.items : MOCK_AGENDA);
      setDeadlines((deadlinesRes.items?.length ?? 0) > 0 ? deadlinesRes.items : MOCK_DEADLINES);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      let msg = 'Could not load calendar.';
      if (ax?.response?.status === 401)      msg = 'Session expired. Please log in again.';
      else if (ax?.response?.status === 403) msg = 'You do not have permission to view calendar.';
      else if (e instanceof Error)           msg = e.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [view, rangeStart, rangeEnd]);

  useEffect(() => { load(); }, [load]);

  // Load attorney's availability once on mount
  const loadAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const rows = await calendarApi.listMyAvailability();
      setAvailability(rows);
    } catch { setAvailability([]); }
    finally { setAvailabilityLoading(false); }
  }, []);
  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  const handleSaveAvailability = async (rows: AttorneyAvailabilityRow[]) => {
    // Backend expects only active rows (inactive = day disabled)
    await calendarApi.saveMyAvailability({
      rows: rows.map((r) => ({
        day_of_week:           r.day_of_week,
        start_time:            r.start_time,
        end_time:              r.end_time,
        slot_duration_minutes: r.slot_duration_minutes,
        timezone:              r.timezone,
        is_active:             r.is_active,
      })),
    });
    // Materialise slots for the next 60 days so book-page has them
    try { await calendarApi.regenerateMySlots(60); } catch { /* silent */ }
    await loadAvailability();
    setShowAvailModal(false);
  };

  const goPrev   = () => setFocusDate(shiftDate(focusDate, view, -1));
  const goNext   = () => setFocusDate(shiftDate(focusDate, view, +1));
  const goToday  = () => setFocusDate(new Date());

  const openEvent = async (id: string) => {
    if (id.startsWith('mock-')) {
      alert('This is mock data. Once backend has real events, clicking will open the event details drawer.');
      return;
    }
    setDrawerLoading(true);
    try {
      const detail = await calendarApi.getEvent(id);
      setSelectedEvent(detail);
    } catch {
      alert('Could not load event details.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSaveEvent = async (
    payload: CreateEventPayload,
    eventId?: string,
    linkedCaseInfo?: { application_id: string; application_number?: string; client_name: string } | null,
  ) => {
    try {
      let savedId = eventId;
      if (eventId) {
        await calendarApi.updateEvent(eventId, payload);
      } else {
        const created = await calendarApi.createEvent(payload);
        // Newly-created row — backend returns EventDetail-shaped JSON.
        savedId = (created as { id?: string } | undefined)?.id || savedId;
      }

      /* Bridge to the Reminders tab — when the event carries a reminder,
         cache a local ReminderItem so /lawyer/notifications > Reminders
         shows it immediately (even before backend wires reminders to
         calendar_events). If the user turns reminders OFF on an update,
         drop the cached row. */
      if (savedId) {
        if (payload.reminder_enabled && (payload.reminder_minutes ?? 0) > 0) {
          addLocalReminder(
            buildReminderFromEvent({
              eventId:         savedId,
              title:           payload.title,
              eventDate:       payload.event_date,
              startTime:       payload.start_time,
              reminderMinutes: payload.reminder_minutes ?? 0,
            }),
          );

          // If the event is linked to a case, fan out a shared reminder
          // to the client (and eventually HR) — dev bridge until backend
          // does this natively (see BACKEND spec doc).
          if (payload.application_id && linkedCaseInfo?.client_name) {
            upsertSharedReminder({
              id:                savedId,
              event_type:        payload.event_type,
              title:             payload.title,
              event_date:        payload.event_date,
              start_time:        payload.start_time,
              reminder_minutes:  payload.reminder_minutes ?? 0,
              attorney_name:     'Your attorney',
              attorney_id:       null,
              application_id:    payload.application_id,
              case_number:       linkedCaseInfo.application_number ?? null,
              client_user_id:    null,
              client_name:       linkedCaseInfo.client_name,
              client_email:      null,
              hr_user_id:        null,
              hr_name:           null,
              hr_email:          null,
              created_at:        new Date().toISOString(),
              cancelled:         false,
            });
          }
        } else {
          removeLocalReminder(savedId);
          removeSharedReminder(savedId);
        }
      }

      setShowAddModal(false);
      setSelectedEvent(null);
      load();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const detail = ax?.response?.data?.detail || (e instanceof Error ? e.message : 'Save failed.');
      alert(`Save failed: ${detail}`);
    }
  };

  const handleCancelEvent = async (id: string) => {
    if (!window.confirm('Cancel this event? It will be marked cancelled but kept in the system.')) return;
    try {
      await calendarApi.cancelEvent(id);
      // Mirror the cancellation in the Reminders tab.
      removeLocalReminder(id);
      setSelectedEvent(null);
      load();
    } catch {
      alert('Could not cancel event.');
    }
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <LawyerBackButton />
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ── Top header — title + date nav + Create Event + Set Availability ── */}
        <TopHeader
          focusDate={focusDate}
          view={view}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          onCreate={() => { setSelectedEvent(null); setShowAddModal(true); }}
          onOpenAvailability={() => setShowAvailModal(true)}
        />

        {/* ── MOBILE-only view toggle (hidden on desktop) ──────────── */}
        <div className="mt-4 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 lg:hidden">
          {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Body — desktop: 3 columns, mobile: stacked ─────────── */}
        <div className="mt-4 flex flex-col gap-6 lg:mt-6 lg:flex-row">

          {/* LEFT sidebar — DESKTOP ONLY (mobile uses top toggle above) */}
          <div className="hidden lg:block">
            <ViewsSidebar view={view} onView={setView} />
          </div>

          {/* CENTER — calendar grid */}
          <section className="min-w-0 flex-1">
            {loading ? (
              <GridSkeleton />
            ) : error ? (
              <ErrorBanner message={error} onRetry={load} />
            ) : view === 'month' ? (
              <MonthView focusDate={focusDate} events={events} onSelect={openEvent} />
            ) : view === 'week' ? (
              <WeekHourGrid focusDate={focusDate} events={events} onSelect={openEvent} />
            ) : (
              <DayHourGrid focusDate={focusDate} events={events} onSelect={openEvent} />
            )}
          </section>

          {/* RIGHT sidebar — Availability + Agenda + Deadlines */}
          <aside className="w-full shrink-0 space-y-4 lg:w-[300px]">
            <WorkingHoursCard
              rows={availability}
              loading={availabilityLoading}
              onEdit={() => setShowAvailModal(true)}
            />
            <AgendaPanel items={agenda} onSelect={openEvent} loading={loading} />
            <DeadlinesPanel items={deadlines} loading={loading} />
          </aside>
        </div>
      </main>

      {drawerLoading && <FullscreenSpinner />}
      {selectedEvent && (
        <EventDetailsDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onCancel={() => handleCancelEvent(selectedEvent.id)}
          onEdit={() => setShowAddModal(true)}
        />
      )}
      {showAddModal && (
        <AddEventModal
          initialEvent={selectedEvent}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveEvent}
        />
      )}
      {showAvailModal && (
        <SetAvailabilityModal
          currentRows={availability}
          onClose={() => setShowAvailModal(false)}
          onSave={handleSaveAvailability}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TOP HEADER (no view toggle now)
═══════════════════════════════════════════════════════════════════════ */
function TopHeader({
  focusDate, view, onPrev, onNext, onToday, onCreate, onOpenAvailability,
}: {
  focusDate: Date;
  view: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate: () => void;
  onOpenAvailability: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Events & Appointments</h1>
        <p className="mt-1 text-sm text-gray-500">{formatHeadline(focusDate, view)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <IconButton onClick={onPrev} label="Previous">‹</IconButton>
          <button onClick={onToday} className="rounded-md px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">Today</button>
          <IconButton onClick={onNext} label="Next">›</IconButton>
        </div>

        <button
          onClick={onOpenAvailability}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          title="Set your weekly working hours"
        >
          <span className="text-sm leading-none">🕐</span> Set Availability
        </button>

        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90"
        >
          <span className="text-base leading-none">+</span> Create Event
        </button>
      </div>
    </div>
  );
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-50">
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   LEFT SIDEBAR — Views picker + Color Legend
═══════════════════════════════════════════════════════════════════════ */
function ViewsSidebar({ view, onView }: { view: CalendarView; onView: (v: CalendarView) => void }) {
  const items: { v: CalendarView; label: string; icon: string }[] = [
    { v: 'month', label: 'Month View',  icon: '▦' },
    { v: 'week',  label: 'Week View',   icon: '▤' },
    { v: 'day',   label: 'Day Agenda',  icon: '▥' },
  ];

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const current = items.find((it) => it.v === view) ?? items[0];

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-[220px]">
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Calendar View</p>

        {/* Dropdown */}
        <div className="relative mt-2" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 shadow-sm hover:border-indigo-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <span className="flex items-center gap-2">
              <span className="text-base text-indigo-600">{current.icon}</span>
              {current.label}
            </span>
            <span className={`text-xs text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {open && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {items.map((it) => {
                const active = view === it.v;
                return (
                  <button
                    key={it.v}
                    type="button"
                    onClick={() => { onView(it.v); setOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition-colors ${
                      active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-base ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{it.icon}</span>
                    {it.label}
                    {active && <span className="ml-auto text-xs text-indigo-600">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Color legend */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Color Legend</p>
        <div className="mt-3 space-y-2">
          {(Object.entries(EVENT_TYPE_CONFIG) as Array<[EventType, typeof EVENT_TYPE_CONFIG[EventType]]>).map(([k, c]) => (
            <div key={k} className="flex items-center gap-2 text-xs text-gray-700">
              <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MONTH VIEW
═══════════════════════════════════════════════════════════════════════ */
function MonthView({
  focusDate, events, onSelect,
}: {
  focusDate: Date;
  events: CalendarEvent[];
  onSelect: (id: string) => void;
}) {
  const grid = useMemo(() => buildMonthGrid(focusDate), [focusDate]);
  const byDate = useMemo(() => groupEventsByDate(events), [events]);
  const today = fmtDate(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day, idx) => {
          const key = fmtDate(day.date);
          const dayEvents = byDate[key] || [];
          return (
            <div key={idx} className={`min-h-[110px] border-b border-r border-gray-100 p-1.5 ${
              !day.inMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white text-gray-700'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  key === today ? 'bg-indigo-600 text-white' : day.inMonth ? 'text-gray-700' : 'text-gray-400'
                }`}>{day.date.getDate()}</span>
                {dayEvents.length > 3 && (
                  <span className="text-[10px] font-medium text-gray-400">+{dayEvents.length - 3}</span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => <EventChip key={ev.id} event={ev} onClick={onSelect} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventChip({ event, onClick }: { event: CalendarEvent; onClick: (id: string) => void }) {
  const cfg = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.consultation;
  return (
    <button onClick={() => onClick(event.id)}
      className={`flex w-full items-center gap-1 truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[10px] font-medium ${cfg.chip} ${cfg.text} hover:brightness-95`}
    >
      {!event.is_all_day && <span className="text-[9px] opacity-70">{formatTime(event.start_time)}</span>}
      <span className="truncate">{event.title}</span>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   WEEK VIEW — Hourly grid (matches Figma)
═══════════════════════════════════════════════════════════════════════ */
const HOUR_START = 7;   // 7 AM
const HOUR_END   = 20;  // 8 PM
const HOUR_HEIGHT = 56; // px per hour
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

function WeekHourGrid({
  focusDate, events, onSelect,
}: {
  focusDate: Date;
  events: CalendarEvent[];
  onSelect: (id: string) => void;
}) {
  const days = useMemo(() => buildWeekDays(focusDate), [focusDate]);
  const byDate = useMemo(() => groupEventsByDate(events), [events]);
  const today = fmtDate(new Date());

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      {/* min-w ensures hourly grid stays readable; horizontal scroll on small screens */}
      <div className="min-w-[680px]">
      {/* Day header row */}
      <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
        <div /> {/* time-axis spacer */}
        {days.map((day) => {
          const isToday = fmtDate(day) === today;
          return (
            <div key={day.toISOString()} className={`border-l border-gray-100 px-2 py-3 text-center text-xs ${
              isToday ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50/60 text-gray-600'
            }`}>
              <div className="uppercase text-[10px] tracking-wider">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="mt-0.5 text-sm font-bold">{day.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Hour rows */}
      <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
        {/* Time axis */}
        <div className="border-r border-gray-100">
          {HOURS.map((h) => (
            <div key={h} className="relative border-b border-gray-100 text-right pr-2 text-[10px] text-gray-400" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute right-2 -top-1.5 bg-white px-1">{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {/* 7 day columns with events positioned */}
        {days.map((day) => {
          const key = fmtDate(day);
          const dayEvents = (byDate[key] || []).filter((e) => !e.is_all_day);
          return (
            <div key={key} className="relative border-l border-gray-100" style={{ height: HOUR_HEIGHT * HOURS.length }}>
              {/* hour grid lines */}
              {HOURS.map((_, i) => (
                <div key={i} className="border-b border-gray-100" style={{ height: HOUR_HEIGHT }} />
              ))}
              {/* events positioned */}
              {dayEvents.map((ev) => {
                const pos = computeEventPos(ev);
                if (!pos) return null;
                return <HourEvent key={ev.id} event={ev} top={pos.top} height={pos.height} onClick={onSelect} />;
              })}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DAY VIEW — Single-column hourly grid
═══════════════════════════════════════════════════════════════════════ */
function DayHourGrid({
  focusDate, events, onSelect,
}: {
  focusDate: Date;
  events: CalendarEvent[];
  onSelect: (id: string) => void;
}) {
  const key = fmtDate(focusDate);
  const dayEvents = useMemo(
    () => events.filter((e) => e.event_date === key && !e.is_all_day),
    [events, key],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">
          {focusDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '70px 1fr' }}>
        <div className="border-r border-gray-100">
          {HOURS.map((h) => (
            <div key={h} className="relative border-b border-gray-100 text-right pr-2 text-[10px] text-gray-400" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute right-2 -top-1.5 bg-white px-1">{formatHour(h)}</span>
            </div>
          ))}
        </div>

        <div className="relative" style={{ height: HOUR_HEIGHT * HOURS.length }}>
          {HOURS.map((_, i) => (
            <div key={i} className="border-b border-gray-100" style={{ height: HOUR_HEIGHT }} />
          ))}
          {dayEvents.map((ev) => {
            const pos = computeEventPos(ev);
            if (!pos) return null;
            return <HourEvent key={ev.id} event={ev} top={pos.top} height={pos.height} onClick={onSelect} expanded />;
          })}
        </div>
      </div>
    </div>
  );
}

function HourEvent({
  event, top, height, onClick, expanded,
}: {
  event: CalendarEvent;
  top: number;
  height: number;
  onClick: (id: string) => void;
  expanded?: boolean;
}) {
  const cfg = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.consultation;
  return (
    <button
      onClick={() => onClick(event.id)}
      className={`absolute left-1 right-1 overflow-hidden rounded-md border-l-2 p-1.5 text-left text-[10px] ${cfg.chip} ${cfg.text} hover:brightness-95`}
      style={{ top, height: Math.max(height, 26) }}
    >
      <p className="truncate font-semibold">{event.title}</p>
      <p className="opacity-70">{formatTime(event.start_time)} – {formatTime(event.end_time)}</p>
      {expanded && height > 60 && (
        <span className="mt-1 inline-block rounded bg-white/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{cfg.label}</span>
      )}
    </button>
  );
}

function computeEventPos(ev: CalendarEvent): { top: number; height: number } | null {
  const startMin = timeToMinutes(ev.start_time);
  const endMin   = timeToMinutes(ev.end_time);
  if (startMin == null || endMin == null) return null;
  const gridStart = HOUR_START * 60;
  const gridEnd   = (HOUR_END + 1) * 60;
  // clip to visible range
  const s = Math.max(startMin, gridStart);
  const e = Math.min(endMin, gridEnd);
  if (e <= s) return null;
  const top    = ((s - gridStart) / 60) * HOUR_HEIGHT;
  const height = ((e - s) / 60) * HOUR_HEIGHT;
  return { top, height };
}

function timeToMinutes(t: string): number | null {
  if (!t) return null;
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10); const m = parseInt(mStr || '0', 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ampm}`;
}

/* ════════════════════════════════════════════════════════════════════════
   RIGHT SIDEBAR — Agenda + Deadlines
═══════════════════════════════════════════════════════════════════════ */
function AgendaPanel({
  items, onSelect, loading,
}: {
  items: AgendaItem[];
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const isMock = items[0]?.id?.startsWith('mock-');
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Today's Agenda</h3>
        <span className="text-[10px] text-gray-400">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
      {isMock && (
        <p className="mt-1 text-[9px] italic text-amber-600">⚠ mock data (no backend events yet)</p>
      )}
      <div className="mt-3 space-y-2">
        {loading ? (
          [0, 1].map((i) => <Skel key={i} />)
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">No appointments today.</p>
        ) : items.map((item) => {
          const cfg = EVENT_TYPE_CONFIG[item.event_type] ?? EVENT_TYPE_CONFIG.consultation;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`relative flex w-full items-start gap-2 rounded-md border-l-2 px-2.5 py-2 text-left ${cfg.chip} hover:brightness-95`}
            >
              {item.is_active && (
                <span className="absolute right-2 top-2 flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold truncate ${cfg.text}`}>{item.title}</p>
                <p className="mt-0.5 text-[10px] text-gray-600">
                  {item.is_all_day ? 'All day' : `${formatTime(item.start_time)} – ${formatTime(item.end_time)}`}
                  {item.location && ` · ${item.location}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DeadlinesPanel({
  items, loading,
}: {
  items: DeadlineItem[];
  loading: boolean;
}) {
  const isMock = items[0]?.deadline_id?.startsWith('mock-');
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Critical Deadlines</h3>
      {isMock && (
        <p className="mt-1 text-[9px] italic text-amber-600">⚠ mock data (no backend deadlines yet)</p>
      )}
      <div className="mt-3 space-y-2">
        {loading ? (
          [0, 1].map((i) => <Skel key={i} />)
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">No upcoming deadlines.</p>
        ) : items.map((d) => {
          const cfg = URGENCY_CONFIG[d.urgency] ?? URGENCY_CONFIG.medium;
          return (
            <div key={d.deadline_id} className="rounded-lg border border-gray-100 bg-gray-50/40 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-gray-900 truncate">{d.title}</p>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
              </div>
              <p className="mt-1 text-[10px] text-gray-500">{d.case_number}</p>
              <p className="mt-1 text-[10px] font-medium text-gray-600">
                Due in <span className="font-bold text-gray-900">{d.days_remaining}</span> {d.days_remaining === 1 ? 'day' : 'days'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   EVENT DETAILS DRAWER
═══════════════════════════════════════════════════════════════════════ */
function EventDetailsDrawer({
  event, onClose, onCancel, onEdit,
}: {
  event: EventDetail;
  onClose: () => void;
  onCancel: () => void;
  onEdit: () => void;
}) {
  const cfg = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.consultation;
  const isCancelled = event.status === 'cancelled';
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30 backdrop-blur-[2px]" />
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
            <h2 className="mt-2 text-base font-semibold text-gray-900">{event.title}</h2>
            {isCancelled && <p className="mt-1 text-xs font-semibold text-red-600">⚠ This event has been cancelled.</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-50">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          <Row label="Date">{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Row>
          <Row label="Time">{event.is_all_day ? 'All day' : `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`}</Row>
          {event.location && <Row label="Location">{event.location}</Row>}
          {event.linked_case && (
            <Row label="Linked Case">
              <p>{event.linked_case.client_name}</p>
              <p className="text-xs text-gray-500">{event.linked_case.application_number} · {event.linked_case.visa_type || '—'}</p>
            </Row>
          )}
          <Row label="Attorney">{event.attorney_name}</Row>
          {event.notes && <Row label="Notes"><p className="whitespace-pre-wrap text-gray-700">{event.notes}</p></Row>}
          <Row label="Reminder">{event.reminder_enabled ? `${event.reminder_minutes} minutes before` : 'No reminder set'}</Row>
        </div>
        {!isCancelled && !event.is_deadline && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <button onClick={onCancel} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Cancel Event</button>
            <button onClick={onEdit} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">Edit Details</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="mt-1 text-gray-900">{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ADD / EDIT EVENT MODAL
═══════════════════════════════════════════════════════════════════════ */
function AddEventModal({
  initialEvent, onClose, onSave,
}: {
  initialEvent: EventDetail | null;
  onClose: () => void;
  onSave: (
    payload: CreateEventPayload,
    eventId?: string,
    linkedCaseInfo?: { application_id: string; application_number?: string; client_name: string } | null,
  ) => Promise<void>;
}) {
  const isEdit = !!initialEvent;
  const [eventType, setEventType] = useState<Exclude<EventType, 'deadline'>>(
    (initialEvent?.event_type as Exclude<EventType, 'deadline'>) || 'consultation',
  );
  const [title, setTitle]         = useState(initialEvent?.title || '');
  const [eventDate, setEventDate] = useState(initialEvent?.event_date || fmtDate(new Date()));
  const [startTime, setStartTime] = useState(initialEvent?.start_time?.slice(0, 5) || '09:00');
  const [endTime, setEndTime]     = useState(initialEvent?.end_time?.slice(0, 5) || '10:00');
  const [isAllDay, setIsAllDay]   = useState(initialEvent?.is_all_day || false);
  const [location, setLocation]   = useState(initialEvent?.location || '');
  const [notes, setNotes]         = useState(initialEvent?.notes || '');
  const [status, setStatus]       = useState<EventStatus>((initialEvent?.status as EventStatus) || 'confirmed');
  const [reminderEnabled, setReminderEnabled] = useState(initialEvent?.reminder_enabled ?? true);
  const [reminderMinutes, setReminderMinutes] = useState(initialEvent?.reminder_minutes ?? 1440);
  const [linkedCase, setLinkedCase] = useState<LinkedCaseSearchItem | null>(
    initialEvent?.linked_case
      ? { application_id: initialEvent.linked_case.application_id, application_number: initialEvent.linked_case.application_number, client_name: initialEvent.linked_case.client_name, visa_type: initialEvent.linked_case.visa_type }
      : null,
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert('Title is required.'); return; }
    if (!eventDate)    { alert('Date is required.');  return; }
    if (!isAllDay && endTime <= startTime) { alert('End time must be after start time.'); return; }

    const payload: CreateEventPayload = {
      event_type: eventType,
      title:      title.trim(),
      event_date: eventDate,
      start_time: isAllDay ? '00:00:00' : `${startTime}:00`,
      end_time:   isAllDay ? '23:59:59' : `${endTime}:00`,
      is_all_day: isAllDay,
      location:   location.trim() || null,
      notes:      notes.trim() || null,
      application_id: linkedCase?.application_id || null,
      status,
      reminder_enabled: reminderEnabled,
      reminder_minutes: reminderEnabled ? reminderMinutes : 0,
    };

    setSaving(true);
    try {
      await onSave(payload, initialEvent?.id, linkedCase);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-md flex-col rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Event' : 'Add New Event'}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Field label="Event Type" required>
            <div className="grid grid-cols-2 gap-2">
              {(['consultation', 'court_hearing', 'doc_review', 'internal_sync'] as const).map((t) => {
                const c = EVENT_TYPE_CONFIG[t];
                const active = eventType === t;
                return (
                  <button key={t} type="button" onClick={() => setEventType(t)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                      active ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}>
                    <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Event Title" required><Input value={title} onChange={setTitle} placeholder="e.g. Initial Consultation — John Doe" /></Field>
          <Field label="Date" required><Input type="date" value={eventDate} onChange={setEventDate} /></Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
            <span className="text-xs text-gray-700">All-day event</span>
          </label>
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time"><Input type="time" value={startTime} onChange={setStartTime} /></Field>
              <Field label="End Time"><Input type="time" value={endTime} onChange={setEndTime} /></Field>
            </div>
          )}
          <Field label="Linked Case (optional)">
            <LinkedCaseSearch value={linkedCase} onChange={setLinkedCase} />
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-500">
              <span className="mt-0.5">💡</span>
              <span>Linking a case will automatically notify the client and their HR when this event is saved.</span>
            </p>
          </Field>
          <Field label="Location"><Input value={location} onChange={setLocation} placeholder="e.g. Conference Room A" /></Field>
          <Field label="Notes"><Textarea value={notes} onChange={setNotes} placeholder="Add any relevant details, links, or instructions…" rows={3} /></Field>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">Set Reminder</p>
                <p className="text-[10px] text-gray-500">Notify me before the event</p>
              </div>
              <input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
            </label>
            {reminderEnabled && (
              <select value={reminderMinutes} onChange={(e) => setReminderMinutes(Number(e.target.value))} className="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs">
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={1440}>1 day before</option>
                <option value={2880}>2 days before</option>
              </select>
            )}
          </div>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="confirmed">Confirmed</option>
              <option value="tentative">Tentative</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

function LinkedCaseSearch({
  value, onChange,
}: {
  value: LinkedCaseSearchItem | null;
  onChange: (v: LinkedCaseSearchItem | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkedCaseSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timerRef.current = window.setTimeout(async () => {
      try {
        const res = await calendarApi.searchLinkedCases(query.trim(), 10);
        setResults(res.items ?? []);
        setOpen(true);
      } catch { /* silent */ }
    }, 350);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-indigo-50/40 px-3 py-2">
        <div className="min-w-0 text-xs">
          <p className="font-semibold text-gray-900">{value.client_name}</p>
          <p className="text-gray-500">{value.application_number} · {value.visa_type || '—'}</p>
        </div>
        <button type="button" onClick={() => { onChange(null); setQuery(''); }} className="text-xs text-red-600 hover:text-red-700">Remove</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text" value={query} onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="Search client name or case ID (min 2 chars)"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((r) => (
            <button key={r.application_id} type="button"
              // preventDefault on mouseDown stops the input's onBlur firing
              // before this click completes — otherwise the dropdown closes
              // and the click is swallowed.
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(r);
                setQuery('');
                setResults([]);
                setOpen(false);
              }}
              className="block w-full border-b border-gray-50 px-3 py-2 text-left text-xs hover:bg-indigo-50/40"
            >
              <p className="font-semibold text-gray-900">{r.client_name}</p>
              <p className="text-gray-500">{r.application_number} · {r.visa_type || '—'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SHARED PRIMITIVES + DATE UTILS
═══════════════════════════════════════════════════════════════════════ */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />;
}
function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />;
}
function Skel() { return <div className="h-12 animate-pulse rounded-md bg-gray-100" />; }
function GridSkeleton() {
  return <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="grid grid-cols-7 gap-px bg-gray-100 p-px">{Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-24 animate-pulse bg-gray-50" />)}</div></div>;
}
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{message}{' '}<button onClick={onRetry} className="ml-2 font-semibold underline hover:text-red-900">Retry</button></div>;
}
function FullscreenSpinner() {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="rounded-full bg-white px-4 py-2 text-sm text-gray-700 shadow-lg">Loading…</div></div>;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function formatTime(t: string): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10); const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}
function getRange(focus: Date, view: CalendarView): { rangeStart: Date; rangeEnd: Date } {
  const d = new Date(focus);
  if (view === 'day')  return { rangeStart: d, rangeEnd: d };
  if (view === 'week') {
    const day = d.getDay();
    const start = new Date(d); start.setDate(d.getDate() - day);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    return { rangeStart: start, rangeEnd: end };
  }
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { rangeStart: first, rangeEnd: last };
}
function shiftDate(focus: Date, view: CalendarView, dir: -1 | 1): Date {
  const d = new Date(focus);
  if (view === 'day')   d.setDate(d.getDate() + dir);
  if (view === 'week')  d.setDate(d.getDate() + 7 * dir);
  if (view === 'month') d.setMonth(d.getMonth() + dir);
  return d;
}
function buildMonthGrid(focus: Date): { date: Date; inMonth: boolean }[] {
  const year = focus.getFullYear(); const month = focus.getMonth();
  const first = new Date(year, month, 1); const startDow = first.getDay();
  const start = new Date(first); start.setDate(first.getDate() - startDow);
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}
function buildWeekDays(focus: Date): Date[] {
  const day = focus.getDay();
  const start = new Date(focus); start.setDate(focus.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
}
function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!map[ev.event_date]) map[ev.event_date] = [];
    map[ev.event_date].push(ev);
  }
  return map;
}
function formatHeadline(focus: Date, view: CalendarView): string {
  if (view === 'day') return focus.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (view === 'week') {
    const days = buildWeekDays(focus); const start = days[0]; const end = days[6];
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return focus.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}


/* ════════════════════════════════════════════════════════════════════════
   ATTORNEY AVAILABILITY — Working Hours card + Set Availability modal
═══════════════════════════════════════════════════════════════════════ */

const DAY_KEYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

function fmt12h(t: string): string {
  // Accepts "HH:MM" or "HH:MM:SS", returns "9:00 AM"
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12    = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Card rendered in the calendar right sidebar. Summarises the
 *  attorney's weekly hours and gives an Edit shortcut. */
function WorkingHoursCard({
  rows, loading, onEdit,
}: {
  rows: AttorneyAvailabilityRow[];
  loading: boolean;
  onEdit: () => void;
}) {
  const active = rows.filter((r) => r.is_active);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <span>🕐</span> Working Hours
        </h3>
        <button
          onClick={onEdit}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          {active.length > 0 ? 'Edit' : 'Set up'}
        </button>
      </div>

      {loading ? (
        <div className="mt-3 h-14 animate-pulse rounded-md bg-gray-100" />
      ) : active.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Set your weekly hours to start accepting bookings.</p>
          <button
            onClick={onEdit}
            className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Set working hours
          </button>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {DAY_KEYS.map((d) => {
            const row = active.find((r) => r.day_of_week === d);
            const isOff = !row;
            return (
              <li key={d} className="flex items-center justify-between text-xs">
                <span className={`font-medium ${isOff ? 'text-gray-400' : 'text-gray-700'}`}>
                  {DAY_SHORT[d]}
                </span>
                <span className={isOff ? 'text-gray-300' : 'text-gray-800'}>
                  {isOff ? '— off —' : `${fmt12h(row.start_time)} – ${fmt12h(row.end_time)}`}
                </span>
              </li>
            );
          })}
          <li className="mt-2 border-t border-gray-100 pt-2 text-[11px] text-gray-500">
            {active[0].slot_duration_minutes}-min slots · {active[0].timezone}
          </li>
        </ul>
      )}
    </div>
  );
}

/** Weekly grid modal — per-day toggle + time inputs + slot duration +
 *  timezone. Emits a bulk save via `onSave`. */
function SetAvailabilityModal({
  currentRows, onClose, onSave,
}: {
  currentRows: AttorneyAvailabilityRow[];
  onClose: () => void;
  onSave: (rows: AttorneyAvailabilityRow[]) => Promise<void>;
}) {
  type LocalDay = {
    day_of_week: DayOfWeek;
    is_active:   boolean;
    start_time:  string;   // "HH:MM"
    end_time:    string;
  };

  // Seed local state from currentRows; defaults to Mon-Fri 9-5 for new users.
  const buildInitial = (): { days: LocalDay[]; slot: number; tz: string } => {
    const byDay = new Map<DayOfWeek, AttorneyAvailabilityRow>();
    currentRows.forEach((r) => { if (r.is_active) byDay.set(r.day_of_week, r); });
    const anyRow = currentRows.find((r) => r.is_active) ?? currentRows[0];

    const days: LocalDay[] = DAY_KEYS.map((d) => {
      const r = byDay.get(d);
      const defaultActive = d <= 4; // Mon–Fri active by default
      return {
        day_of_week: d,
        is_active:   !!r || (currentRows.length === 0 && defaultActive),
        start_time:  (r?.start_time ?? '09:00').slice(0, 5),
        end_time:    (r?.end_time   ?? '17:00').slice(0, 5),
      };
    });

    return {
      days,
      slot: anyRow?.slot_duration_minutes ?? DEFAULT_SLOT_DURATION,
      tz:   anyRow?.timezone              ?? DEFAULT_TIMEZONE,
    };
  };

  const initial = buildInitial();
  const [days,   setDays]   = useState<LocalDay[]>(initial.days);
  const [slotDur, setSlotDur] = useState<number>(initial.slot);
  const [tz,     setTz]     = useState<string>(initial.tz);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const activeCount = days.filter((d) => d.is_active).length;

  // Preview: total bookable slots per week
  const previewSlotsPerWeek = days.reduce((acc, d) => {
    if (!d.is_active) return acc;
    const [sh, sm] = d.start_time.split(':').map(Number);
    const [eh, em] = d.end_time.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0 || slotDur <= 0) return acc;
    return acc + Math.floor(mins / slotDur);
  }, 0);

  const updateDay = (d: DayOfWeek, patch: Partial<LocalDay>) => {
    setDays((prev) => prev.map((row) => row.day_of_week === d ? { ...row, ...patch } : row));
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    for (const d of days) {
      if (!d.is_active) continue;
      if (d.end_time <= d.start_time) {
        setError(`${DAY_LABELS[d.day_of_week]}: end time must be after start time.`);
        return;
      }
    }
    if (activeCount === 0) {
      setError('Enable at least one working day, or clients won\'t be able to book you.');
      return;
    }

    setSaving(true);
    try {
      const rows: AttorneyAvailabilityRow[] = days
        .filter((d) => d.is_active)
        .map((d) => ({
          day_of_week:           d.day_of_week,
          start_time:            d.start_time,
          end_time:              d.end_time,
          slot_duration_minutes: slotDur,
          timezone:              tz,
          is_active:             true,
        }));
      await onSave(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Set Weekly Availability</h3>
            <p className="text-xs text-gray-500">Clients can only book consultations during these hours.</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {/* Timezone + slot duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Timezone</label>
              <select value={tz} onChange={(e) => setTz(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="Asia/Calcutta">Asia/Calcutta (IST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                <option value="America/New_York">America/New_York (ET)</option>
                <option value="America/Chicago">America/Chicago (CT)</option>
                <option value="America/Denver">America/Denver (MT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Slot duration</label>
              <select value={slotDur} onChange={(e) => setSlotDur(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>

          {/* Per-day rows */}
          <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            {days.map((d) => (
              <div key={d.day_of_week} className="flex items-center gap-2">
                <label className="flex w-[110px] shrink-0 cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={d.is_active}
                    onChange={(e) => updateDay(d.day_of_week, { is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className={`text-sm font-medium ${d.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {DAY_LABELS[d.day_of_week]}
                  </span>
                </label>
                {d.is_active ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input type="time" value={d.start_time}
                      onChange={(e) => updateDay(d.day_of_week, { start_time: e.target.value })}
                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span className="text-xs text-gray-400">→</span>
                    <input type="time" value={d.end_time}
                      onChange={(e) => updateDay(d.day_of_week, { end_time: e.target.value })}
                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                ) : (
                  <span className="flex-1 text-right text-xs italic text-gray-400">— off —</span>
                )}
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-xs">
            <p className="text-indigo-900">
              <b>Preview:</b> {activeCount} active day{activeCount !== 1 ? 's' : ''} · {slotDur}-min slots
            </p>
            <p className="mt-0.5 text-indigo-700">
              ≈ <b>{previewSlotsPerWeek}</b> bookable slot{previewSlotsPerWeek !== 1 ? 's' : ''} per week
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
