// src/api/hr/hrDeadlines.api.ts
//
// HR Deadlines & Extensions API calls.
// Backend: app/routes/hr_deadline_routes.py (to be created)

import axios from '../axios';
import type {
  HRDeadlineListResponse,
  HRExtensionRequest,
  HRRequestExtensionBody,
  HRReviewExtensionBody,
} from '../../types/hr/deadlines.types';

export const hrDeadlinesApi = {
  // ─── DEADLINES LIST ────────────────────────────────────────────────────────

  /**
   * GET /api/v1/hr/deadlines
   * Returns all upcoming deadlines for the HR user's organization,
   * plus stats (urgent/warning/on_track counts) and insights.
   */
  list: async (params?: {
    search?:        string;
    urgency?:       string;  // 'urgent' | 'warning' | 'on_track' | 'all'
    deadline_type?: string;
  }): Promise<HRDeadlineListResponse> => {
    const res = await axios.get('/hr/deadlines', { params });
    return res.data;
  },

  // ─── EXTENSION REQUESTS ────────────────────────────────────────────────────

  /**
   * GET /api/v1/hr/deadlines/extensions
   * List all extension requests (pending + recently decided).
   */
  listExtensions: async (): Promise<HRExtensionRequest[]> => {
    const res = await axios.get('/hr/deadlines/extensions');
    return res.data;
  },

  /**
   * POST /api/v1/hr/deadlines/:applicationId/extension
   * Submit an extension request for a specific application deadline.
   * Can be submitted by HR on behalf of the case.
   */
  requestExtension: async (
    applicationId: string,
    payload:       HRRequestExtensionBody,
  ): Promise<HRExtensionRequest> => {
    const res = await axios.post(
      `/hr/deadlines/${applicationId}/extension`,
      payload,
    );
    return res.data;
  },

  /**
   * PATCH /api/v1/hr/deadlines/extensions/:extensionId
   * HR approves or denies an extension request.
   * Sets status → 'approved' | 'denied', reviewed_by = current user.
   */
  reviewExtension: async (
    extensionId: string,
    payload:     HRReviewExtensionBody,
  ): Promise<HRExtensionRequest> => {
    const res = await axios.patch(
      `/hr/deadlines/extensions/${extensionId}`,
      payload,
    );
    return res.data;
  },
};