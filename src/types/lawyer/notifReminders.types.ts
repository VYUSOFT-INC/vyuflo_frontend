// src/types/lawyer/notifReminders.types.ts
//
// Notifications & Reminders module — Figma Screen 24 (node 35:2385).
// Backed by /api/v1/notifications-reminders/* endpoints.

export type NotificationType =
  | 'task_assigned'        // "Task Assigned"
  | 'deadline_approaching' // "Urgent Deadline" (priority=urgent) or "Deadline"
  | 'document_approved'    // "Document Added"
  | 'case_status_updated'  // "Case Update"
  | string;

export type NotificationCategory =
  | 'deadline'
  | 'case_update'
  | 'task'
  | 'document'
  | string;

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low' | string;

/** Tab badge counts — GET /counts. */
export interface ReminderCounts {
  all_updates_unread: number;
  reminders_total:    number;
  deadlines_unread:   number;
}

/** Single update item — same shape used for All Updates AND Deadlines tabs. */
export interface NotificationUpdate {
  id: string;
  notification_type: NotificationType;
  /** Auto-derived label like "Urgent Deadline" / "Document Added" / etc. */
  badge_label: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  /** Enriched from the linked application. */
  client_name?: string | null;
  visa_type_code?: string | null;
  /** Pretty case label e.g. "#VF-2026-089". */
  case_reference?: string | null;
  created_at: string;
  is_read: boolean;
  is_dismissed: boolean;
  show_unread_dot: boolean;
}

export interface NotificationUpdateListResponse {
  items: NotificationUpdate[];
  total_unread: number;
  has_more: boolean;
  /** Pass back as `before` to load older. */
  next_cursor?: string | null;
}

/** Reminder item — driven by calendar_events with reminder_enabled=true. */
export interface ReminderItem {
  id: string;
  title: string;
  /** Auto-derived: "1-Hour Reminder" / "1-Day Reminder" / "2-Day Reminder". */
  badge_label: string;
  event_date: string;        // YYYY-MM-DD
  start_time: string;        // HH:MM:SS.SSSZ
  reminder_minutes: number;  // 60 / 1440 / 2880…
  client_name?: string | null;
  visa_type_code?: string | null;
  case_reference?: string | null;
  is_upcoming: boolean;
  created_at: string;
}

export interface ReminderListResponse {
  items: ReminderItem[];
  total: number;
  has_more: boolean;
  next_cursor?: string | null;
}

/** Frontend tab identifier — drives which list to fetch. */
export type RemindersTab = 'all_updates' | 'reminders' | 'deadlines';