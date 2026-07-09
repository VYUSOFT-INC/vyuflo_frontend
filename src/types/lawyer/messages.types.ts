// src/types/lawyer/messages.types.ts
//
// All types for the Secure Messages module — aligned with the live Swagger
// at lying-cruelly-scanner.ngrok-free.dev (verified 2026-06-25).
//
// Endpoints covered:
//   POST   /api/v1/messages/conversations
//   GET    /api/v1/messages/conversations
//   GET    /api/v1/messages/conversations/{thread_id}
//   GET    /api/v1/messages/conversations/{thread_id}/messages
//   POST   /api/v1/messages/conversations/{thread_id}/messages   (multipart!)
//   PATCH  /api/v1/messages/conversations/{thread_id}/read
//   GET    /api/v1/messages/templates
//   POST   /api/v1/messages/templates                            (admin)
//   PATCH  /api/v1/messages/templates/{id}                       (admin)
//   DELETE /api/v1/messages/templates/{id}                       (admin)

/* ════════════════════════════════════════════════════════════════════
   ENUMS
   ════════════════════════════════════════════════════════════════════ */

/** Thread types supported by backend. */
export type ThreadType = 'direct' | 'group';

/** Role labels seen on participant records. */
export type ParticipantRole = 'attorney' | 'client' | 'support_agent' | 'admin' | string;

/** Frontend-only workflow status (NOT in backend payload — UI annotation). */
export type ThreadStatus =
  | 'pending'
  | 'in_progress'
  | 'action_required'
  | 'resolved'
  | 'archived';

/** Reply-template categorisation for chip groups above the composer. */
export type TemplateCategory = 'document' | 'approval' | 'general' | 'follow_up';

/**
 * Message types — what kind of bubble to render.
 * 'text'  → plain text bubble
 * 'image' → image preview + optional caption
 * 'file'  → document attachment card
 * 'call'  → call event card (uses call_duration_seconds + call_status)
 * 'system' → centered system event
 */
export type MessageType = 'text' | 'image' | 'file' | 'call' | 'system';

/**
 * Derived locally on the frontend from `sender_id`.
 *   sender_id === thread.participant_id → 'client'   (left, white bubble)
 *   else                                → 'attorney' (right, indigo bubble)
 */
export type MessageSenderType = 'attorney' | 'client' | 'system';

/* ════════════════════════════════════════════════════════════════════
   THREAD (conversation)
   ════════════════════════════════════════════════════════════════════ */

/**
 * Shape returned by GET /conversations (list + each item) AND
 * GET /conversations/{id} (single) AND POST /conversations (create result).
 * Backend already collapses "the other participant" into participant_* fields
 * for direct threads.
 */
export interface MessageThread {
  id: string;
  thread_type: ThreadType;
  title: string;
  application_id?: string | null;
  is_archived: boolean;

  /* The OTHER party (from current user's perspective) */
  participant_id: string;
  participant_name: string;
  participant_role: ParticipantRole;
  avatar_url?: string | null;
  is_online: boolean;

  /* Preview / sort fields */
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  created_at: string;

  /* ── Frontend-augmented fields (NOT in payload — UI annotations) ── */
  action_required?: boolean | null;
  thread_status?: ThreadStatus | null;
  case_number?: string | null;
  visa_type_code?: string | null;
}

/** GET /messages/conversations response envelope. */
export interface ThreadListResponse {
  items: MessageThread[];
  total: number;
}

/** Body for POST /messages/conversations. */
export interface CreateThreadPayload {
  thread_type: ThreadType;
  /** Array of UUIDs — for direct threads, exactly 1 element (the other user). */
  participant_ids: string[];
  /** Optional display title. */
  title?: string;
  /** Optional case link. */
  application_id?: string;
  /** Optional first message seeded into the thread. */
  initial_message?: string;
}

/* ════════════════════════════════════════════════════════════════════
   MESSAGE (single bubble in conversation)
   ════════════════════════════════════════════════════════════════════ */

/**
 * Shape returned by GET /conversations/{id}/messages.
 *
 * IMPORTANT — backend uses FLAT attachment fields (not a nested array).
 * If a message has a file, `attachment_url` is non-null; otherwise null.
 *
 * `sender_type` is NOT returned by backend. Derive locally:
 *   if message.sender_id === thread.participant_id → 'client'
 *   else                                            → 'attorney'
 */
export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;

  /** Plain text body. Backend calls this "content" (not "body"). */
  content: string;

  /** What kind of message — controls bubble rendering. */
  message_type: MessageType | string;

  /* ── Flat attachment fields (all optional, all null when no attachment) ── */
  attachment_name?: string | null;
  attachment_url?: string | null;
  /** Backend returns a STRING (e.g. "245 KB"), not a number. */
  attachment_size?: string | null;
  /** Linked Document record (if attachment is a stored doc). */
  document_id?: string | null;

  /* ── Call event fields (only set when message_type === 'call') ────── */
  call_duration_seconds?: number | null;
  call_status?: string | null;

  /* ── Flags + timestamps ──────────────────────────────────────────── */
  is_read: boolean;
  is_edited?: boolean | null;
  is_deleted?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}

/** GET /conversations/{id}/messages query params. */
export interface ListMessagesParams {
  /** 1 — 200, default 50. */
  limit?: number;
  /** ≥ 0, default 0. */
  offset?: number;
}

/** GET /conversations/{id}/messages response envelope. */
export interface MessageListResponse {
  items: Message[];
  total: number;
}

/**
 * Body for POST /conversations/{id}/messages.
 *
 * IMPORTANT — endpoint accepts `multipart/form-data` (not JSON).
 * Caller passes EITHER `content` (text only) OR `file` (with optional caption).
 */
export interface SendMessagePayload {
  content?: string;
  file?: File | null;
}

/** Response from PATCH /conversations/{id}/read. */
export interface MarkReadResponse {
  thread_id: string;
  unread_count: number;
}

/* ════════════════════════════════════════════════════════════════════
   REPLY TEMPLATES (admin-only CRUD; lawyer can only LIST)
   ════════════════════════════════════════════════════════════════════ */

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
  category: TemplateCategory | string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface TemplateListResponse {
  items: MessageTemplate[];
  total: number;
}

export interface UpsertTemplatePayload {
  name: string;
  body: string;
  category: TemplateCategory | string;
  sort_order?: number;
  is_active?: boolean;
}

/* ════════════════════════════════════════════════════════════════════
   UI FILTER (left-panel chips — client-side only)
   ════════════════════════════════════════════════════════════════════ */
export type ThreadFilter = 'all' | 'unread' | 'action_required';