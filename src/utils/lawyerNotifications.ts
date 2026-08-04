// src/utils/lawyerNotifications.ts
//
// Local, browser-side notification queue for the LAWYER role.
//
// Why a local store?
//   The backend `/notifications-reminders` endpoints are still being fleshed
//   out.  Meanwhile we can already generate high-value notifications purely
//   from data the lawyer app is polling anyway — new client uploads, new
//   chat messages, new HR assignments, calendar reminders firing.  This
//   utility is the write-side for those synthesized notifications; the
//   Notifications & Reminders page merges these entries with whatever the
//   backend eventually returns so the upgrade is transparent.
//
// SURFACES
//   1. Sidebar bell — reads unreadCount() and reflects it as a badge.
//   2. NotificationToaster — subscribes to CHANGE_EVENT and pops a toast for
//                           the newest unread entry.
//   3. NotificationsRemindersPage — lists all entries under the Notifications
//                                   tab, merged with the backend list.
//
// SAFETY
//   - Wrapped in try/catch so a stuck localStorage never crashes the app.
//   - Auto-prunes entries older than 30 days on every read.
//   - Deduplicates by `dedup_key` so the watcher can re-fire the same
//     signal safely (idempotent). The watcher hook computes stable keys
//     from resource IDs.
//   - Skips entirely in SSR / non-browser contexts.

const KEY = 'Vyuflo.lawyer.local_notifications.v1';

/** Category of the notification — drives the icon, colour and default link. */
export type LawyerNotificationType =
  | 'doc_upload'              // client uploaded a new document
  | 'doc_reupload'            // client re-uploaded a previously-rejected doc
  | 'doc_requested_reply'     // client answered a "Request Additional Doc"
  | 'chat_message'            // new chat message from a client
  | 'new_case'                // HR assigned a new application to me
  | 'deadline_approaching'    // deadline within the warning window
  | 'deadline_passed'         // deadline in the past, not completed
  | 'calendar_fire';          // calendar reminder fired (T-x minutes)

/** One notification entry in the local queue. */
export interface LawyerNotification {
  /** Stable id — synthesized from dedup_key + timestamp. */
  id:          string;
  /** Idempotency key so the poller can re-fire safely.
   *  Callers should include enough context that "the same event" produces
   *  the same key (e.g. `doc_upload:{doc_id}` or `chat_message:{conv_id}:{msg_id}`). */
  dedup_key:   string;
  type:        LawyerNotificationType;
  title:       string;
  body:        string;
  /** Route we open when the user clicks the toast / row. */
  link:        string;
  /** Timestamp we should display + sort by.  ISO string. */
  timestamp:   string;
  /** Read state. Newly pushed entries default to false. */
  read:        boolean;
}

/** Custom DOM event fired on every write.  Subscribers (bell badge, toaster,
 *  notifications page) refresh off this instead of polling localStorage. */
export const LAWYER_NOTIFICATIONS_EVENT = 'Vyuflo:lawyer-notifications-changed';

function safeRead(): LawyerNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LawyerNotification[];
  } catch {
    return [];
  }
}

function safeWrite(items: LawyerNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(LAWYER_NOTIFICATIONS_EVENT));
  } catch {
    /* quota / private-mode — ignore */
  }
}

/** Drop entries older than 30 days on read so localStorage stays lean. */
function prune(items: LawyerNotification[]): LawyerNotification[] {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return items.filter((n) => {
    const t = Date.parse(n.timestamp || '');
    if (Number.isNaN(t)) return true;
    return t >= cutoff;
  });
}

/** Return the current list, newest-first, pruned of old entries. */
export function listLawyerNotifications(): LawyerNotification[] {
  const list = prune(safeRead());
  return [...list].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/** How many unread entries — used by the sidebar bell + page tab badge. */
export function unreadLawyerNotificationCount(): number {
  return safeRead().filter((n) => !n.read).length;
}

/** Push a new notification. Idempotent on `dedup_key`: if a row with the
 *  same key already exists we do NOT create a duplicate.  Returns the
 *  entry that ended up in the store (existing or new). */
export function pushLawyerNotification(
  input: Omit<LawyerNotification, 'id' | 'read'> & Partial<Pick<LawyerNotification, 'read'>>,
): LawyerNotification {
  const list = safeRead();
  const existing = list.find((n) => n.dedup_key === input.dedup_key);
  if (existing) return existing;

  const created: LawyerNotification = {
    id:        `lnn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    read:      false,
    ...input,
  };
  const next = prune([created, ...list]);
  safeWrite(next);
  return created;
}

/** Mark one entry as read. */
export function markLawyerNotificationRead(id: string): void {
  const list = safeRead();
  let changed = false;
  const next = list.map((n) => {
    if (n.id === id && !n.read) { changed = true; return { ...n, read: true }; }
    return n;
  });
  if (changed) safeWrite(next);
}

/** Mark every entry as read. */
export function markAllLawyerNotificationsRead(): void {
  const list = safeRead();
  const next = list.map((n) => (n.read ? n : { ...n, read: true }));
  safeWrite(next);
}

/** Delete a single entry (e.g. from a swipe-to-dismiss). */
export function dismissLawyerNotification(id: string): void {
  const next = safeRead().filter((n) => n.id !== id);
  safeWrite(next);
}

/** Wipe the queue entirely — used from Settings for the "Clear all" action. */
export function clearAllLawyerNotifications(): void {
  safeWrite([]);
}

export const lawyerNotifications = {
  list:           listLawyerNotifications,
  unreadCount:    unreadLawyerNotificationCount,
  push:           pushLawyerNotification,
  markRead:       markLawyerNotificationRead,
  markAllRead:    markAllLawyerNotificationsRead,
  dismiss:        dismissLawyerNotification,
  clearAll:       clearAllLawyerNotifications,
  EVENT:          LAWYER_NOTIFICATIONS_EVENT,
};
