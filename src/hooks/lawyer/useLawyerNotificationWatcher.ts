// src/hooks/lawyer/useLawyerNotificationWatcher.ts
//
// Background poller that synthesizes attorney-facing notifications from the
// same endpoints the app already talks to.  Mounted once at the shell level
// (DashboardLayout) — never render inside a page.
//
// WHAT IT WATCHES
//   1. Documents  → /documents/filter          → new upload / re-upload / requested-doc reply
//   2. Chats      → /messages/conversations    → new message on any thread
//   3. Cases      → /lawyer/applications       → new HR-assigned application
//   4. Reminders  → localStorage (localReminders)
//                 → fire when fire_time crosses "now"
//
// POLL CADENCE
//   Every POLL_MS (30 s by default).  Skip firing on the very first tick
//   for each resource — that pass just captures a baseline snapshot so the
//   attorney doesn't get spammed with a notification for every existing row
//   the moment the app loads.
//
// STORAGE
//   Baseline snapshots live in sessionStorage (per-tab / per-session) so
//   restarting the app re-baselines gracefully.  Actual notifications
//   themselves are persistent in localStorage via lawyerNotifications.
//
// SAFETY
//   Every API call is wrapped in try/catch; a single failing endpoint
//   never blocks the others.  Nothing throws out of this hook.

import { useEffect, useRef } from 'react';
import { documentsApi } from '../../api/lawyer/documents.api';
import { messagesApi }  from '../../api/lawyer/messages.api';
import { intakeApi }    from '../../api/lawyer/intake.api';
import { pushLawyerNotification } from '../../utils/lawyerNotifications';
import { listLocalReminders, LOCAL_REMINDERS_EVENT } from '../../utils/localReminders';
import type { Document } from '../../types/lawyer/documents.types';
import type { AssignedApplication } from '../../types/lawyer/intake.types';

const POLL_MS = 30_000;

// SessionStorage keys for baselines
const SNAP_DOCS  = 'Vyuflo.lawyer.notif.snap.docs.v1';
const SNAP_CONVS = 'Vyuflo.lawyer.notif.snap.convs.v1';
const SNAP_APPS  = 'Vyuflo.lawyer.notif.snap.apps.v1';
const FIRED_REMS = 'Vyuflo.lawyer.notif.fired_reminders.v1';

