// src/api/lawyer/messages.api.ts
//
// API wrappers for the Secure Messages module — aligned with live Swagger
// (verified 2026-06-25).

import api from '../axios';
import type {
  CreateThreadPayload,
  ListMessagesParams,
  MarkReadResponse,
  Message,
  MessageListResponse,
  MessageTemplate,
  MessageThread,
  SendMessagePayload,
  TemplateListResponse,
  ThreadListResponse,
  UpsertTemplatePayload,
} from '../../types/lawyer/messages.types';

export const messagesApi = {
  /* ════════════════════════════════════════════════════════════════
     THREADS
     ════════════════════════════════════════════════════════════════ */

  /** Left-panel thread list. */
  listThreads: async (params?: { search?: string }): Promise<ThreadListResponse> => {
    const r = await api.get<ThreadListResponse>('/messages/conversations', {
      params: params?.search ? { search: params.search } : undefined,
    });
    return r.data;
  },

  /** Right-panel header. */
  getThread: async (threadId: string): Promise<MessageThread> => {
    const r = await api.get<MessageThread>(`/messages/conversations/${threadId}`);
    return r.data;
  },

  /**
   * Create a new direct or group thread. Backend is idempotent for direct
   * threads — if one already exists between the two users, it returns it
   * instead of creating a duplicate.
   */
  createThread: async (payload: CreateThreadPayload): Promise<MessageThread> => {
    const r = await api.post<MessageThread>('/messages/conversations', payload);
    return r.data;
  },

  /* ════════════════════════════════════════════════════════════════
     MESSAGES
     ════════════════════════════════════════════════════════════════ */

  /**
   * List messages (oldest-first, natural chat order). Supports pagination
   * via limit/offset for loading older history.
   *
   * @param threadId UUID
   * @param params   { limit?: 1-200 (default 50), offset?: ≥0 (default 0) }
   */
  listMessages: async (
    threadId: string,
    params?: ListMessagesParams,
  ): Promise<MessageListResponse> => {
    const r = await api.get<MessageListResponse>(
      `/messages/conversations/${threadId}/messages`,
      { params },
    );
    return r.data;
  },

  /**
   * Send a text message or file attachment.
   *
   * BACKEND REQUIRES `multipart/form-data` (NOT JSON!).
   * We send both fields:
   *   - `content` — text (string or empty)
   *   - `file`    — binary (or omitted)
   *
   * Backend automatically increments unread_count for all other participants.
   */
  sendMessage: async (threadId: string, payload: SendMessagePayload): Promise<Message> => {
    const form = new FormData();
    /* Always append content — backend treats empty string as "no caption" */
    form.append('content', payload.content ?? '');
    if (payload.file) {
      form.append('file', payload.file, payload.file.name);
    }

    const r = await api.post<Message>(
      `/messages/conversations/${threadId}/messages`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return r.data;
  },

  /**
   * Reset current user's unread_count to 0 for this thread.
   * Method is PATCH (not POST).
   */
  markThreadRead: async (threadId: string): Promise<MarkReadResponse> => {
    const r = await api.patch<MarkReadResponse>(
      `/messages/conversations/${threadId}/read`,
    );
    return r.data;
  },

  /* ════════════════════════════════════════════════════════════════
     REPLY TEMPLATES (composer chips)
     ════════════════════════════════════════════════════════════════ */

  listTemplates: async (category?: string): Promise<TemplateListResponse> => {
    const r = await api.get<TemplateListResponse>('/messages/templates', {
      params: category ? { category } : undefined,
    });
    return r.data;
  },

  /** Admin-only — create chip. */
  createTemplate: async (payload: UpsertTemplatePayload): Promise<MessageTemplate> => {
    const r = await api.post<MessageTemplate>('/messages/templates', payload);
    return r.data;
  },

  /** Admin-only — edit chip. */
  updateTemplate: async (
    templateId: string,
    payload: UpsertTemplatePayload,
  ): Promise<MessageTemplate> => {
    const r = await api.patch<MessageTemplate>(
      `/messages/templates/${templateId}`,
      payload,
    );
    return r.data;
  },

  /** Admin-only — soft-delete chip (is_active=false). */
  deactivateTemplate: async (templateId: string): Promise<void> => {
    await api.delete(`/messages/templates/${templateId}`);
  },
};