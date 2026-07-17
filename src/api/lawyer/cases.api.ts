// src/api/lawyer/cases.api.ts
//
// Thin wrappers over the Attorney-Applications + nested sub-resources.
// All endpoints exist in Swagger; no new backend work needed.
//
// PRIMARY source for the Case List page is GET /lawyer/applications —
// the same endpoint the Intake landing screen uses. That way any case
// HR has assigned to the logged-in attorney appears in /lawyer/cases
// automatically. The generic /applications endpoint is kept for admin /
// cross-attorney views.
//
// IMPORTANT: never hardcode IDs / paths in callers — always go through this
// module so the path strings stay in one place and can be swapped later.

import api from '../axios';
import type {
  CaseListItem,
  CaseListResponse,
  CaseListParams,
  CaseDetail,
  CaseComment,
  CaseCommentListResponse,
  CaseCommentCreate,
  CaseCommentUpdate,
  CaseDeadline,
  CaseDeadlineListResponse,
  CaseDeadlineCreate,
  CaseDeadlineUpdate,
  CaseStatusHistoryResponse,
} from '../../types/lawyer/cases.types';
import type { AssignedApplication } from '../../types/lawyer/intake.types';

const BASE = '/applications';

/** UUID guard — short-circuit API calls when the id is a mock ("case-001"). */
export const isLikelyUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Pretty label for an IntakeStatus value. */
const intakeStatusLabel = (s: string): string => {
  switch (s) {
    case 'pending_intake':      return 'Pending Intake';
    case 'intake_in_progress':  return 'Intake In Progress';
    case 'intake_completed':    return 'Intake Completed';
    default:                    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

/** Map an HR-assigned `/lawyer/applications` row → Case List row. */
export function fromAssignedApplication(a: AssignedApplication): CaseListItem {
  return {
    id:                     a.application_id,
    case_reference:         `#${a.application_id.slice(0, 8).toUpperCase()}`,
    client_id:              a.client_id || a.user_id || a.application_id,
    client_name:            a.client_name || 'Client',
    client_email:           a.client_email || null,
    client_avatar_url:      null,
    employer_name:          null,
    visa_type_code:         a.visa_type_label || a.visa_type || '—',
    status:                 a.status,
    status_label:           intakeStatusLabel(a.status),
    urgency:                'medium',
    days_to_next_deadline:  null,
    next_deadline_label:    null,
    action_required:        a.status === 'pending_intake' || a.status === 'intake_in_progress',
    has_alert:              false,
    assigned_attorney_id:   'me',
    assigned_attorney_name: 'You',
    filing_date:            null,
    created_at:             a.assigned_at,
    updated_at:             a.assigned_at,
  };
}

export const casesApi = {
  /* ── HR-assigned worklist (PRIMARY SOURCE for /lawyer/cases) ─────────
     Same endpoint the Intake landing screen uses, so any case HR has
     already assigned to the logged-in attorney shows up here automatically. */
  listMyCases: async (statusFilter?: string): Promise<CaseListItem[]> => {
    const r = await api.get<AssignedApplication[]>('/lawyer/applications', {
      params: statusFilter ? { status_filter: statusFilter } : undefined,
    });
    return (r.data || []).map(fromAssignedApplication);
  },

  /* ── Generic list (kept as a fallback for admin / cross-attorney views). */
  listCases: async (params?: CaseListParams): Promise<CaseListResponse> => {
    const r = await api.get<CaseListResponse>(BASE, { params });
    return r.data;
  },

  /* ── Detail (Case Details / Overview pages) ────────────────────────── */
  getCase: async (applicationId: string): Promise<CaseDetail> => {
    const r = await api.get<CaseDetail>(`${BASE}/${applicationId}`);
    return r.data;
  },

  /* ── Comments ──────────────────────────────────────────────────────── */
  listComments: async (applicationId: string): Promise<CaseCommentListResponse> => {
    const r = await api.get<CaseCommentListResponse>(`${BASE}/${applicationId}/comments`);
    return r.data;
  },
  createComment: async (
    applicationId: string,
    body: CaseCommentCreate,
  ): Promise<CaseComment> => {
    const r = await api.post<CaseComment>(`${BASE}/${applicationId}/comments`, body);
    return r.data;
  },
  updateComment: async (
    applicationId: string,
    commentId: string,
    body: CaseCommentUpdate,
  ): Promise<CaseComment> => {
    const r = await api.patch<CaseComment>(
      `${BASE}/${applicationId}/comments/${commentId}`,
      body,
    );
    return r.data;
  },
  deleteComment: async (applicationId: string, commentId: string): Promise<void> => {
    await api.delete(`${BASE}/${applicationId}/comments/${commentId}`);
  },
  pinComment: async (applicationId: string, commentId: string): Promise<CaseComment> => {
    const r = await api.patch<CaseComment>(
      `${BASE}/${applicationId}/comments/${commentId}/pin`,
    );
    return r.data;
  },

  /* ── Deadlines ─────────────────────────────────────────────────────── */
  listDeadlines: async (applicationId: string): Promise<CaseDeadlineListResponse> => {
    const r = await api.get<CaseDeadlineListResponse>(`${BASE}/${applicationId}/deadlines`);
    return r.data;
  },
  createDeadline: async (
    applicationId: string,
    body: CaseDeadlineCreate,
  ): Promise<CaseDeadline> => {
    const r = await api.post<CaseDeadline>(`${BASE}/${applicationId}/deadlines`, body);
    return r.data;
  },
  updateDeadline: async (
    applicationId: string,
    deadlineId: string,
    body: CaseDeadlineUpdate,
  ): Promise<CaseDeadline> => {
    const r = await api.patch<CaseDeadline>(
      `${BASE}/${applicationId}/deadlines/${deadlineId}`,
      body,
    );
    return r.data;
  },
  deleteDeadline: async (applicationId: string, deadlineId: string): Promise<void> => {
    await api.delete(`${BASE}/${applicationId}/deadlines/${deadlineId}`);
  },
  completeDeadline: async (
    applicationId: string,
    deadlineId: string,
  ): Promise<CaseDeadline> => {
    const r = await api.patch<CaseDeadline>(
      `${BASE}/${applicationId}/deadlines/${deadlineId}/complete`,
    );
    return r.data;
  },
  dismissDeadline: async (applicationId: string, deadlineId: string): Promise<void> => {
    await api.patch(`${BASE}/${applicationId}/deadlines/${deadlineId}/dismiss`);
  },

  /* ── Status history (audit log for Overview tab) ───────────────────── */
  getStatusHistory: async (applicationId: string): Promise<CaseStatusHistoryResponse> => {
    const r = await api.get<CaseStatusHistoryResponse>(
      `${BASE}/${applicationId}/status-history`,
    );
    return r.data;
  },
};