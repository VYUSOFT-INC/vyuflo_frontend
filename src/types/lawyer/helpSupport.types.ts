// src/types/lawyer/helpSupport.types.ts
//
// Help & Support — Lawyer side. Matches backend Swagger schema 1:1.

/* ── Enums ─────────────────────────────────────────────────────────── */
export type ArticleType        = 'faq' | 'guide' | 'video_tutorial' | 'policy';
export type ArticleCategory    = 'platform_config' | 'user_management' | 'billing' | 'integrations' | 'security' | 'all';

export type TicketStatus       = 'open' | 'in_progress' | 'resolved' | 'closed' | 'waiting_user';
export type TicketPriority     = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory     = 'technical' | 'billing' | 'account_profile' | 'feature_request' | 'other';

export type NotificationCategory = 'case_update' | 'deadline' | 'news' | 'security' | 'billing';
export type NotificationPriority = 'low' | 'normal' | 'urgent';

/* ════════════════════════════════════════════════════════════════════
   ARTICLES & FAQS (Screens 28, 29, 30, 31)
   ════════════════════════════════════════════════════════════════════ */
export interface HelpArticle {
  id:           string;
  title:        string;
  summary:      string;
  body:         string;          // rich text / markdown
  article_type: ArticleType | string;
  category:     ArticleCategory | string;
  tag:          string;
  view_count:   number;
  is_featured:  boolean;
  published_at: string;
  updated_at:   string;
}

export interface HelpArticleListResponse {
  items:       HelpArticle[];
  total:       number;
  page:        number;
  limit:       number;
  total_pages: number;
}

export interface HelpArticleListParams {
  page?:         number;
  limit?:        number;
  search?:       string;
  category?:     ArticleCategory | string;
  article_type?: ArticleType;
  featured?:     boolean;
}

/* ════════════════════════════════════════════════════════════════════
   TICKETS (Screens 32, 33, 34, 35)
   ════════════════════════════════════════════════════════════════════ */
export interface SubmitTicketPayload {
  subject:         string;
  body:            string;
  category:        TicketCategory;
  priority:        TicketPriority;
  application_id?: string;
}

export interface TicketReply {
  id:               string;
  ticket_id:        string;
  sender_id:        string;
  sender_type:      string;       // 'attorney' | 'support_agent'
  body:             string;
  is_read:          boolean;
  is_internal_note: boolean;
  created_at:       string;
}

/** Full ticket — returned by POST and GET /{ticket_id} (Screens 34, 35) */
export interface Ticket {
  id:             string;
  ticket_number:  string;          // e.g. "TKT-2026-001"
  subject:        string;
  body:           string;
  category:       TicketCategory | string;
  priority:       TicketPriority | string;
  status:         TicketStatus | string;
  application_id: string | null;
  created_at:     string;
  updated_at:     string;
  replies:        TicketReply[];
}

/** Lighter shape for list view (Screen 33) */
export interface TicketListItem {
  id:             string;
  ticket_number:  string;
  subject:        string;
  category:       string;
  priority:       string;
  status:         string;
  reply_count:    number;
  created_at:     string;
  updated_at:     string;
}

export interface TicketListResponse {
  items:        TicketListItem[];
  total:        number;
  /* Per-tab badge counts */
  open:         number;
  in_progress:  number;
  resolved:     number;
}

export interface TicketListParams {
  status?:   TicketStatus;
  category?: TicketCategory;
  page?:     number;
  limit?:    number;
}

export interface TicketReplyPayload {
  body: string;
}

/* ════════════════════════════════════════════════════════════════════
   NOTIFICATIONS (Screen 36)
   ════════════════════════════════════════════════════════════════════ */
export interface HelpNotification {
  id:                string;
  notification_type: string;
  category:          NotificationCategory | string;
  priority:          NotificationPriority | string;
  title:             string;
  body:              string;
  application_id:    string | null;
  case_reference:    string;
  cta_primary_label: string;       // e.g. "View case"
  cta_primary_url:   string;       // e.g. "/lawyer/cases/123"
  is_read:           boolean;
  read_at:           string | null;
  is_dismissed:      boolean;
  sent_via_email:    boolean;
  sent_via_push:     boolean;
  sent_via_sms:      boolean;
  created_at:        string;
}

export interface HelpNotificationListResponse {
  items:        HelpNotification[];
  total:        number;
  unread_count: number;           // for sidebar/bell badge
}

export interface HelpNotificationListParams {
  category?: NotificationCategory;
  is_read?:  boolean;
  page?:     number;
  limit?:    number;
}