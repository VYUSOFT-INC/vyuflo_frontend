// src/types/lawyer/availability.types.ts
//
// Attorney weekly availability — supports MULTIPLE time windows per day.
// Backend contract lives in BACKEND_MULTI_WINDOW_AVAILABILITY.md.

export const DAYS_OF_WEEK = [
  { code: 0, label: 'Monday',    short: 'Mon' },
  { code: 1, label: 'Tuesday',   short: 'Tue' },
  { code: 2, label: 'Wednesday', short: 'Wed' },
  { code: 3, label: 'Thursday',  short: 'Thu' },
  { code: 4, label: 'Friday',    short: 'Fri' },
  { code: 5, label: 'Saturday',  short: 'Sat' },
  { code: 6, label: 'Sunday',    short: 'Sun' },
] as const;

export type DayCode = typeof DAYS_OF_WEEK[number]['code'];

/** One AttorneyAvailability row from the backend. Multiple rows share
 *  the same `day_of_week` when the attorney has split-day windows. */
export interface AvailabilityRow {
  id?:                    string;
  attorney_id?:           string;
  day_of_week:            DayCode;
  start_time:             string;   // "HH:mm" or "HH:mm:ss"
  end_time:               string;
  slot_duration_minutes:  number;
  timezone:               string;
  is_active:              boolean;
}

/** UI-only intermediate — one row per (day, window). */
export interface AvailabilityWindow {
  start_time:            string;   // "HH:mm"
  end_time:              string;   // "HH:mm"
  slot_duration_minutes: number;
}

export interface DayAvailability {
  day_of_week: DayCode;
  is_active:   boolean;
  windows:     AvailabilityWindow[];
}

/** Bulk-replace payload for PUT /attorneys/me/availability. */
export interface AvailabilityPutPayload {
  rows: AvailabilityRow[];
}

/** Common slot durations shown in the modal dropdown. */
export const SLOT_DURATIONS = [15, 20, 30, 45, 60, 90] as const;

/** Normalise a backend "HH:mm:ss" → the "HH:mm" the <input type="time"> expects. */
export function toInputTime(hhmmss: string): string {
  if (!hhmmss) return '';
  return hhmmss.length >= 5 ? hhmmss.slice(0, 5) : hhmmss;
}

/** Group flat backend rows by day_of_week — each day becomes one
 *  DayAvailability with N windows. */
export function groupRowsByDay(rows: AvailabilityRow[]): DayAvailability[] {
  const byDay = new Map<DayCode, DayAvailability>();
  for (const d of DAYS_OF_WEEK) {
    byDay.set(d.code, { day_of_week: d.code, is_active: false, windows: [] });
  }
  for (const r of rows) {
    if (!r || !r.is_active) continue;
    const bucket = byDay.get(r.day_of_week);
    if (!bucket) continue;
    bucket.is_active = true;
    bucket.windows.push({
      start_time:            toInputTime(r.start_time),
      end_time:              toInputTime(r.end_time),
      slot_duration_minutes: r.slot_duration_minutes || 30,
    });
  }
  return Array.from(byDay.values());
}

/** Flatten DayAvailability[] → backend-shaped rows. Skips inactive days
 *  and windows with empty times. Adds `is_active: true` on every row. */
export function daysToRows(days: DayAvailability[], timezone: string): AvailabilityRow[] {
  const out: AvailabilityRow[] = [];
  for (const d of days) {
    if (!d.is_active) continue;
    for (const w of d.windows) {
      if (!w.start_time || !w.end_time) continue;
      if (w.start_time >= w.end_time) continue;   // guard: window must be positive
      out.push({
        day_of_week:            d.day_of_week,
        start_time:             w.start_time,
        end_time:               w.end_time,
        slot_duration_minutes:  w.slot_duration_minutes || 30,
        timezone,
        is_active:              true,
      });
    }
  }
  return out;
}
