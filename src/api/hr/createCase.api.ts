// src/api/hr/createCase.api.ts
//
// Calls the new /hr/cases endpoints from hr_case_routes.py.
// NO longer calls /applications (employee endpoint).
// NO longer needs visa_type UUID lookup — backend resolves from code.

import axios from '../axios';
import type {
  EmployeeOption,
  AttorneyOption,
  HRCaseCreateRequest,
  HRCaseCreateResponse,
  HRCaseResponse,
  HRCaseListResponse,
  HRCaseUpdateRequest,
  HRCaseStatusUpdateRequest,
  HRApprovalUpdateRequest,
  HRCaseHistoryItem,
} from '../../types/hr/createCase.types';

const HR_BASE = '/hr';

export const createCaseApi = {

  // ── Roster data for Step 1 picker ─────────────────────────────────────────

  /**
   * GET /hr/employees
   * Reuse existing invitation endpoint — maps EmployeeLink → EmployeeOption.
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
   * GET /attorneys
   */
  // getAttorneys: async (): Promise<AttorneyOption[]> => {
  //   try {
  //     const res = await axios.get('/attorneys', {
  //       params: { is_accepting: true, limit: 50 },
  //     });
  //     return res.data.items ?? [];
  //   } catch {
  //     // Attorney list is optional — degrade gracefully
  //     return [];
  //   }
  // },

  getAttorneys: async (): Promise<AttorneyOption[]> => {
  try {
    const res = await axios.get('/attorneys', {
      params: { is_accepting: true, limit: 50 },
    });

    const items = Array.isArray(res.data)
      ? res.data
      : res.data.items ?? [];

    return items.map((att: {
      user_id: string;
      law_firm_name: string | null;
      profile_photo_url: string | null;
      specialisations: string | string[] | null;
      is_accepting_cases: boolean;
      active_cases?: number;
      user: {
        first_name: string;
        last_name: string;
        email: string;
      };
    }): AttorneyOption => {
      let specialisations: string[] = [];

      if (Array.isArray(att.specialisations)) {
        specialisations = att.specialisations;
      } else if (typeof att.specialisations === 'string') {
        try {
          const parsed = JSON.parse(att.specialisations);
          specialisations = Array.isArray(parsed) ? parsed : [];
        } catch {
          specialisations = [];
        }
      }

      return {
        user_id: att.user_id,
        full_name: `${att.user.first_name} ${att.user.last_name}`.trim(),
        email: att.user.email,
        profile_photo_url: att.profile_photo_url,
        law_firm_name: att.law_firm_name,
        specialisations,
        active_cases: att.active_cases ?? 0,
        is_accepting: att.is_accepting_cases,
      };
    });
  } catch (error) {
    console.error('Failed to load attorneys:', error);
    return [];
  }
},

  // ── HR Case CRUD ──────────────────────────────────────────────────────────

  /**
   * POST /hr/cases
   * Creates an immigration case on behalf of the selected employee.
   *
   * Key: sends employee_link_id (employer_employees.id) + visa_type_code (string).
   * Backend resolves both to UUIDs — frontend never needs visa_type UUID.
   */
  createCase: async (data: HRCaseCreateRequest): Promise<HRCaseCreateResponse> => {
    const res = await axios.post(`${HR_BASE}/cases`, data);
    return res.data;
  },

  /**
   * POST /hr/cases  (draft variant — same endpoint, priority = standard, minimal fields)
   * Used by "Save Draft" button before the form is complete.
   */
  saveDraft: async (data: Partial<HRCaseCreateRequest>): Promise<HRCaseCreateResponse> => {
    // Backend requires these three fields minimum to create a draft
    if (!data.employee_link_id || !data.visa_type_code || !data.case_name) {
      throw new Error('employee_link_id, visa_type_code, and case_name are required to save a draft.');
    }
    const res = await axios.post(`${HR_BASE}/cases`, {
      employee_link_id: data.employee_link_id,
      visa_type_code:   data.visa_type_code,
      case_name:        data.case_name,
      case_description: data.case_description,
      target_date:      data.target_date,
      priority:         data.priority ?? 'standard',
      internal_notes:   data.internal_notes,
      attorney_user_id: data.attorney_user_id,
      sponsor_employer: data.sponsor_employer,
    });
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