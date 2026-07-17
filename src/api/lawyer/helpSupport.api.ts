// src/api/lawyer/helpSupport.api.ts
//
// Help & Support endpoints — Attorney scope (10 routes).
// All requests use the shared axios instance — JWT attached via interceptor.

import axios from '../axios';
import type {
  HelpArticle,
  HelpArticleListParams,
  HelpArticleListResponse,
  HelpNotification,
  HelpNotificationListParams,
  HelpNotificationListResponse,
  SubmitTicketPayload,
  Ticket,
  TicketListParams,
  TicketListResponse,
  TicketReply,
  TicketReplyPayload,
} from '../../types/lawyer/helpSupport.types';

/* ── Articles ─────────────────────────────────────────────────────── */

/**
 * Powers THREE UI components:
 *   • Screen 30 — Search Results   : ?search=passport
 *   • Screen 31 — Browse by category: ?category=billing
 *   • Screen 31 — Popular Articles  : ?featured=true&limit=3
 *   • Screen 31 — FAQ section       : ?article_type=faq
 */
export async function listArticles(
  params?: HelpArticleListParams,
): Promise<HelpArticleListResponse> {
  const res = await axios.get<HelpArticleListResponse>('/help/articles', { params });
  return res.data;
}

/** Get single article detail — Screen 29. Auto-increments view_count. */
export async function getArticle(articleId: string): Promise<HelpArticle> {
  const res = await axios.get<HelpArticle>(`/help/articles/${articleId}`);
  return res.data;
}

/* ── Tickets ──────────────────────────────────────────────────────── */

/**
 * Submit a support ticket — Screen 32.
 * Returns full ticket detail — used immediately by Screen 35 (confirmation).
 */
export async function submitTicket(payload: SubmitTicketPayload): Promise<Ticket> {
  const res = await axios.post<Ticket>('/help/tickets', payload);
  return res.data;
}

/**
 * List my tickets — Screen 33. Filter by status for tabs.
 * Response includes open/in_progress/resolved counts for tab badges.
 */
export async function listMyTickets(params?: TicketListParams): Promise<TicketListResponse> {
  const res = await axios.get<TicketListResponse>('/help/tickets', { params });
  return res.data;
}

/**
 * Get ticket detail with reply thread — Screen 34 + Screen 35.
 * Internal notes are hidden from the lawyer.
 */
export async function getTicket(ticketId: string): Promise<Ticket> {
  const res = await axios.get<Ticket>(`/help/tickets/${ticketId}`);
  return res.data;
}

/**
 * Reply to a support ticket — Screen 34.
 * ⚠ Automatically advances ticket status from 'open' → 'in_progress'.
 * Returns 409 if ticket is already resolved or closed.
 */
export async function replyToTicket(
  ticketId: string,
  payload: TicketReplyPayload,
): Promise<TicketReply> {
  const res = await axios.post<TicketReply>(`/help/tickets/${ticketId}/replies`, payload);
  return res.data;
}

/* ── Notifications ────────────────────────────────────────────────── */

/**
 * List past notifications — Screen 36.
 * Excludes dismissed entries by default. Filter by category and is_read.
 * Response includes `unread_count` for the bell badge.
 */
export async function listNotifications(
  params?: HelpNotificationListParams,
): Promise<HelpNotificationListResponse> {
  const res = await axios.get<HelpNotificationListResponse>('/help/notifications', { params });
  return res.data;
}

/** Mark a single notification as read — Screen 36. */
export async function markNotificationRead(notificationId: string): Promise<HelpNotification> {
  const res = await axios.patch<HelpNotification>(`/help/notifications/${notificationId}/read`);
  return res.data;
}

/** Mark all notifications as read — Screen 36 'Mark all read' button. */
export async function markAllNotificationsRead(): Promise<Record<string, never>> {
  const res = await axios.post<Record<string, never>>('/help/notifications/mark-all-read');
  return res.data;
}

/** Dismiss (hide) a notification — Screen 36. */
export async function dismissNotification(notificationId: string): Promise<Record<string, never>> {
  const res = await axios.delete<Record<string, never>>(`/help/notifications/${notificationId}`);
  return res.data;
}

/* ── Bundled export ───────────────────────────────────────────────── */
export const helpSupportApi = {
  // Articles
  listArticles,
  getArticle,
  // Tickets
  submitTicket,
  listMyTickets,
  getTicket,
  replyToTicket,
  // Notifications
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
};