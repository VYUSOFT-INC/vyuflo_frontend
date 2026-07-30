// src/api/admin/notifications.api.ts
//
// Admin cross-role Notifications & Reminders API wrappers.
// Backed by /api/v1/admin/notifications-reminders/*  (see backend spec).

import api from '../axios';
import type {
  AdminNotificationUpdateListResponse,
  AdminReminderCounts,
  AdminReminderListResponse,
  AdminRoleFilter,
} from '../../types/admin/notifications.types';

const BASE = '/admin/notifications-reminders';

interface UpdatesQuery {
  role_filter?: AdminRoleFilter;
  user_id?:     string;
  before?:      string;
  limit?:       number;
}

interface RemindersQuery {
  role_filter?:  AdminRoleFilter;
  user_id?:      string;
  include_past?: boolean;
  before?:       string;
  limit?:        number;
}

/* Small helper — strip undefined / empty query params. */
function clean<T extends Record<string, unknown>>(o: T): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v as string | number | boolean;
  }
  return out;
}

export const adminNotifRemindersApi = {
  /** Tab-badge counts. */
  getCounts: async (role_filter: AdminRoleFilter = 'all'): Promise<AdminReminderCounts> => {
    const r = await api.get<AdminReminderCounts>(`${BASE}/counts`, {
      params: clean({ role_filter }),
    });
    return r.data;
  },

  /** "All Updates" tab. */
  listUpdates: async (q: UpdatesQuery = {}): Promise<AdminNotificationUpdateListResponse> => {
    const r = await api.get<AdminNotificationUpdateListResponse>(`${BASE}/updates`, {
      params: clean(q as Record<string, unknown>),
    });
    return r.data;
  },

  /** "Deadlines" tab — subset where category='deadline'. Same shape as updates. */
  listDeadlines: async (q: UpdatesQuery = {}): Promise<AdminNotificationUpdateListResponse> => {
    const r = await api.get<AdminNotificationUpdateListResponse>(`${BASE}/deadlines`, {
      params: clean(q as Record<string, unknown>),
    });
    return r.data;
  },

  /** "Reminders" tab. */
  listReminders: async (q: RemindersQuery = {}): Promise<AdminReminderListResponse> => {
    const r = await api.get<AdminReminderListResponse>(`${BASE}/reminders`, {
      params: clean(q as Record<string, unknown>),
    });
    return r.data;
  },

  /** Mark All as Read — optional category scope (defaults to all tabs). */
  markAllRead: async (category?: string): Promise<void> => {
    await api.post(`${BASE}/read-all`, undefined, {
      params: category ? { category } : undefined,
    });
  },
};