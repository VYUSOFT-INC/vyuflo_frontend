// src/types/admin/notifications.types.ts
//
// Admin cross-role Notifications & Reminders module.
// Mirrors the attorney NotificationsReminders types PLUS 2 extras that only
// admin sees: `triggered_by_*` (who fired the event) and `recipient_*`
// (which user/role the event was delivered to).

export type AdminNotificationType =
  | 'task_assigned'
  | 'deadline_approaching'
  | 'document_approved'
  | 'case_status_updated'
  | 'participant_added'
  | 'document_uploaded'
  | 'document_comment'
  | 'weekly_summary'
  | 'security_alert'
  | 'payment_receipt'
  | 'immigration_news'
  | 'approval_pending'
  | 'approval_resolved'
  | 'compliance_alert'
  | 'employee_onboarded'
  | 'employee_profile_updated'
  | string;

export type AdminNotificationCategory =
  | 'deadline'
  | 'case_update'
  | 'task'
  | 'document'
  | 'approval'
  | 'compliance'
  | 'employee'
  | 'security'
  | 'news'
  | 'billing'
  | string;

export type AdminNotificationPriority = 'urgent' | 'high' | 'medium' | 'low' | string;

export type AdminRoleFilter = 'all' | 'hr' | 'admin' | 'employee' | 'lawyer';

/* ────────────────────────────────────────────────────────────────── */

export interface AdminReminderCounts {
  all_updates_unread: number;
  reminders_total:    number;
  deadlines_unread:   number;
}

/** Single row in Updates + Deadlines tabs. */
export interface AdminNotificationUpdate {
  id: string;
  notification_type: AdminNotificationType;
  badge_label:  string;
  category:     AdminNotificationCategory;
  priority:     AdminNotificationPriority;
  title:        string;
  body:         string;

  /** Enriched from linked application. */
  client_name?:     string | null;
  visa_type_code?:  string | null;
  case_reference?:  string | null;

  /** Who fired the event (admin-only fields). */
  triggered_by_user_id?:   string | null;
  triggered_by_user_name?: string | null;
  triggered_by_role?:      string | null;

  /** Who this notification was delivered to (admin-only fields). */
  recipient_user_id:    string;
  recipient_user_name?: string | null;
  recipient_role?:      string | null;

  created_at:      string;
  is_read:         boolean;
  is_dismissed:    boolean;
  show_unread_dot: boolean;
}

export interface AdminNotificationUpdateListResponse {
  items:        AdminNotificationUpdate[];
  total_unread: number;
  has_more:     boolean;
  next_cursor?: string | null;
}

/** Reminders tab item — driven by calendar_events with reminder_enabled=true. */
export interface AdminReminderItem {
  id: string;
  title: string;
  badge_label: string;
  event_date:  string;
  start_time:  string;
  reminder_minutes: number;

  client_name?:     string | null;
  visa_type_code?:  string | null;
  case_reference?:  string | null;

  /** Who owns the reminder (admin sees cross-user). */
  owner_user_id?:   string | null;
  owner_user_name?: string | null;
  owner_role?:      string | null;

  is_upcoming: boolean;
  created_at:  string;
}

export interface AdminReminderListResponse {
  items:        AdminReminderItem[];
  total:        number;
  has_more:     boolean;
  next_cursor?: string | null;
}

/** Frontend tab identifier — drives which list to fetch. */
export type AdminRemindersTab = 'all_updates' | 'reminders' | 'deadlines';