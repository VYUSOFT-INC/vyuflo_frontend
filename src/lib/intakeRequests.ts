// src/lib/intakeRequests.ts
//
// localStorage bridge for lawyer→employee intake requests. Fires when
// the lawyer clicks "Send request" on the review page. The employee
// dashboard reads these and surfaces them as Action Items + fake
// notification, so the flow demos end-to-end before backend deploys the
// real `/intake/sessions/:id/request-changes` endpoint.

const KEY = 'vyuflo:intake:pending-requests:v1';

export interface PendingIntakeRequest {
  id:             string;           // session_id (unique per request)
  application_id: string;
  employee_email: string;           // used to filter on employee side
  employee_name:  string;
  visa_code:      string | null;
  case_reference: string;           // e.g. "#VF-2026-089"
  attorney_name:  string;
  note:           string;
  is_correction:  boolean;
  requested_at:   string;
  completed:      boolean;          // flipped when employee submits
}

export function readIntakeRequests(): PendingIntakeRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function appendIntakeRequest(req: PendingIntakeRequest): void {
  try {
    const list = readIntakeRequests();
    const next = [req, ...list.filter((r) => r.id !== req.id)];
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function markIntakeRequestComplete(id: string): void {
  try {
    const list = readIntakeRequests();
    const next = list.map((r) => (r.id === id ? { ...r, completed: true } : r));
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

/** Filter requests for the currently logged-in employee.
 *  Matches on any of the possible emails (some pages read primary
 *  email, some read secondary). Case-insensitive. */
export function readIntakeRequestsForEmployee(
  ...emails: (string | null | undefined)[]
): PendingIntakeRequest[] {
  const wanted = new Set(
    emails.filter(Boolean).map((e) => (e as string).toLowerCase().trim()),
  );
  if (wanted.size === 0) return [];
  return readIntakeRequests().filter(
    (r) => !r.completed && wanted.has((r.employee_email || '').toLowerCase().trim()),
  );
}

/** Convert a pending intake request to the Employee Notification shape.
 *  Used by the Notifications tab to display intake requests until the
 *  backend adds the notification insert on /intake/sessions/:id/generate-link. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toEmployeeNotification(req: PendingIntakeRequest): any {
  return {
    id:                `local-intake-${req.id}`,
    user_id:           '',
    notification_type: 'case_status_updated',
    category:          'case_update',
    priority:          'high',
    title:             req.is_correction
      ? 'Your intake needs corrections'
      : 'Your attorney requested your intake details',
    body:              req.note || 'Please complete your intake form so your attorney can move forward with your case.',
    application_id:    req.application_id || null,
    case_reference:    req.case_reference || null,
    actor_id:          null,
    actor_label:       req.attorney_name || null,
    cta_primary_label: 'Complete intake',
    cta_primary_url:   `/my-intake/${req.id}`,
    is_read:           false,
    read_at:           null,
    is_dismissed:      false,
    dismissed_at:      null,
    sent_via_email:    true,   // demo: pretend an email was sent
    sent_via_push:    false,
    sent_via_sms:     false,
    expires_at:       null,
    created_at:       req.requested_at,
    updated_at:       req.requested_at,
  };
}