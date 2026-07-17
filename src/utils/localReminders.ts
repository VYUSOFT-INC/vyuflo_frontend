// src/utils/localReminders.ts
//
// Local cache that bridges Calendar → Notifications & Reminders.
//
// The backend roadmap:
//   POST /calendar/events with reminder_enabled=true → event row carries the
//   reminder. GET /notifications-reminders/reminders is supposed to surface
//   those rows. While that backend wiring is still in progress, we cache the
//   reminder client-side so the user can SEE the reminder they just created
//   in the Reminders tab immediately.
//
// USAGE
//   - CalendarPage      → addLocalReminder(...) after a successful create.
//   - NotificationsRemindersPage → listLocalReminders() merged with backend
//                                  list, de-duped by id, so the upgrade is
//                                  transparent once the API is wired.
//
// SAFETY
//   - Wrapped in try/catch so a stuck localStorage never breaks the page.
//   - Auto-prunes anything older than 30 days on every read.
//   - Skips entirely in SSR / non-browser contexts.

import type { ReminderItem } from '../types/lawyer/notifReminders.types';

const KEY = 'Vyuflo.lawyer.local_reminders.v1';

/** Human-friendly badge for reminder_minutes (matches backend convention). */
export function reminderBadgeLabel(minutes: number): string {
  if (minutes >= 1440 * 7) return `${Math.round(minutes / 1440 / 7)}-Week Reminder`;
  if (minutes >= 1440)     return `${Math.round(minutes / 1440)}-Day Reminder`;
  if (minutes >= 60)       return `${Math.round(minutes / 60)}-Hour Reminder`;
  return `${minutes}-Min Reminder`;
}

function safeRead(): ReminderItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ReminderItem[];
  } catch {
    return [];
  }
}

/** Custom DOM event broadcast on every write so subscribers (Sidebar badge,
 *  Notifications page count, etc.) can refresh without polling. */
export const LOCAL_REMINDERS_EVENT = 'Vyuflo:local-reminders-changed';

function safeWrite(items: ReminderItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(LOCAL_REMINDERS_EVENT));
  } catch {
    /* quota / private-mode — ignore */
  }
}

/** Drop entries past their event_date - 30 days. */
function prune(items: ReminderItem[]): ReminderItem[] {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return items.filter((r) => {
    const t = Date.parse(r.event_date || r.created_at || '');
    if (Number.isNaN(t)) return true;
    return t >= cutoff;
  });
}

/** Strip any UTC marker / millis / tz offset from a stored start_time so
 *  display logic treats it as the attorney's LOCAL clock. Entries written
 *  before the timezone fix carried a 'Z' suffix that shifted display
 *  by the user's UTC offset — this migration cleans them on next read. */
function normalizeTime(t: string): string {
  if (!t) return t;
  return t
    .replace(/[zZ]$/, '')
    .replace(/\.\d+$/, '')
    .replace(/[+-]\d{2}:?\d{2}$/, '');
}

/** Read all locally-cached reminders (auto-pruned + migrated).
 *
 *  IMPORTANT — this is a READ path. It must never call `safeWrite` on
 *  unchanged data, because `safeWrite` dispatches LOCAL_REMINDERS_EVENT
 *  and subscribers (Sidebar badge, Notifications page count) re-read on
 *  that event. Writing on every read would create a render → read →
 *  write → event → render infinite loop and freeze the page.
 *  Only persist when pruning removed entries OR a one-time migration
 *  cleaned a Z-suffixed start_time from before the timezone fix.
 */
export function listLocalReminders(): ReminderItem[] {
  const raw    = safeRead();
  const pruned = prune(raw);

  // One-time migration: strip any pre-fix UTC suffix from start_time.
  let dirty = pruned.length !== raw.length;
  const migrated = pruned.map((r) => {
    const fixed = normalizeTime(r.start_time);
    if (fixed !== r.start_time) {
      dirty = true;
      return { ...r, start_time: fixed };
    }
    return r;
  });
  if (dirty) safeWrite(migrated);

  /* Sort: upcoming first, soonest event_date wins. */
  return migrated
    .slice()
    .sort((a, b) => Date.parse(a.event_date) - Date.parse(b.event_date));
}

/** Append a reminder, replacing any existing entry with the same id. */
export function addLocalReminder(r: ReminderItem): void {
  const next = safeRead().filter((x) => x.id !== r.id);
  next.unshift(r);
  safeWrite(prune(next));
}

/** Remove by id (e.g. when the user dismisses or the event is deleted). */
export function removeLocalReminder(id: string): void {
  safeWrite(safeRead().filter((x) => x.id !== id));
}

/**
 * Build a ReminderItem from a freshly-created calendar event.
 *
 * IMPORTANT — the calendar form captures the time in the attorney's LOCAL
 * timezone ("18:33:00" = 6:33 PM local). We must NOT add a 'Z' suffix here,
 * because the renderer (`new Date(`${date}T${time}`)`) parses ISO strings
 * with 'Z' as UTC, which shifts the display into the next day for users
 * east of UTC (e.g. IST 6:33 PM rendered as 12:03 AM next day).
 * Storing as "HH:MM:SS" (no offset) keeps the time local on both write
 * and read paths.
 */
export function buildReminderFromEvent(args: {
  eventId: string;
  title: string;
  eventDate: string;     // YYYY-MM-DD (local)
  startTime: string;     // HH:MM or HH:MM:SS (24-hour, local)
  reminderMinutes: number;
  clientName?: string | null;
  visaTypeCode?: string | null;
  caseReference?: string | null;
}): ReminderItem {
  // Normalize to HH:MM:SS — strip any trailing 'Z', milliseconds, or offset
  // info that might have crept in from a backend echo.
  const cleanTime = args.startTime
    .replace(/[zZ]$/, '')
    .replace(/\.\d+$/, '')
    .replace(/[+-]\d{2}:?\d{2}$/, '');
  const padded =
    /^\d{2}:\d{2}$/.test(cleanTime) ? `${cleanTime}:00` : cleanTime;

  return {
    id:                args.eventId,
    title:             args.title,
    badge_label:       reminderBadgeLabel(args.reminderMinutes),
    event_date:        args.eventDate,
    start_time:        padded,
    reminder_minutes:  args.reminderMinutes,
    client_name:       args.clientName ?? null,
    visa_type_code:    args.visaTypeCode ?? null,
    case_reference:    args.caseReference ?? null,
    is_upcoming:       true,
    created_at:        new Date().toISOString(),
  };
}