/* ── Snapshot helpers ─────────────────────────────────────────────────── */
function readSnapshot<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeSnapshot(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

/* ── Reminder fire-tracking (survives across tabs) ────────────────────── */
function readFiredReminderIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(FIRED_REMS);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function writeFiredReminderIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIRED_REMS, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

/* ── Per-doc snapshot record we keep just enough of to diff ───────────── */
interface DocSnapshotRow {
  status:     string;
  version:    number;
  uploaded_at:string;
}

/* ── One conversation snapshot ────────────────────────────────────────── */
interface ConvSnapshotRow {
  last_message_at: string;
}

/**
 * Mount once at the app-shell for the attorney role.  Fires-and-forgets —
 * caller doesn't need the return value.
 */
export default function useLawyerNotificationWatcher(): void {
  // Whether we've already captured a baseline for each resource.  Prevents
  // firing a huge burst on the very first tick.
  const docsBaselined  = useRef(readSnapshot<Record<string, DocSnapshotRow>>(SNAP_DOCS)  != null);
  const convsBaselined = useRef(readSnapshot<Record<string, ConvSnapshotRow>>(SNAP_CONVS) != null);
  const appsBaselined  = useRef(readSnapshot<string[]>(SNAP_APPS) != null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;

      /* ── 1. Documents ─────────────────────────────────────────────── */
      try {
        const res = await documentsApi.filterDocuments({});
        const items = res.items || [];
        const deleted = documentsApi.getLocallyDeletedIds();
        const live = items.filter((d) => !deleted.has(d.id));

        // Build the current snapshot
        const current: Record<string, DocSnapshotRow> = {};
        for (const d of live) {
          current[d.id] = {
            status:      d.status,
            version:     d.version,
            uploaded_at: d.uploaded_at,
          };
        }

        if (docsBaselined.current) {
          const prev = readSnapshot<Record<string, DocSnapshotRow>>(SNAP_DOCS) || {};
          for (const d of live) {
            const p = prev[d.id];
            if (!p) {
              // Row is brand new since the last poll → notify.
              firePush(d, 'doc_upload');
            } else if (d.version > p.version) {
              // Same doc, higher version → client re-uploaded.
              firePush(d, 'doc_reupload');
            } else if (
              // Requested-doc reply: was 'required', now something else with
              // a fresh upload timestamp.
              p.status === 'required' &&
              d.status !== 'required' &&
              d.uploaded_at !== p.uploaded_at
            ) {
              firePush(d, 'doc_requested_reply');
            }
          }
        }

        writeSnapshot(SNAP_DOCS, current);
        docsBaselined.current = true;
      } catch { /* swallow — next tick will retry */ }

      /* ── 2. Chats ────────────────────────────────────────────────── */
      try {
        const list = await messagesApi.listThreads();
        // Backend returns { items: [] }. Guard for both shapes.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const convs = (Array.isArray(list) ? list : (list as any).items || []) as Array<{
          id:               string;
          participant_name: string;
          last_message?:    string;
          last_message_at?: string;
          unread_count?:    number;
        }>;

        const current: Record<string, ConvSnapshotRow> = {};
        for (const c of convs) {
          current[c.id] = { last_message_at: c.last_message_at || '' };
        }

        if (convsBaselined.current) {
          const prev = readSnapshot<Record<string, ConvSnapshotRow>>(SNAP_CONVS) || {};
          for (const c of convs) {
            const p = prev[c.id];
            const isNewer =
              c.last_message_at &&
              (!p || (p.last_message_at || '') < c.last_message_at);
            // Only surface it if the thread has genuine unread mail — avoids
            // firing when the lawyer just sent something themselves.
            if (isNewer && (c.unread_count || 0) > 0) {
              pushLawyerNotification({
                dedup_key:  `chat_message:${c.id}:${c.last_message_at}`,
                type:       'chat_message',
                title:      `New message from ${c.participant_name || 'Client'}`,
                body:       c.last_message?.slice(0, 120) || 'You have a new message.',
                link:       `/lawyer/messages?threadId=${c.id}`,
                timestamp:  c.last_message_at || new Date().toISOString(),
              });
            }
          }
        }

        writeSnapshot(SNAP_CONVS, current);
        convsBaselined.current = true;
      } catch { /* swallow */ }

      /* ── 3. Cases / HR assignments ───────────────────────────────── */
      try {
        const apps = await intakeApi.listAssignedApplications();
        const currentIds = apps.map((a) => a.application_id);

        if (appsBaselined.current) {
          const prev = new Set(readSnapshot<string[]>(SNAP_APPS) || []);
          const newOnes = apps.filter((a) => !prev.has(a.application_id));
          for (const a of newOnes) fireAppPush(a);
        }

        writeSnapshot(SNAP_APPS, currentIds);
        appsBaselined.current = true;
      } catch { /* swallow */ }

      /* ── 4. Calendar reminders — fire when scheduled time passes ── */
      // localReminders already carry an event_date; a reminder should
      // "fire" when now >= reminder_minutes before event_date.
      try {
        const now = Date.now();
        const fired = readFiredReminderIds();
        const reminders = listLocalReminders();
        for (const r of reminders) {
          const eventTs = Date.parse(r.event_date || '');
          if (Number.isNaN(eventTs)) continue;
          const fireAt = eventTs - (r.reminder_minutes || 0) * 60_000;
          if (now < fireAt) continue;                // not yet
          if (fired.has(r.id)) continue;              // already announced
          if (eventTs < now - 60 * 60_000) continue;  // event > 1h in the past → skip (stale)

          const minutesToEvent = Math.max(0, Math.round((eventTs - now) / 60_000));
          const timeText =
            minutesToEvent === 0                ? 'now' :
            minutesToEvent < 60                 ? `in ${minutesToEvent} min` :
            minutesToEvent < 60 * 24            ? `in ${Math.round(minutesToEvent / 60)}h` :
                                                  `in ${Math.round(minutesToEvent / 60 / 24)}d`;

          pushLawyerNotification({
            dedup_key:  `calendar_fire:${r.id}`,
            type:       'calendar_fire',
            title:      r.title || 'Upcoming event',
            body:       `${r.title || 'Event'} — ${timeText}`,
            link:       '/lawyer/notifications?tab=reminders',
            timestamp:  new Date().toISOString(),
          });
          fired.add(r.id);
        }
        writeFiredReminderIds(fired);
      } catch { /* swallow */ }
    }

    // Kick off immediately, then poll.
    void tick();
    const interval = window.setInterval(tick, POLL_MS);

    // Also re-run when the reminder store changes (new reminder just added).
    const onRemindersChanged = () => { void tick(); };
    window.addEventListener(LOCAL_REMINDERS_EVENT, onRemindersChanged);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(LOCAL_REMINDERS_EVENT, onRemindersChanged);
    };
  }, []);
}

/* ═════════════════════════════════════════════════════════════════════
   Push helpers — small so the tick() loop stays readable.
   ═════════════════════════════════════════════════════════════════════ */

function firePush(d: Document, type: 'doc_upload' | 'doc_reupload' | 'doc_requested_reply'): void {
  const clientName = d.client_name || 'Client';
  const caseTag    = d.case_id ? ` · ${d.case_id}` : '';
  const doclabel   = d.document_type || d.name || 'a document';

  const titleMap: Record<typeof type, string> = {
    doc_upload:            `New upload from ${clientName}`,
    doc_reupload:          `${clientName} re-uploaded ${doclabel}`,
    doc_requested_reply:   `${clientName} answered your request`,
  };
  const bodyMap: Record<typeof type, string> = {
    doc_upload:            `${doclabel}${caseTag}`,
    doc_reupload:          `Fix submitted for ${doclabel}${caseTag}`,
    doc_requested_reply:   `${doclabel} uploaded (requested)${caseTag}`,
  };

  const link = `/lawyer/documents/${d.id}/review${
    d.application_id ? `?application_id=${d.application_id}` : ''
  }`;

  pushLawyerNotification({
    dedup_key:  `${type}:${d.id}:v${d.version}`,
    type,
    title:      titleMap[type],
    body:       bodyMap[type],
    link,
    timestamp:  d.uploaded_at || new Date().toISOString(),
  });
}

function fireAppPush(a: AssignedApplication): void {
  const clientName = a.client_name || 'New client';
  const visaLabel  = a.visa_type_label || a.visa_type || '';
  pushLawyerNotification({
    dedup_key:  `new_case:${a.application_id}`,
    type:       'new_case',
    title:      `New case assigned: ${clientName}`,
    body:       visaLabel ? `${visaLabel} · ready for intake review` : 'HR just assigned this to you.',
    link:       `/lawyer/cases/${a.application_id}`,
    timestamp:  a.assigned_at || new Date().toISOString(),
  });
}
