// src/api/hr/createCase.api.ts
//
// Calls the /hr/cases, /hr/attorneys, and /hr/visa-types endpoints.
// NO longer calls /applications (employee endpoint).
// NO longer needs visa_type UUID lookup — backend resolves from code.
// NO draft-save network call — drafts are local-only (see useCreateCase.ts).

import axios from '../axios';
import type {
  EmployeeOption,
  HRCaseCreateRequest,
  HRCaseCreateResponse,
  HRCaseResponse,
  HRCaseListResponse,
  HRCaseUpdateRequest,
  HRCaseStatusUpdateRequest,
  HRApprovalUpdateRequest,
  HRCaseHistoryItem,
  VisaTypeOption,
} from '../../types/hr/createCase.types';
import type { AttorneyAssignOption } from '../../types/hr/attorneyAssign.types';

const HR_BASE = '/hr';

export const createCaseApi = {

  // ── Roster data for Step 1 picker ─────────────────────────────────────────

  /**
   * GET /hr/employees
   */
  getEmployees: async (): Promise<EmployeeOption[]> => {
    const res = await axios.get(`${HR_BASE}/employees`, {
      params: { is_active: true, limit: 100 },
    });
    return (res.data.items ?? []).map((e: {
      id: string;
      employee_id: string;
      full_name: string;
      email: string;
      job_title: string | null;
      department: string | null;
      profile_picture_url: string | null;
      active_applications: number;
    }): EmployeeOption => ({
      id:                  e.id,             // employer_employees.id — what we send in HRCaseCreate
      user_id:             e.employee_id,    // users.id — NOT sent, backend resolves
      full_name:           e.full_name,
      email:               e.email,
      job_title:           e.job_title,
      department:          e.department,
      profile_picture_url: e.profile_picture_url,
      active_cases:        e.active_applications,
    }));
  },

  // ── Attorney data for Step 4 picker ───────────────────────────────────────

  /**
   * GET /hr/attorneys
   * NOT /attorneys — that's the Screen 20 marketplace endpoint, keyed by
   * attorney_profiles.id (wrong ID for Application.assigned_attorney_id,
   * which is a FK to users.id). /hr/attorneys returns AttorneyAssignOption
   * keyed by user_id, matching what the case-assignment FK actually needs.
   */
  getAttorneys: async (): Promise<AttorneyAssignOption[]> => {
    try {
      const res = await axios.get<{ attorneys: AttorneyAssignOption[] }>(`${HR_BASE}/attorneys`);
      return res.data.attorneys ?? [];
    } catch {
      // Attorney list is optional — degrade gracefully
      return [];
    }
  },

  // ── Visa type data for Step 2 picker ──────────────────────────────────────

  /**
   * GET /hr/visa-types
   * Curated work-visa subset (H-1B, L-1A, L-1B, O-1A, TN, E-3) with
   * doc_count/timeline/requirements computed server-side.
   */
  getVisaTypes: async (): Promise<VisaTypeOption[]> => {
    const res = await axios.get<{
      items: VisaTypeOption[];
      total: number;
    }>('/visa-types');

    return res.data.items ?? [];
  },

  // ── HR Case CRUD ──────────────────────────────────────────────────────────

  /**
   * POST /hr/cases
   * Creates an immigration case on behalf of the selected employee.
   * This immediately activates the case (status → in_progress, checklist
   * tasks created, employee notified) — there is currently no draft mode
   * on the backend. Do NOT call this for "Save Draft" — see useCreateCase.ts,
   * which persists drafts to sessionStorage instead.
   */
  createCase: async (data: HRCaseCreateRequest): Promise<HRCaseCreateResponse> => {
    const res = await axios.post(`${HR_BASE}/cases`, data);
    return res.data;
  },

  /**
   * GET /hr/cases
   */
  listCases: async (params?: {
    status?: string;
    visa_type_code?: string;
    limit?: number;
    offset?: number;
  }): Promise<HRCaseListResponse> => {
    const res = await axios.get(`${HR_BASE}/cases`, { params });
    return res.data;
  },

  /**
   * GET /hr/cases/:id
   */
  getCase: async (applicationId: string): Promise<HRCaseResponse> => {
    const res = await axios.get(`${HR_BASE}/cases/${applicationId}`);
    return res.data;
  },

  /**
   * PATCH /hr/cases/:id
   */
  updateCase: async (
    applicationId: string,
    data: HRCaseUpdateRequest,
  ): Promise<HRCaseResponse> => {
    const res = await axios.patch(`${HR_BASE}/cases/${applicationId}`, data);
    return res.data;
  },

  /**
   * PATCH /hr/cases/:id/status
   */
  updateStatus: async (
    applicationId: string,
    data: HRCaseStatusUpdateRequest,
  ): Promise<HRCaseResponse> => {
    const res = await axios.patch(`${HR_BASE}/cases/${applicationId}/status`, data);
    return res.data;
  },

  /**
   * PATCH /hr/cases/:id/hr-approval
   */
  updateApproval: async (
    applicationId: string,
    data: HRApprovalUpdateRequest,
  ): Promise<HRCaseResponse> => {
    const res = await axios.patch(`${HR_BASE}/cases/${applicationId}/hr-approval`, data);
    return res.data;
  },

  /**
   * GET /hr/cases/:id/history
   */
  getCaseHistory: async (applicationId: string): Promise<HRCaseHistoryItem[]> => {
    const res = await axios.get(`${HR_BASE}/cases/${applicationId}/history`);
    return res.data;
  },
};