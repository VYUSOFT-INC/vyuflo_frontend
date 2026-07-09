// src/api/hr/hrApproval.api.ts
//
// HR Approval Queue API calls.
// Backend: app/routes/hr_approval_routes.py (to be created)
//
// The approval queue is document-based: HR reviews documents that are in
// 'pending_review' or 'uploaded' status, then approves or requests edits.
// Under the hood, PATCH /approve sets document.status = 'verified'
// and PATCH /reject sets document.status = 'rejected' with a note.

import axios from '../axios';
import type {
  HRApprovalListResponse,
  HRApprovalItem,
  HRApproveDocumentRequest,
  HRRequestEditsRequest,
  HRBulkApproveRequest,
} from '../../types/hr/approval.types';

export const hrApprovalApi = {
  // ─── LIST ──────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/hr/approvals
   * Returns all documents pending HR review for the HR user's organization.
   * Backend filters: documents where status IN ('uploaded', 'pending_review')
   * and application.assigned_hr_id = current HR user.
   */
  list: async (params?: {
    status?:    string;   // 'all' | 'pending' | 'edits_requested' | 'approved'
    priority?:  string;   // 'all' | 'critical' | 'high' | 'medium' | 'low'
    doc_type?:  string;   // 'all' | 'letter' | 'form' | 'document'
    date_range?: string;  // '7days' | '30days' | '90days'
  }): Promise<HRApprovalListResponse> => {
    const res = await axios.get('/hr/approvals', { params });
    return res.data;
  },

  // ─── SINGLE APPROVE ────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/hr/approvals/:documentId/approve
   * Approves a document → sets document.status = 'verified'
   * Creates a DocumentActivity record with action='verified'.
   */
  approve: async (
    documentId: string,
    payload:    HRApproveDocumentRequest = {},
  ): Promise<HRApprovalItem> => {
    const res = await axios.patch(
      `/hr/approvals/${documentId}/approve`,
      payload,
    );
    return res.data;
  },

  // ─── REQUEST EDITS ─────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/hr/approvals/:documentId/request-edits
   * Sets document.status = 'rejected' and stores rejection_reason.
   * Sends a notification to the employee/attorney with the edit note.
   */
  requestEdits: async (
    documentId: string,
    payload:    HRRequestEditsRequest,
  ): Promise<HRApprovalItem> => {
    const res = await axios.patch(
      `/hr/approvals/${documentId}/request-edits`,
      payload,
    );
    return res.data;
  },

  // ─── BULK APPROVE ──────────────────────────────────────────────────────────

  /**
   * POST /api/v1/hr/approvals/bulk-approve
   * Approves multiple documents in one request.
   * Backend loops through document_ids and sets each to 'verified'.
   */
  bulkApprove: async (
    payload: HRBulkApproveRequest,
  ): Promise<{ approved: number; failed: number }> => {
    const res = await axios.post('/hr/approvals/bulk-approve', payload);
    return res.data;
  },
};