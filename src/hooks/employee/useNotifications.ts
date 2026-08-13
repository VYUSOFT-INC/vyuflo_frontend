// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from "react";
// import type { AxiosError } from "axios";
import type {
  Notification,
  NotificationCategory,
  NotificationPreferences,
  NotificationStatsResponse,
  UpdatePreferencesRequest,
  UseNotificationsReturn,
  UseNotificationStatsReturn,
  UseNotificationPreferencesReturn,
} from "../../types/employee/notification.types";
import { extractMessage } from "../../types/employee/notification.types";
import {
  listNotifications,
  getNotificationStats,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../../api/employee/notifications.api";
import { readIntakeRequests, toEmployeeNotification } from "../../lib/intakeRequests";
import {
  readSharedRemindersFor,
  toEmployeeNotification as sharedReminderToNotif,
} from "../../lib/sharedReminders";
import { useCurrentUser } from "../useAuth";
import { getUiSession } from "../../utils/uiSession";
import { notifRemindersApi } from "../../api/lawyer/notifReminders.api";
import type { NotificationUpdate } from "../../types/lawyer/notifReminders.types";

/** Convert a lawyer-side NotificationUpdate row into the generic
 *  Notification shape the bell + list use. */
function updateToNotification(u: NotificationUpdate): Notification {
  return {
    id:                u.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user_id:           '' as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notification_type: u.notification_type as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category:          u.category as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    priority:          u.priority as any,
    title:             u.title,
    body:              u.body,
    application_id:    null,
    case_reference:    u.case_reference ?? null,
    actor_id:          null,
    actor_label:       u.client_name ?? null,
    cta_primary_label: null,
    cta_primary_url:   null,
    is_read:           u.is_read,
    read_at:           null,
    is_dismissed:      u.is_dismissed,
    dismissed_at:      null,
    sent_via_email:    false,
    sent_via_push:     false,
    sent_via_sms:      false,
    expires_at:        null,
    created_at:        u.created_at,
    updated_at:        u.created_at,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const PAGE_SIZE = 20;

// ── useNotifications — paginated list + filter ────────────────────────────────

export function useNotifications(params?: {
  category?: NotificationCategory;
  is_read?:  boolean;
}): UseNotificationsReturn & {
  markRead:    (id: string) => Promise<void>;
  markAllRead: (cat?: NotificationCategory) => Promise<void>;
  dismiss:     (id: string) => Promise<void>;
} {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total,         setTotal]         = useState(0);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [urgentCount,   setUrgentCount]   = useState(0);
  const [hasMore,       setHasMore]       = useState(false);
  const [offset,        setOffset]        = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const paramsKey = JSON.stringify(params);
  const { data: me } = useCurrentUser();

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    setError(null);
    try {
      const currentOffset = reset ? 0 : offset;
      const data = await listNotifications({
        ...params,
        limit:  PAGE_SIZE,
        offset: currentOffset,
      });

      // Merge local intake-request notifications (dev bridge) — hides
      // automatically once backend also surfaces the same session via
      // its own Notification row. De-dup by title.
      let localIntakeNotifs: Notification[] = [];
      let localEventNotifs:  Notification[] = [];
      if (reset) {
        try {
          const reqs = readIntakeRequests().filter((r) => !r.completed);
          const backendTitles = new Set(data.items.map((n) => n.title));
          localIntakeNotifs = reqs
            .map((r) => toEmployeeNotification(r) as Notification)
            .filter((n) => !backendTitles.has(n.title));
        } catch { /* ignore */ }

        // Merge shared calendar-event reminders — lawyer-created events
        // linked to this employee's cases. Removes once backend inserts
        // a real Notification row on POST /calendar/events (spec sent).
        try {
          const fullName = me
            ? [me.first_name, me.last_name].filter(Boolean).join(' ')
            : '';
          const shared = readSharedRemindersFor({
            email:  me?.email,
            name:   fullName,
            userId: me?.id,
          });
          const backendTitles = new Set(data.items.map((n) => n.title));
          localEventNotifs = shared
            .map((r) => sharedReminderToNotif(r) as Notification)
            .filter((n) => !backendTitles.has(n.title));
        } catch { /* ignore */ }
      }

      // Lawyer & HR use a different reader endpoint (/notifications-reminders/*)
      // for calendar reminders / deadlines / updates. Merge those into the
      // bell + list so the icon shows the same items as the full page.
      let lawyerUpdates: Notification[] = [];
      let lawyerUnread  = 0;
      if (reset) {
        const roles = getUiSession()?.roles ?? [];
        const wantsLawyerFeed = roles.includes('attorney') || roles.includes('hr');
        if (wantsLawyerFeed) {
          try {
            const res = await notifRemindersApi.listUpdates({ limit: PAGE_SIZE });
            const backendIds = new Set(data.items.map((n) => n.id));
            const backendTitles = new Set(data.items.map((n) => n.title));
            lawyerUpdates = (res.items ?? [])
              .filter((u) => !backendIds.has(u.id) && !backendTitles.has(u.title))
              .map(updateToNotification);
            lawyerUnread = res.total_unread ?? 0;
          } catch { /* silent */ }
        }
      }

      const localExtras = [...lawyerUpdates, ...localEventNotifs, ...localIntakeNotifs];
      setNotifications(prev =>
        reset ? [...localExtras, ...data.items] : [...prev, ...data.items]
      );
      setTotal(data.total + (reset ? localExtras.length : 0));
      setUnreadCount(
        data.unread_count +
        (reset ? (lawyerUnread || lawyerUpdates.filter((n) => !n.is_read).length) : 0) +
        (reset ? localEventNotifs.length + localIntakeNotifs.length : 0),
      );
      setUrgentCount(data.urgent_count + (reset ? localExtras.length : 0));
      setHasMore(data.has_more);
      if (reset) setOffset(PAGE_SIZE);
      else setOffset(currentOffset + PAGE_SIZE);
    } catch (e) {
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, offset]);

  const refetch  = useCallback(() => load(true),  [load]);
  const loadMore = useCallback(() => load(false), [load]);

  useEffect(() => { void load(true); }, [paramsKey, me?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark single read — optimistic update
  const markRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      // revert on failure
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Mark all read — optimistic
  const markAllRead = useCallback(async (cat?: NotificationCategory) => {
    setNotifications(prev =>
      prev.map(n =>
        (!cat || n.category === cat) ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsRead(cat);
    } catch {
      void load(true);
    }
  }, [load]);

  // Dismiss — remove from list optimistically
  const dismiss = useCallback(async (id: string) => {
    const target = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (target && !target.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await dismissNotification(id);
    } catch {
      if (target) setNotifications(prev => [target, ...prev]);
    }
  }, [notifications]);

  return {
    notifications, total, unreadCount, urgentCount, hasMore,
    loading, error, refetch, loadMore,
    markRead, markAllRead, dismiss,
  };
}

// ── useNotificationStats — header badge counts ────────────────────────────────

export function useNotificationStats(): UseNotificationStatsReturn {
  const [stats,   setStats]   = useState<NotificationStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await getNotificationStats());
    } catch (e) {
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { stats, loading, error, refetch: load };
}

// ── useNotificationPreferences ────────────────────────────────────────────────

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [prefs,   setPrefs]   = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setPrefs(await getNotificationPreferences());
      } catch (e) {
        setError(extractMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = useCallback(async (data: UpdatePreferencesRequest) => {
    setSaving(true);
    setError(null);
    // Optimistic update
    setPrefs(prev => prev ? { ...prev, ...data } : prev);
    try {
      const updated = await updateNotificationPreferences(data);
      setPrefs(updated);
    } catch (e) {
      setError(extractMessage(e));
      // Revert optimistic — refetch
      try { setPrefs(await getNotificationPreferences()); } catch { /* noop */ }
    } finally {
      setSaving(false);
    }
  }, []);

  return { prefs, loading, saving, error, update };
}
