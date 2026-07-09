// src/api/lawyer/notifReminders.api.ts
//
// API wrappers for the Notifications & Reminders module.

import api from '../axios';
import type {
  NotificationUpdateListResponse,
  ReminderCounts,
  ReminderListResponse,
} from '../../types/lawyer/notifReminders.types';

const BASE = '/notifications-reminders';

export const notifRemindersApi = {
  /** Powers the three tab badges. */
  getCounts: async (): Promise<ReminderCounts> => {
    const r = await api.get<ReminderCounts>(`${BASE}/counts`);
    return r.data;
  },

  /**
   * "All Updates" tab. Cursor pagination: omit `before` on first load,
   * then pass last item's `created_at` for Load Older.
   */
  listUpdates: async (params?: { before?: string; limit?: number }): Promise<NotificationUpdateListResponse> => {
    const r = await api.get<NotificationUpdateListResponse>(`${BASE}/updates`, { params });
    return r.data;
  },

  /** "Deadlines" tab — subset where category='deadline'. Same shape as updates. */
  listDeadlines: async (params?: { before?: string; limit?: number }): Promise<NotificationUpdateListResponse> => {
    const r = await api.get<NotificationUpdateListResponse>(`${BASE}/deadlines`, { params });
    return r.data;
  },

  /**
   * "Reminders" tab. include_past=true + before cursor → Load Older past reminders.
   * Default include_past=false → upcoming only, soonest first.
   */
  listReminders: async (params?: {
    include_past?: boolean;
    before?: string;
    limit?: number;
  }): Promise<ReminderListResponse> => {
    const r = await api.get<ReminderListResponse>(`${BASE}/reminders`, { params });
    return r.data;
  },

  /**
   * "Mark All as Read" button (top-right). Pass category=deadline to scope
   * only the Deadlines tab; omit for all.
   */
  markAllRead: async (category?: string): Promise<void> => {
    await api.post(`${BASE}/read-all`, undefined, {
      params: category ? { category } : undefined,
    });
  },
};