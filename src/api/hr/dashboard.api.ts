// src/api/hr/dashboard.api.ts
// import axiosInstance from '../axios';
import type { HRDashboardData } from '../../types/hr/dashboard.types';

// export const dashboardApi = {
  /**
   * GET /employer/dashboard
   * Single-payload dashboard for the logged-in HR user's company.
   * Server scopes by employer_id; no query params.
   */
//   get: async (): Promise<HRDashboardData> => {
//     const res = await axiosInstance.get('/employer/dashboard');
//     return res.data;
//   },
// };

// ─────────────────────────────────────────────────────────────────────────────
// MOCK — replace `employeesApi` block with the commented version above when the
// backend is ready. The mock matches the screenshot 1:1 so the screen demos
// fully against fixture data.
// ─────────────────────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: async (): Promise<HRDashboardData> => ({
    stats: {
      total_employees:        1248, total_employees_delta:  4.2,
      active_visas:            983, active_visas_delta:     2.8,
      expiring_soon:            47, expiring_soon_delta:   11.9,
      pending_renewals:         31, pending_renewals_delta: 0.0,
    },

    compliance: {
      score: 87, label: 'Good Standing', period: 'JUN 2025',
      needs_action_count: 47, active_compliant: 983,
      expiring_under_30: 18, expiring_30_90: 29,
    },

    expiring: [
      { id: '1', employee_id: 'EMP0041', employee_name: 'Marcus Rivera',  employee_code: 'EMP-0041', avatar_url: null,
        department: 'Engineering', visa_code: 'H-1B', visa_label: 'Work',
        expiry_date: '2025-07-08', days_left: 12, urgency: 'critical', status: 'renewal_pending', action: 'renew' },
      { id: '2', employee_id: 'EMP0087', employee_name: 'Priya Nair',     employee_code: 'EMP-0087', avatar_url: null,
        department: 'Product', visa_code: 'O-1', visa_label: 'Talent',
        expiry_date: '2025-07-15', days_left: 19, urgency: 'critical', status: 'docs_needed', action: 'renew' },
      { id: '3', employee_id: 'EMP0033', employee_name: 'James Okafor',   employee_code: 'EMP-0033', avatar_url: null,
        department: 'Finance', visa_code: 'L-1', visa_label: 'Transfer',
        expiry_date: '2025-08-02', days_left: 37, urgency: 'warning', status: 'in_progress', action: 'review' },
      { id: '4', employee_id: 'EMP0259', employee_name: 'Aisha Mensah',   employee_code: 'EMP-0259', avatar_url: null,
        department: 'Marketing', visa_code: 'TN', visa_label: 'Status',
        expiry_date: '2025-08-18', days_left: 54, urgency: 'warning', status: 'active', action: 'review' },
      { id: '5', employee_id: 'EMP0012', employee_name: 'Tom Harrington', employee_code: 'EMP-0012', avatar_url: null,
        department: 'Design', visa_code: 'E-3', visa_label: 'Specialty',
        expiry_date: '2025-09-05', days_left: 71, urgency: 'upcoming', status: 'active', action: 'monitor' },
      { id: '6', employee_id: 'EMP0078', employee_name: 'Daniel Kim',     employee_code: 'EMP-0078', avatar_url: null,
        department: 'Operations', visa_code: 'H-1B', visa_label: 'Work',
        expiry_date: '2025-09-22', days_left: 88, urgency: 'upcoming', status: 'active', action: 'monitor' },
    ],

    activity: [
      { id: '1', type: 'visa_approved',     title: 'Visa Approved',
        description: "Emma Clarke's H-1B petition approved by USCIS.",
        created_at: new Date(Date.now() -    2 * 3_600_000).toISOString() },
      { id: '2', type: 'expiry_alert',      title: 'Expiry Alert Sent',
        description: 'Auto-reminder sent to Marcus Rivera (12 days).',
        created_at: new Date(Date.now() -    5 * 3_600_000).toISOString() },
      { id: '3', type: 'documents_uploaded',title: 'Documents Uploaded',
        description: 'Priya Nair uploaded 3 renewal documents.',
        created_at: new Date(Date.now() -   18 * 3_600_000).toISOString() },
      { id: '4', type: 'renewal_initiated', title: 'Renewal Initiated',
        description: 'L-1 Transfer renewal started for James Okafor.',
        created_at: new Date(Date.now() -   24 * 3_600_000).toISOString() },
      { id: '5', type: 'employee_added',    title: 'New Employee Added',
        description: 'Sofia Reyes onboarded — E-3 visa profile created.',
        created_at: new Date(Date.now() -   72 * 3_600_000).toISOString() },
      { id: '6', type: 'interview_scheduled', title: 'Interview Scheduled',
        description: 'H-1B interview booked for Daniel Kim — Jul 2.',
        created_at: new Date(Date.now() -   96 * 3_600_000).toISOString() },
      { id: '7', type: 'application_rejected', title: 'Application Rejected',
        description: "Carlos Vega's O-1 extension denied; appeal filed.",
        created_at: new Date(Date.now() -  120 * 3_600_000).toISOString() },
    ],

    timeline: [
      { month: 'Jul 2025', critical:  8, warning:  5, upcoming:  3 },
      { month: 'Aug 2025', critical:  6, warning: 12, upcoming:  9 },
      { month: 'Sep 2025', critical:  3, warning:  7, upcoming: 11 },
      { month: 'Oct 2025', critical:  4, warning:  9, upcoming: 13 },
      { month: 'Nov 2025', critical:  2, warning:  6, upcoming: 15 },
      { month: 'Dec 2025', critical:  1, warning:  4, upcoming: 17 },
    ],

    visa_distribution: [],
  cases_by_stage: [],
  monthly_trend: [],
  department_compliance: [],
  processing_time: [],
   document_completion: [],
  }),
};

// ── Named export (matches the import the hook already uses) ───────────────────
export const getHRDashboard = (): Promise<HRDashboardData> => dashboardApi.get();