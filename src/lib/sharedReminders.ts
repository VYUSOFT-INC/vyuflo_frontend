// src/lib/sharedReminders.ts
//
// Shared reminder bridge. When the lawyer creates a calendar event
// linked to a case, we save a copy here targeted at the linked client
// (and eventually HR). Employee dashboard + Notifications tab read
// this so the client sees the reminder without waiting for the backend
// fan-out.
//
// Backend equivalent (per spec doc): POST /calendar/events with
// application_id should insert Notification + Reminder rows for the
// linked application's user (employee) and HR user. Once backend
// deploys, the client's GET /notifications-reminders/reminders picks
// up the real row and this bridge silently dedupes.

const KEY = 'Vyuflo.shared_reminders.v1';

export interface SharedReminder {
  id:                    string;            // event id (unique)
  event_type:            string;             // "Court Hearing", "Consultation", etc.
  title:                 string;
  event_date:            string;             // ISO "YYYY-MM-DD"
  start_time:            string;             // "HH:MM:SS" local
  reminder_minutes:      number;
  attorney_name:         string;             // "posam srihari"
  attorney_id?:          string | null;

  // Linked case info — used to match on employee/HR side
  application_id:        string;
  case_number?:          string | null;
  client_user_id?:       string | null;
  client_name:           string;             // "gowtham laveti"
  client_email?:         string | null;
  hr_user_id?:           string | null;
  hr_name?:              string | null;
  hr_email?:             string | null;

  created_at:            string;
  cancelled:             boolean;
}

const CHANGED_EVENT = 'Vyuflo:shared-reminders-changed';

function safeRead(): SharedReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function safeWrite(items: SharedReminder[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  } catch { /* quota — ignore */ }
}

/** Append (or replace by id) a shared reminder. */
export function upsertSharedReminder(r: SharedReminder): void {
  const next = safeRead().filter((x) => x.id !== r.id);
  next.unshift(r);
  // Prune events older than 60 days
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const kept = next.filter((x) => {
    const t = Date.parse(x.event_date);
    return Number.isNaN(t) || t >= cutoff;
  });
  safeWrite(kept);
}

/** Remove a reminder (e.g. event cancelled or unlinked). */
export function removeSharedReminder(id: string): void {
  safeWrite(safeRead().filter((x) => x.id !== id));
}

/** Read reminders that should be visible to a given viewer.
 *  Matching order:
 *   1. `viewerEmail` matches client_email OR hr_email
 *   2. `viewerName`  matches client_name OR hr_name (case-insensitive)
 *   3. `viewerUserId` matches client_user_id OR hr_user_id
 *  Cancelled reminders are excluded. */
export function readSharedRemindersFor(opts: {
  email?:  string | null;
  name?:   string | null;
  userId?: string | null;
}): SharedReminder[] {
  const email  = (opts.email  ?? '').toLowerCase().trim();
  const name   = (opts.name   ?? '').toLowerCase().trim();
  const userId = (opts.userId ?? '').trim();
  if (!email && !name && !userId) return [];
  return safeRead().filter((r) => {
    if (r.cancelled) return false;
    if (email && (r.client_email?.toLowerCase() === email || r.hr_email?.toLowerCase() === email)) return true;
    if (name && (r.client_name?.toLowerCase() === name || r.hr_name?.toLowerCase() === name)) return true;
    if (userId && (r.client_user_id === userId || r.hr_user_id === userId)) return true;
    return false;
  });
}

/** Convert a shared reminder to the Employee Notification shape.
 *  Used by Notifications tab to display calendar events until backend
 *  inserts Notification rows on POST /calendar/events. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toEmployeeNotification(r: SharedReminder): any {
  const when = `${r.event_date} at ${(r.start_time || '').slice(0, 5)}`;
  return {
    id:                `local-event-${r.id}`,
    user_id:           '',
    notification_type: 'calendar_event',
    category:          'calendar',
    priority:          r.event_type?.toLowerCase().includes('court') ? 'urgent' : 'high',
    title:             `Upcoming: ${r.title}`,
    body:              `${r.event_type} scheduled by ${r.attorney_name} on ${when}. Reminder ${r.reminder_minutes} min before.`,
    application_id:    r.application_id || null,
    case_reference:    r.case_number || null,
    actor_id:          r.attorney_id || null,
    actor_label:       r.attorney_name || null,
    cta_primary_label: 'View details',
    cta_primary_url:   `/calendar`,
    is_read:           false,
    read_at:           null,
    is_dismissed:      false,
    dismissed_at:      null,
    sent_via_email:    true,
    sent_via_push:     false,
    sent_via_sms:      false,
    expires_at:        null,
    created_at:        r.created_at,
    updated_at:        r.created_at,
  };
}